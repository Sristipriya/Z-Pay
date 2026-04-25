import { NextResponse } from 'next/server';
import { getUser } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/supabase';
import { createStellarAccount, registerUniversalId } from '@/lib/stellar';
import { notifyWelcome } from '@/lib/notify';

export async function POST(request: Request) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { username, full_name, phone_number, app_pin, preferred_currency } = await request.json();
  if (!username || !full_name || !phone_number || !app_pin) {
    return NextResponse.json({ error: 'All fields are mandatory' }, { status: 400 });
  }

  // Check username availability
  const { data: existing } = await supabaseAdmin
    .from('profiles')
    .select('universal_id')
    .eq('universal_id', username)
    .single();

  if (existing) {
    return NextResponse.json({ error: 'Username already taken' }, { status: 400 });
  }

  // Check phone number uniqueness
  const { data: phoneExists } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('phone_number', phone_number)
    .maybeSingle();

  if (phoneExists) {
    return NextResponse.json({ error: 'An account with this phone number already exists' }, { status: 400 });
  }

  try {
    // 1. Create Stellar account
    const { publicKey, secretKey } = await createStellarAccount();

    // 2. Register on Soroban
    const txHash = await registerUniversalId(username, publicKey);

    // 3. Update Supabase profile
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({
        universal_id: username,
        stellar_address: publicKey,
        stellar_secret: secretKey,
        full_name,
        phone_number,
        app_pin,
        preferred_currency: preferred_currency || 'USDC'
      })
      .eq('id', user.id);

    if (updateError) {
      throw updateError;
    }

    // Fire welcome email (fire-and-forget, works for both manual and Google signup)
    notifyWelcome(user.id, username, full_name).catch(console.error);

    return NextResponse.json({
      success: true,
      username,
      stellar_address: publicKey,
      tx_hash: txHash,
    });
  } catch (error: any) {
    console.error('Claim error:', error);
    return NextResponse.json({ error: error.message || 'Failed to claim Universal ID' }, { status: 500 });
  }
}
