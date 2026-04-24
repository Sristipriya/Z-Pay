import { NextResponse } from 'next/server';
import { getUser } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/supabase';

// Security check: Only allow specific Admin/Arbiter emails to access this
const ADMIN_EMAILS = ['admin@expopay.app', 'support@expopay.app', 'bkbhaia@gmail.com']; // Customize as needed

export async function GET() {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Simple admin check based on email
  if (!user.email || !ADMIN_EMAILS.includes(user.email)) {
    return NextResponse.json({ error: 'Forbidden: Admins Only' }, { status: 403 });
  }

  try {
    // Fetch all contracts that are currently disputed OR were previously disputed
    const { data: contracts, error } = await supabaseAdmin
      .from('contracts')
      .select('*')
      .not('disputed_by', 'is', null) // Fetch anything that was ever disputed
      .order('disputed_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json(contracts);
  } catch (error: any) {
    console.error('Admin fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch disputed contracts' }, { status: 500 });
  }
}
