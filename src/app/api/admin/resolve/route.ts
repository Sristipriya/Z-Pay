import { NextResponse } from 'next/server';
import { getUser } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/supabase';
import { notifyEscrow } from '@/lib/notify';

const ADMIN_EMAILS = ['admin@expopay.app', 'support@expopay.app', 'bkbhaia@gmail.com'];

export async function POST(request: Request) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Admin check
  if (!user.email || !ADMIN_EMAILS.includes(user.email)) {
    return NextResponse.json({ error: 'Forbidden: Admins Only' }, { status: 403 });
  }

  const { contract_id, resolution } = await request.json();
  // resolution: 'pay_freelancer' | 'refund_client'

  if (!contract_id || !resolution) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const { data: contract } = await supabaseAdmin
    .from('contracts')
    .select('*')
    .eq('id', contract_id)
    .single();

  if (!contract) {
    return NextResponse.json({ error: 'Contract not found' }, { status: 404 });
  }

  if (contract.status !== 'disputed') {
    return NextResponse.json({ error: 'Contract is not in dispute' }, { status: 400 });
  }

  try {
    const payFreelancer = resolution === 'pay_freelancer';
    const newStatus     = payFreelancer ? 'released' : 'refunded';

    // The deployed escrow contract (CAGMD6PB...) does NOT export a `resolve`
    // function. It only exposes `release` (payer -> freelancer) and
    // `refund` (payer -> payer), both of which require the payer's signature.
    // Since ExpoPay is custodial, the backend signs on behalf of the payer
    // when the arbiter forces an outcome.
    const { data: payerProfile } = await supabaseAdmin
      .from('profiles')
      .select('stellar_secret')
      .eq('id', contract.payer_id)
      .single();

    if (!payerProfile?.stellar_secret) {
      return NextResponse.json(
        { error: "Payer's wallet not found. Cannot resolve on-chain." },
        { status: 500 }
      );
    }

    const { releaseEscrow, refundEscrow } = await import('@/lib/escrow');
    const txHash = payFreelancer
      ? await releaseEscrow(Number(contract.escrow_id), payerProfile.stellar_secret)
      : await refundEscrow(Number(contract.escrow_id), payerProfile.stellar_secret);

    await supabaseAdmin
      .from('contracts')
      .update({
        status: newStatus,
        [payFreelancer ? 'released_at' : 'refunded_at']: new Date().toISOString(),
        [payFreelancer ? 'tx_hash_release' : 'tx_hash_refund']: txHash,
      })
      .eq('id', contract_id);

    if (payFreelancer) {
      // Record the transaction for the freelancer
      await supabaseAdmin
        .from('transactions')
        .insert({
          sender_id:              contract.payer_id,
          recipient_id:           contract.freelancer_id,
          sender_universal_id:    contract.payer_universal_id,
          recipient_universal_id: contract.freelancer_universal_id,
          amount:                 contract.amount,
          currency:               contract.currency,
          tx_hash:                txHash,
          status:                 'completed',
          note:                   `Arbiter Resolved (Paid Freelancer): ${contract.title}`,
          purpose:                'Dispute Resolution',
        });
    } else {
      // Record refund for the client
      await supabaseAdmin
        .from('transactions')
        .insert({
          sender_id:              contract.freelancer_id, // technically from escrow, but returning to payer
          recipient_id:           contract.payer_id,
          sender_universal_id:    contract.freelancer_universal_id,
          recipient_universal_id: contract.payer_universal_id,
          amount:                 contract.amount,
          currency:               contract.currency,
          tx_hash:                txHash,
          status:                 'completed',
          note:                   `Arbiter Resolved (Refunded Client): ${contract.title}`,
          purpose:                'Dispute Refund',
        });
    }

    notifyEscrow({
      event: payFreelancer ? 'resolved_freelancer' : 'resolved_client',
      contractTitle: contract.title,
      amount: contract.amount,
      currency: contract.currency,
      payerId: contract.payer_id,
      freelancerId: contract.freelancer_id,
      payerUniversalId: contract.payer_universal_id,
      freelancerUniversalId: contract.freelancer_universal_id,
      txHash,
      notifyParties: 'both',
    }).catch(console.error);

    return NextResponse.json({
      success: true,
      message: `Dispute resolved successfully. ${payFreelancer ? 'Funds sent to Freelancer.' : 'Funds refunded to Client.'}`
    });
  } catch (error: any) {
    console.error('Resolve error:', error);
    return NextResponse.json({ error: error.message || 'Failed to resolve dispute' }, { status: 500 });
  }
}
