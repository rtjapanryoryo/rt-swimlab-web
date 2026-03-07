/**
 * 管理者用: 全ユーザーの profiles 一覧
 * role=admin のみアクセス可能（RLS で制御）
 */
import { NextResponse } from 'next/server';
import { createClient, getEffectiveUser } from '@/lib/supabase/server';
import { getSupabaseServiceRole } from '@/lib/supabase/admin';

export async function GET() {
  const user = await getEffectiveUser();
  if (!user) {
    return NextResponse.json({ error: 'login_required' }, { status: 401 });
  }

  const sb = user.isBypass ? getSupabaseServiceRole() : await createClient();
  if (!sb) {
    return NextResponse.json({ error: 'not_configured' }, { status: 503 });
  }

  const { data: me } = await sb.from('profiles').select('role').eq('id', user.id).single();
  if (me?.role !== 'admin') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const { data, error } = await sb
    .from('profiles')
    .select('id, role, display_name, total_usage_count, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[admin/profiles] error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ profiles: data ?? [] });
}
