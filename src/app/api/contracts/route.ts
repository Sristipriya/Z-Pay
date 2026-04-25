import { NextResponse } from 'next/server';
import { getUser } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/supabase';
import { createEscrow, calculateDeadlineLedger, getCurrentLedger } from '@/lib/escrow';
import { notifyEscrow } from '@/lib/notify';

export async function POST(request: Request) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { 
    freelancer_username,
    amount,
    title,
    description,
    expiry_days
  } = await request.json();

  if (!freelancer_username || !amount || !title) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const { data: payerProfile } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (!payerProfile?.stellar_address || !payerProfile?.stellar_secret) {
    return NextResponse.json({ error: 'Payer wallet not found' }, { status: 404 });
  }

  const cleanUsername = freelancer_username.replace('@expo', '').trim();
  const { data: freelancerProfile } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('universal_id', cleanUsername)
    .single();

  if (!freelancerProfile?.stellar_address) {
    return NextResponse.json({ error: 'Freelancer not found or has no wallet' }, { status: 404 });
  }

  if (freelancerProfile.id === payerProfile.id) {
    return NextResponse.json({ error: 'Cannot create contract with yourself' }, { status: 400 });
  }

  try {
    const expiryDays = expiry_days || 30;
    const amountInStroops = BigInt(Math.floor(parseFloat(amount) * 10000000));
    
    // Generate a unique string ID for the escrow contract
    const escrowId = Date.now().toString();

    // Fetch default arbiter (admin)
    const { data: adminProfile } = await supabaseAdmin
      .from('profiles')
      .select('stellar_address')
      .eq('email', 'bkbhaia@gmail.com')
      .single();

    const arbiterAddress = adminProfile?.stellar_address || payerProfile.stellar_address; // Fallback to payer if no admin

    const { txHash } = await createEscrow(
      payerProfile.stellar_secret,
      payerProfile.stellar_address,
      freelancerProfile.stellar_address,
      amountInStroops,
      'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC', // EXPO Token
      arbiterAddress,
      escrowId
    );

    const { data: contract, error } = await supabaseAdmin
      .from('contracts')
      .insert({
        escrow_id: escrowId,
        payer_id: payerProfile.id,
        freelancer_id: freelancerProfile.id,
        payer_universal_id: payerProfile.universal_id,
        freelancer_universal_id: freelancerProfile.universal_id,
        payer_stellar_address: payerProfile.stellar_address,
        freelancer_stellar_address: freelancerProfile.stellar_address,
        amount: parseFloat(amount),
        currency: 'XLM',
        title,
        description: description || null,
        expiry_timestamp: Math.floor(Date.now() / 1000) + (expiryDays * 24 * 60 * 60),
        status: 'funded',
        tx_hash_create: txHash,
      })
      .select()
      .single();

    if (error) {
      console.error('Contract creation error:', error);
      return NextResponse.json({ error: 'Failed to save contract' }, { status: 500 });
    }

    notifyEscrow({
      event: 'funded',
      contractTitle: title,
      amount: parseFloat(amount),
      currency: 'XLM',
      payerId: payerProfile.id,
      freelancerId: freelancerProfile.id,
      payerUniversalId: payerProfile.universal_id,
      freelancerUniversalId: freelancerProfile.universal_id,
      txHash,
      notifyParties: 'freelancer',
    }).catch(console.error);

    return NextResponse.json({ 
      success: true, 
      contract,
      tx_hash: txHash,
      escrow_id: escrowId,
      message: `Contract created and funded on-chain. Escrow ID: ${escrowId}`
    });
  } catch (error: any) {
    console.error('Contract creation error:', error);
    return NextResponse.json({ error: error.message || 'Failed to create contract' }, { status: 500 });
  }
}

export async function GET() {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: contracts, error } = await supabaseAdmin
    .from('contracts')
    .select('*')
    .or(`payer_id.eq.${user.id},freelancer_id.eq.${user.id}`)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Fetch contracts error:', error);
    return NextResponse.json([]);
  }

  return NextResponse.json(contracts || []);
}
