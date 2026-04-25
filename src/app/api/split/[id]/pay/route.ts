import { NextResponse } from 'next/server';
import { getUser } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/supabase';
import * as StellarSdk from '@stellar/stellar-sdk';

const { Server } = StellarSdk.rpc;
const SOROBAN_RPC_URL = process.env.SOROBAN_RPC_URL || 'https://soroban-testnet.stellar.org';
const NETWORK_PASSPHRASE = process.env.STELLAR_NETWORK_PASSPHRASE || StellarSdk.Networks.TESTNET;
const server = new Server(SOROBAN_RPC_URL);

// POST /api/split/[id]/pay — participant pays their share
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Get the split
  const { data: split } = await supabaseAdmin
    .from('split_bills')
    .select('*, split_participants(*)')
    .eq('id', params.id)
    .single();

  if (!split) return NextResponse.json({ error: 'Split not found' }, { status: 404 });
  if (split.status !== 'active') return NextResponse.json({ error: 'Split is no longer active' }, { status: 400 });

  // Find this user's participant entry
  const myEntry = split.split_participants.find((p: any) => p.user_id === user.id);
  if (!myEntry) return NextResponse.json({ error: 'You are not a participant in this split' }, { status: 403 });
  if (myEntry.status === 'paid') return NextResponse.json({ error: 'You have already paid' }, { status: 400 });

  // Get payer's Stellar secret
  const { data: payerProfile } = await supabaseAdmin
    .from('profiles')
    .select('stellar_secret, stellar_address')
    .eq('id', user.id)
    .single();

  if (!payerProfile?.stellar_secret || !payerProfile?.stellar_address) {
    return NextResponse.json({ error: 'Wallet not found' }, { status: 404 });
  }

  // Get creator's Stellar address (recipient)
  const { data: creatorProfile } = await supabaseAdmin
    .from('profiles')
    .select('stellar_address')
    .eq('id', split.creator_id)
    .single();

  if (!creatorProfile?.stellar_address) {
    return NextResponse.json({ error: 'Creator wallet not found' }, { status: 404 });
  }

  try {
    const keypair = StellarSdk.Keypair.fromSecret(payerProfile.stellar_secret);
    const amount = myEntry.amount_owed.toString();

    const account = await server.getAccount(payerProfile.stellar_address);
    const tx = new StellarSdk.TransactionBuilder(account, {
      fee: '100000',
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(
        StellarSdk.Operation.payment({
          destination: creatorProfile.stellar_address,
          asset: StellarSdk.Asset.native(),
          amount,
        })
      )
      .addMemo(StellarSdk.Memo.text(`Split: ${split.title}`.slice(0, 28)))
      .setTimeout(60)
      .build();

    tx.sign(keypair);
    const sendRes = await server.sendTransaction(tx);

    if (sendRes.status === 'ERROR') {
      throw new Error(`Transaction failed: ${sendRes.errorResult?.toXDR('base64') || 'Unknown'}`);
    }

    // Poll for confirmation
    let getRes = await server.getTransaction(sendRes.hash);
    let attempts = 0;
    while (getRes.status === 'NOT_FOUND' && attempts < 20) {
      await new Promise(r => setTimeout(r, 1000));
      getRes = await server.getTransaction(sendRes.hash);
      attempts++;
    }

    if (getRes.status !== 'SUCCESS') {
      throw new Error(`Transaction not confirmed: ${getRes.status}`);
    }

    // Mark participant as paid
    await supabaseAdmin
      .from('split_participants')
      .update({ status: 'paid', tx_hash: sendRes.hash, paid_at: new Date().toISOString() })
      .eq('id', myEntry.id);

    // Check if all participants paid → auto-complete the split
    const updatedParticipants = split.split_participants.map((p: any) =>
      p.id === myEntry.id ? { ...p, status: 'paid' } : p
    );
    const allPaid = updatedParticipants.every((p: any) => p.status === 'paid');
    if (allPaid) {
      await supabaseAdmin
        .from('split_bills')
        .update({ status: 'completed' })
        .eq('id', split.id);
    }

    // Record in transactions table for history
    await supabaseAdmin.from('transactions').insert({
      sender_id: user.id,
      recipient_id: split.creator_id,
      sender_universal_id: myEntry.universal_id,
      recipient_universal_id: split.creator_universal_id,
      amount: myEntry.amount_owed,
      currency: split.currency,
      tx_hash: sendRes.hash,
      status: 'completed',
      note: `Split: ${split.title}`,
      purpose: 'Split Payment',
    });

    return NextResponse.json({
      success: true,
      tx_hash: sendRes.hash,
      message: `Paid ${myEntry.amount_owed} ${split.currency} for "${split.title}"`,
      split_complete: allPaid,
    });

  } catch (error: any) {
    console.error('Split pay error:', error);
    return NextResponse.json({ error: error.message || 'Payment failed' }, { status: 500 });
  }
}
