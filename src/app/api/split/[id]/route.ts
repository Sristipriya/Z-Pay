import { NextResponse } from 'next/server';
import { getUser } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/supabase';

// GET /api/split/[id]
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: split } = await supabaseAdmin
    .from('split_bills')
    .select('*, split_participants(*)')
    .eq('id', params.id)
    .single();

  if (!split) return NextResponse.json({ error: 'Split not found' }, { status: 404 });

  // Check access: must be creator or participant
  const isCreator = split.creator_id === user.id;
  const isParticipant = split.split_participants.some((p: any) => p.user_id === user.id);
  if (!isCreator && !isParticipant) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  return NextResponse.json({ split, isCreator, currentUserId: user.id });
}
