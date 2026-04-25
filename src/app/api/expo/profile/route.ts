import { NextResponse } from 'next/server';
import { getUser } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/supabase';

// Allow up to 2MB body (for base64 avatar_url payloads)
export const runtime = 'nodejs';

export async function GET() {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (error) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
  }

  return NextResponse.json(data);
}

export async function PUT(request: Request) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { preferred_currency, full_name, display_name, phone_number, app_pin, avatar_url } = body;

  const updateData: any = {};
  if (preferred_currency) updateData.preferred_currency = preferred_currency;
  if (full_name !== undefined) updateData.full_name = full_name;
  if (display_name !== undefined) updateData.display_name = display_name;
  if (phone_number !== undefined) updateData.phone_number = phone_number;
  if (app_pin !== undefined) updateData.app_pin = app_pin;
  if (avatar_url !== undefined) updateData.avatar_url = avatar_url;

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  }

  // If changing phone number, ensure it's not already taken by another user
  if (updateData.phone_number) {
    const { data: existingPhone } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('phone_number', updateData.phone_number)
      .neq('id', user.id)
      .maybeSingle();

    if (existingPhone) {
      return NextResponse.json({ error: 'Phone number already registered to another account' }, { status: 400 });
    }
  }

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .update(updateData)
    .eq('id', user.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }

  return NextResponse.json(data);
}
