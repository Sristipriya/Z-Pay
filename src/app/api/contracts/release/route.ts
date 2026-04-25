import { NextResponse } from 'next/server';
import { getUser } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/supabase';
import { releaseEscrow } from '@/lib/escrow';
import { notifyEscrow } from '@/lib/notify';

export async function POST(request: Request) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { contract_id, pin } = await request.json();

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

  if (contract.payer_id !== user.id) {
    return NextResponse.json({ error: 'Only payer can release funds' }, { status: 403 });
  }

  if (contract.status !== 'delivered' && contract.status !== 'funded') {
    return NextResponse.json({ error: `Cannot release. Contract status: ${contract.status}` }, { status: 400 });
  }

  const { data: payerProfile } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (!payerProfile?.stellar_secret) {
    return NextResponse.json({ error: 'Payer wallet not found' }, { status: 404 });
  }

  if (payerProfile.app_pin) {
    if (!pin) {
      return NextResponse.json({ error: 'PIN required' }, { status: 400 });
    }
    if (payerProfile.app_pin !== pin) {
      return NextResponse.json({ error: 'Invalid PIN' }, { status: 401 });
    }
  }

  try {
    const releaseTxHash = await releaseEscrow(contract.escrow_id.toString(), payerProfile.stellar_secret);

    await supabaseAdmin
      .from('contracts')
      .update({
        status: 'released',
        released_at: new Date().toISOString(),
        tx_hash_release: releaseTxHash,
      })
      .eq('id', contract_id);

    await supabaseAdmin
      .from('transactions')
      .insert({
        sender_id: contract.payer_id,
        recipient_id: contract.freelancer_id,
        sender_universal_id: contract.payer_universal_id,
        recipient_universal_id: contract.freelancer_universal_id,
        amount: contract.amount,
        currency: contract.currency,
        tx_hash: releaseTxHash,
        status: 'completed',
        note: `Contract Payment: ${contract.title}`,
        purpose: 'Contract Release',
      });

    notifyEscrow({
      event: 'released',
      contractTitle: contract.title,
      amount: contract.amount,
      currency: contract.currency,
      payerId: contract.payer_id,
      freelancerId: contract.freelancer_id,
      payerUniversalId: contract.payer_universal_id,
      freelancerUniversalId: contract.freelancer_universal_id,
      txHash: releaseTxHash,
      notifyParties: 'both',
    }).catch(console.error);

    return NextResponse.json({
      success: true,
      tx_hash: releaseTxHash,
      message: 'Funds released to freelancer successfully!'
    });
  } catch (error: any) {
    console.error('Release contract error:', error);
    return NextResponse.json({ error: error.message || 'Failed to release funds' }, { status: 500 });
  }
}
