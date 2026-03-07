/**
 * auth.users → profiles を同期（管理者のみ）
 * Supabase の sync_profiles_from_auth() を呼び出す
 */
import { NextResponse } from 'next/server';
import { getUser } from '@/lib/supabase/server';
import { createClient } from '@/lib/supabase/server';

export async function POST() {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'login_required' }, { status: 401 });
  }

  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json({ error: 'not_configured' }, { status: 503 });
  }

  const { data, error } = await supabase.rpc('sync_profiles_from_auth');

  if (error) {
    if (error.message === 'admin only' || error.code === 'P0001') {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }
    console.error('[admin/sync-profiles] error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const inserted = Array.isArray(data) && data[0] ? Number(data[0].inserted_count) : 0;
  return NextResponse.json({ inserted_count: inserted });
}
