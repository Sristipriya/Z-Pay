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

    // Deployed contract notes:
    //   • `release` panics in Disputed state (only accepts Delivered)
    //   • `refund`  works fine in Disputed and returns funds to the payer
    // So when arbiter sides with the freelancer, we do it in two on-chain steps:
    //   1) refund escrow back to payer
    //   2) transfer that amount from payer's wallet to freelancer (SEP-41)
    // ExpoPay is custodial so the backend signs both with the payer's secret.

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

    const { refundEscrow, transferExpoToken } = await import('@/lib/escrow');

    // Step 1: always refund the escrow back to the payer's wallet
    const refundTx = await refundEscrow(
      Number(contract.escrow_id),
      payerProfile.stellar_secret
    );

    let payoutTx: string | undefined;

    if (payFreelancer) {
      // Step 2: forward the funds from payer -> freelancer
      if (!contract.freelancer_stellar_address) {
        return NextResponse.json(
          { error: "Freelancer's wallet address missing on contract." },
          { status: 500 }
        );
      }

      // contract.amount is stored as display units (e.g. 100), on-chain is stroops
      const amountStroops = BigInt(Math.floor(parseFloat(contract.amount) * 10_000_000));

      payoutTx = await transferExpoToken(
        payerProfile.stellar_secret,
        contract.freelancer_stellar_address,
        amountStroops
      );
    }

    // Final tx hash users see = the one that landed funds in the right place
    const txHash = payFreelancer ? (payoutTx as string) : refundTx;

    await supabaseAdmin
      .from('contracts')
      .update({
        status: newStatus,
        [payFreelancer ? 'released_at' : 'refunded_at']: new Date().toISOString(),
        [payFreelancer ? 'tx_hash_release' : 'tx_hash_refund']: txHash,
        // Optional: keep an audit trail of the intermediate refund step
        ...(payFreelancer ? { tx_hash_refund: refundTx } : {}),
      })
      .eq('id', contract_id);

    if (payFreelancer) {
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
      message: `Dispute resolved successfully. ${
        payFreelancer ? 'Funds sent to Freelancer.' : 'Funds refunded to Client.'
      }`,
    });
  } catch (error: any) {
    console.error('Resolve error:', error);
    return NextResponse.json({ error: error.message || 'Failed to resolve dispute' }, { status: 500 });
  }
}
