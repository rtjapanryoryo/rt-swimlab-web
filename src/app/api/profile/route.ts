/**
 * プロフィール取得・更新 API
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export async function GET() {
  const user = await (await import('@/lib/supabase/server')).getUser();
  if (!user) {
    return NextResponse.json({ error: 'login_required' }, { status: 401 });
  }

  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json({ error: 'not_configured' }, { status: 503 });
  }

  let { data, error } = await supabase
    .from('profiles')
    .select('id, role, display_name, total_usage_count, created_at')
    .eq('id', user.id)
    .single();

  if (error?.code === 'PGRST116' || !data) {
    try {
      const admin = await import('@/lib/supabase/admin').then((m) => m.getSupabaseAdmin());
      if (admin) {
        await admin.from('profiles').upsert({
          id: user.id,
          role: 'user',
          display_name: user.user_metadata?.full_name ?? user.email ?? null,
          total_usage_count: 0,
        }, { onConflict: 'id' });
        const r = await admin.from('profiles').select().eq('id', user.id).single();
        data = r.data;
      }
    } catch {
      /* profiles テーブル未作成時は null を返す（ログインは継続可能） */
      return NextResponse.json({ profile: null });
    }
  } else if (error) {
    console.error('[profile] GET error:', error);
    return NextResponse.json({ profile: null });
  }

  return NextResponse.json({ profile: data });
}

export async function PATCH(request: NextRequest) {
  const user = await (await import('@/lib/supabase/server')).getUser();
  if (!user) {
    return NextResponse.json({ error: 'login_required' }, { status: 401 });
  }

  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json({ error: 'not_configured' }, { status: 503 });
  }

  const body = await request.json().catch(() => ({}));
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof body.display_name === 'string') updates.display_name = body.display_name.trim();

  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', user.id)
    .select()
    .single();

  if (error) {
    console.error('[profile] PATCH error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ profile: data });
}
