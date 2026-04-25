import { NextResponse } from 'next/server';
import { getUser } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/supabase';
import { generateQuote } from '@/lib/fx-service';

export async function POST(request: Request) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { from_currency, to_currency, amount, expiry_seconds = 45 } = await request.json();

  if (!from_currency || !to_currency || !amount) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  if (amount <= 0) {
    return NextResponse.json({ error: 'Amount must be positive' }, { status: 400 });
  }

  try {
    const quote = await generateQuote(from_currency, to_currency, amount, expiry_seconds);

    // Try to persist quote to DB — non-fatal if fx_quotes table doesn't exist yet
    let quoteId: string | null = null;
    try {
      const { data } = await supabaseAdmin
        .from('fx_quotes')
        .insert({
          user_id: user.id,
          from_currency: quote.from_currency,
          to_currency: quote.to_currency,
          rate: quote.rate,
          source_amount: quote.source_amount,
          target_amount: quote.target_amount,
          expires_at: quote.expires_at,
        })
        .select()
        .single();
      quoteId = data?.id ?? null;
    } catch {
      // fx_quotes table may not exist — quote still works without DB record
    }

    return NextResponse.json({
      id: quoteId ?? `local_${Date.now()}`,
      ...quote,
    });
  } catch (error) {
    console.error('Quote generation error:', error);
    return NextResponse.json({ error: 'Failed to generate quote' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const quoteId = searchParams.get('id');

  if (!quoteId) {
    return NextResponse.json({ error: 'Quote ID required' }, { status: 400 });
  }

  const { data: quote, error } = await supabaseAdmin
    .from('fx_quotes')
    .select('*')
    .eq('id', quoteId)
    .eq('user_id', user.id)
    .single();

  if (error || !quote) {
    return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
  }

  const now = new Date();
  const expiresAt = new Date(quote.expires_at);
  const secondsRemaining = Math.max(0, Math.floor((expiresAt.getTime() - now.getTime()) / 1000));

  return NextResponse.json({
    ...quote,
    seconds_remaining: secondsRemaining,
    expired: secondsRemaining === 0 || quote.used,
  });
}
