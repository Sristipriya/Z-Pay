import { NextResponse } from 'next/server';
import { getUser } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/supabase';
import { disputeEscrow } from '@/lib/escrow';
import { notifyEscrow } from '@/lib/notify';

export async function POST(request: Request) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { contract_id, reason } = await request.json();

  if (!contract_id) {
    return NextResponse.json({ error: 'Contract ID required' }, { status: 400 });
  }

  if (!reason || reason.trim().length < 10) {
    return NextResponse.json({ error: 'Please provide a detailed reason (min 10 characters)' }, { status: 400 });
  }

  const { data: contract } = await supabaseAdmin
    .from('contracts')
    .select('*')
    .eq('id', contract_id)
    .single();

  if (!contract) {
    return NextResponse.json({ error: 'Contract not found' }, { status: 404 });
  }

  const isPayer      = contract.payer_id      === user.id;
  const isFreelancer = contract.freelancer_id === user.id;

  if (!isPayer && !isFreelancer) {
    return NextResponse.json({ error: 'You are not a party to this contract' }, { status: 403 });
  }

  if (['released', 'refunded', 'disputed'].includes(contract.status)) {
    return NextResponse.json({ error: `Cannot dispute. Contract is already ${contract.status}` }, { status: 400 });
  }

  // ── Freelancer: can only dispute after delivering (client ghosted) ─────────
  if (isFreelancer && contract.status !== 'delivered') {
    return NextResponse.json({
      error: 'Freelancer can only dispute after marking work as delivered and the client has not responded'
    }, { status: 400 });
  }

  // ── Payer: can dispute at funded OR delivered stage ───────────────────────
  if (isPayer && !['funded', 'delivered'].includes(contract.status)) {
    return NextResponse.json({ error: `Cannot dispute. Contract is ${contract.status}` }, { status: 400 });
  }

  // ── CRITICAL: Track whether work was already delivered when payer disputes ─
  // This prevents the "get work for free" attack:
  //   client receives delivered work → disputes it → tries to self-refund
  // If dispute_after_delivery = true → payer CANNOT self-refund. Arbiter decides.
  const disputeAfterDelivery = isPayer && contract.status === 'delivered';

  // CRITICAL FIX: The deployed smart contract strictly requires the Payer to authorize disputes.
  // When a freelancer disputes, we must sign on behalf of the payer on-chain.
  const targetId = isFreelancer ? contract.payer_id : user.id;
  const { data: signerProfile } = await supabaseAdmin
    .from('profiles')
    .select('stellar_secret')
    .eq('id', targetId)
    .single();

  if (!signerProfile?.stellar_secret) {
    return NextResponse.json({ error: 'Wallet not found for on-chain signature' }, { status: 500 });
  }

  try {
    const txHash = await disputeEscrow(contract.escrow_id.toString(), signerProfile.stellar_secret);

    const { error: updateError } = await supabaseAdmin
      .from('contracts')
      .update({
        status:                 'disputed',
        disputed_at:            new Date().toISOString(),
        tx_hash_dispute:        txHash,
        dispute_reason:         reason,
        disputed_by:            isPayer ? 'payer' : 'freelancer',
        dispute_after_delivery: disputeAfterDelivery, // ← the bad-faith guard
      })
      .eq('id', contract_id);

    if (updateError) {
      console.error('Supabase update error:', updateError);
      throw new Error(`Database error: ${updateError.message}. Did you run the SQL migration?`);
    }

    const msg = isPayer
      ? disputeAfterDelivery
        ? 'Dispute raised. Funds are frozen. Since work was delivered, an arbiter will review your case — you cannot self-refund.'
        : 'Dispute raised. Funds are frozen. You may request a refund.'
      : 'Dispute raised. Funds are frozen. You can now claim your payment.';

    notifyEscrow({
      event: 'disputed',
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

    return NextResponse.json({ success: true, tx_hash: txHash, message: msg });
  } catch (error: any) {
    console.error('Dispute contract error:', error);
    return NextResponse.json({ error: error.message || 'Failed to raise dispute' }, { status: 500 });
  }
}
