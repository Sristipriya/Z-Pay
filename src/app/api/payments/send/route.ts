import { NextResponse } from 'next/server';
import { getUser } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/supabase';
import { sendPayment } from '@/lib/stellar';
import { getExchangeRate } from '@/lib/fx-service';
import { notifyPayment } from '@/lib/notify';

export async function POST(request: Request) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { recipient, amount, note, pin, purpose, currency } = await request.json();
  if (!recipient || !amount) {
    return NextResponse.json({ error: 'Recipient and amount are required' }, { status: 400 });
  }

  const { data: senderProfile } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (!senderProfile?.stellar_secret) {
    return NextResponse.json({ error: 'Sender Stellar account not found' }, { status: 404 });
  }

  if (senderProfile.app_pin) {
    if (!pin) {
      return NextResponse.json({ error: 'PIN is required to authorize payment' }, { status: 400 });
    }
    if (senderProfile.app_pin !== pin) {
      return NextResponse.json({ error: 'Invalid PIN. Please try again.' }, { status: 401 });
    }
  }

  try {
    let recipientAddress = recipient;
    let recipientProfile = null;

    if (recipient.includes('@expo') || !recipient.startsWith('G')) {
      const username = recipient.replace('@expo', '');
      const { data: recProfile } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('universal_id', username)
        .single();

      if (!recProfile) {
        return NextResponse.json({ error: 'Recipient Universal ID not found' }, { status: 404 });
      }
      recipientAddress = recProfile.stellar_address;
      recipientProfile = recProfile;
    }

    if (recipientProfile?.id === senderProfile.id || recipientAddress === senderProfile.stellar_address) {
      return NextResponse.json({ error: 'You cannot send money to yourself' }, { status: 400 });
    }

    const { data: recentTx } = await supabaseAdmin
      .from('transactions')
      .select('id')
      .eq('sender_id', senderProfile.id)
      .eq('recipient_id', recipientProfile?.id || null)
      .eq('amount', parseFloat(amount))
      .gt('created_at', new Date(Date.now() - 10000).toISOString())
      .limit(1);

    if (recentTx && recentTx.length > 0) {
      return NextResponse.json({ error: 'Possible duplicate transaction detected. Please wait 10 seconds.' }, { status: 400 });
    }

    const sourceCurrency = currency || senderProfile.preferred_currency || 'XLM';
    const xlmRate = await getExchangeRate(sourceCurrency, 'XLM');
    const xlmAmount = (parseFloat(amount) * xlmRate).toFixed(7);

    const senderName = senderProfile.universal_id || 'unknown';
    const recipientName = recipientProfile?.universal_id || recipient.replace('@expo', '');
    let memo = '';
    if (purpose) {
      memo = `${purpose}|${senderName}>${recipientName}`;
    } else if (note) {
      memo = `${note}|${senderName}>${recipientName}`;
    } else {
      memo = `${senderName}>${recipientName}`;
    }
    memo = memo.substring(0, 28);

    const txHash = await sendPayment(
      senderProfile.stellar_secret, 
      recipientAddress, 
      xlmAmount,
      { memo }
    );

    const { error: txError } = await supabaseAdmin
      .from('transactions')
      .insert({
        sender_id: senderProfile.id,
        recipient_id: recipientProfile?.id || null,
        sender_universal_id: senderProfile.universal_id,
        recipient_universal_id: recipientProfile?.universal_id || recipient,
        amount: parseFloat(amount),
        currency: sourceCurrency,
        tx_hash: txHash,
        status: 'completed',
        note: `XLM:${xlmAmount}`,
        purpose: purpose || null,
      });

    if (txError) console.error('History recording error:', txError);

    // Fire-and-forget email notifications to both parties
    if (recipientProfile?.id) {
      notifyPayment({
        senderId: senderProfile.id,
        recipientId: recipientProfile.id,
        senderUniversalId: senderProfile.universal_id || '',
        recipientUniversalId: recipientProfile.universal_id || '',
        amount: parseFloat(amount),
        currency: sourceCurrency,
        txHash,
        note: note || purpose || undefined,
      }).catch(console.error);
    }

    return NextResponse.json({ 
      success: true, 
      tx_hash: txHash,
      amount_sent: parseFloat(amount),
      currency: sourceCurrency,
      xlm_amount: parseFloat(xlmAmount)
    });
  } catch (error: any) {
    console.error('Payment error:', error);
    return NextResponse.json({ error: error.message || 'Payment failed' }, { status: 500 });
  }
}
