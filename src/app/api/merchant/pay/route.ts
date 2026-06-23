import { NextResponse } from 'next/server';
import { getUser } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/supabase';
import { sendMerchantPayment, getExplorerUrl, IS_MAINNET } from '@/lib/stellar';
import { notifyMerchantPayment } from '@/lib/notify';

export async function POST(request: Request) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // UPI merchant settlement is coming in Phase 2.
  // On mainnet, we block this endpoint to prevent XLM being debited
  // without a real INR payout reaching the merchant.
  if (IS_MAINNET) {
    return NextResponse.json(
      {
        error:
          'Merchant UPI payments are coming soon. ' +
          'This feature will be available once we integrate a licensed Payment Aggregator (Phase 2).',
        coming_soon: true,
      },
      { status: 503 }
    );
  }

  const { quote_id, merchant_name, merchant_upi_id, pin } = await request.json();

  if (!quote_id || !merchant_name || !merchant_upi_id) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (!profile?.stellar_secret) {
    return NextResponse.json({ error: 'Stellar wallet not found' }, { status: 404 });
  }

  if (!profile.app_pin) {
    return NextResponse.json({ error: 'Please set a PIN in Settings before making payments' }, { status: 400 });
  }

  if (profile.app_pin !== pin) {
    return NextResponse.json({ error: 'Invalid PIN. Please try again.' }, { status: 401 });
  }

  const { data: quote, error: quoteError } = await supabaseAdmin
    .from('quote_locks')
    .select('*')
    .eq('id', quote_id)
    .eq('user_id', user.id)
    .single();

  if (quoteError || !quote) {
    return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
  }

  if (quote.used) {
    return NextResponse.json({ error: 'Quote already used' }, { status: 400 });
  }

  const now = new Date();
  const expiresAt = new Date(quote.expires_at);
  if (now > expiresAt) {
    return NextResponse.json({ error: 'Quote expired. Please generate a new quote.' }, { status: 400 });
  }

  try {
    const xlmAmount = parseFloat(quote.xlm_amount).toFixed(7);

    // Execute REAL Stellar transaction — XLM is debited from user wallet
    const txHash = await sendMerchantPayment(
      profile.stellar_secret,
      xlmAmount,
      merchant_name
    );

    await supabaseAdmin
      .from('quote_locks')
      .update({ used: true })
      .eq('id', quote_id);

    const explorerUrl = getExplorerUrl(txHash);

    const { data: payment, error: paymentError } = await supabaseAdmin
      .from('merchant_payments')
      .insert({
        user_id: user.id,
        merchant_name,
        merchant_upi_id,
        inr_amount: quote.inr_amount,
        xlm_amount: quote.xlm_amount,
        exchange_rate: quote.rate,
        tx_hash: txHash,
        stellar_explorer_url: explorerUrl,
        status: 'completed',
        // Testnet only: settlement is simulated. On mainnet this will be handled by Phase 2 aggregator.
        settlement_status: 'pending',
      })
      .select()
      .single();

    if (paymentError) {
      console.error('Payment record error:', paymentError);
    }

    // Fire-and-forget email receipt
    notifyMerchantPayment({
      userId: user.id,
      merchantName: merchant_name,
      merchantUpiId: merchant_upi_id,
      inrAmount: parseFloat(quote.inr_amount),
      xlmAmount: parseFloat(quote.xlm_amount),
      exchangeRate: parseFloat(quote.rate),
      txHash,
      paymentId: payment?.id || quote_id,
    }).catch(console.error);

    return NextResponse.json({
      success: true,
      payment_id: payment?.id,
      tx_hash: txHash,
      stellar_explorer_url: explorerUrl,
      inr_amount: quote.inr_amount,
      xlm_amount: parseFloat(quote.xlm_amount).toFixed(4),
      merchant_name,
      merchant_upi_id,
      settlement: {
        // Testnet mode: simulated settlement for testing
        status: 'simulated',
        utr_number: `UTR${Date.now()}`,
        message: `[TESTNET] ₹${quote.inr_amount} simulated settlement for ${merchant_name}`,
      },
    });
  } catch (error: any) {
    console.error('Merchant payment error:', error);
    return NextResponse.json({
      error: error.message || 'Payment failed. Please try again.',
    }, { status: 500 });
  }
}
