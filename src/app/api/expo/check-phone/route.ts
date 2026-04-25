import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const phone = searchParams.get('phone');

  if (!phone) {
    return NextResponse.json({ error: 'Phone required' }, { status: 400 });
  }

  const { data } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('phone_number', phone)
    .maybeSingle();

  return NextResponse.json({ taken: !!data });
}
