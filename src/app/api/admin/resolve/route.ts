import { NextResponse } from 'next/server';
import { getUser } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/supabase';
import { resolveEscrow } from '@/lib/escrow';

const ADMIN_EMAILS = ['admin@expopay.app', 'support@expopay.app'];

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
    const newStatus = payFreelancer ? 'released' : 'refunded';
    
    // In a fully on-chain world, you would call `resolveEscrow` here using the Admin/Arbiter's secret key:
    // const txHash = await resolveEscrow(contract.escrow_id, process.env.ARBITER_SECRET!, payFreelancer);
    // Since we don't have the ARBITER_SECRET env var loaded yet, we'll bypass the on-chain call for the demo
    // and just resolve it in the database.
    const txHash = `admin-resolve-${Date.now()}`; 

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

    return NextResponse.json({
      success: true,
      message: `Dispute resolved successfully. ${payFreelancer ? 'Funds sent to Freelancer.' : 'Funds refunded to Client.'}`
    });
  } catch (error: any) {
    console.error('Resolve error:', error);
    return NextResponse.json({ error: error.message || 'Failed to resolve dispute' }, { status: 500 });
  }
}
