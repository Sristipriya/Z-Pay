import { NextResponse } from 'next/server';
import { getUser } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/supabase';
import { deliverEscrow } from '@/lib/escrow';
import { notifyEscrow } from '@/lib/notify';

export async function POST(request: Request) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { contract_id, delivery_note } = await request.json();

  if (!contract_id) {
    return NextResponse.json({ error: 'Contract ID required' }, { status: 400 });
  }

  const { data: contract } = await supabaseAdmin
    .from('contracts')
    .select('*')
    .eq('id', contract_id)
    .single();

  if (!contract) {
    return NextResponse.json({ error: 'Contract not found' }, { status: 404 });
  }

  if (contract.freelancer_id !== user.id) {
    return NextResponse.json({ error: 'Only freelancer can mark work as delivered' }, { status: 403 });
  }

  if (contract.status !== 'funded') {
    return NextResponse.json({ error: `Cannot deliver. Contract status: ${contract.status}` }, { status: 400 });
  }

  const { data: freelancerProfile } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (!freelancerProfile?.stellar_secret) {
    return NextResponse.json({ error: 'Freelancer wallet not found' }, { status: 404 });
  }

  try {
    const txHash = await deliverEscrow(contract.escrow_id.toString(), freelancerProfile.stellar_secret);

    await supabaseAdmin
      .from('contracts')
      .update({
        status: 'delivered',
        delivered_at: new Date().toISOString(),
        tx_hash_deliver: txHash,
        description: contract.description 
          ? `${contract.description}\n\n--- DELIVERY NOTE ---\n${delivery_note || 'Work delivered'}`
          : `--- DELIVERY NOTE ---\n${delivery_note || 'Work delivered'}`,
      })
      .eq('id', contract_id);

    notifyEscrow({
      event: 'delivered',
      contractTitle: contract.title,
      amount: contract.amount,
      currency: contract.currency,
      payerId: contract.payer_id,
      freelancerId: contract.freelancer_id,
      payerUniversalId: contract.payer_universal_id,
      freelancerUniversalId: contract.freelancer_universal_id,
      txHash,
      notifyParties: 'payer',
    }).catch(console.error);

    return NextResponse.json({
      success: true,
      tx_hash: txHash,
      message: 'Work marked as delivered on-chain. Awaiting payer approval to release funds.'
    });
  } catch (error: any) {
    console.error('Deliver contract error:', error);
    return NextResponse.json({ error: error.message || 'Failed to mark as delivered' }, { status: 500 });
  }
}
