/**
 * プロフィール取得・更新 API
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient, getEffectiveUser } from '@/lib/supabase/server';
import { getSupabaseAdmin, getSupabaseServiceRole } from '@/lib/supabase/admin';

export async function GET() {
  const user = await getEffectiveUser();
  if (!user) {
    return NextResponse.json({ error: 'login_required' }, { status: 401 });
  }

  const sb = user.isBypass ? getSupabaseServiceRole() : (await createClient());
  if (!sb) {
    return NextResponse.json({ error: 'not_configured' }, { status: 503 });
  }

  let { data, error } = await sb
    .from('profiles')
    .select('id, role, display_name, total_usage_count, created_at')
    .eq('id', user.id)
    .single();

  if (error?.code === 'PGRST116' || !data) {
    try {
      const admin = getSupabaseAdmin() ?? getSupabaseServiceRole();
      if (admin) {
        const initialName = user.isBypass
          ? '開発用バイパス'
          : ((user as { user_metadata?: { full_name?: string } })?.user_metadata?.full_name ?? user.email ?? null);
        await admin.from('profiles').upsert({
          id: user.id,
          role: 'user',
          display_name: initialName,
          total_usage_count: 0,
        }, { onConflict: 'id' });
        const r = await admin.from('profiles').select().eq('id', user.id).single();
        data = r.data;
      }
    } catch {
      return NextResponse.json({ profile: null });
    }
  } else if (error) {
    console.error('[profile] GET error:', error);
    return NextResponse.json({ profile: null });
  }

  // 表示名が空のときは登録時の名前（user_metadata.full_name）またはメールをフォールバック
  const authUser = user as { user_metadata?: { full_name?: string }; email?: string | null };
  const displayName =
    (data?.display_name?.trim() && data.display_name) ||
    authUser?.user_metadata?.full_name ||
    authUser?.email ||
    null;

  return NextResponse.json({
    profile: data ? { ...data, display_name: displayName ?? data.display_name } : null,
  });
}

export async function PATCH(request: NextRequest) {
  const user = await getEffectiveUser();
  if (!user) {
    return NextResponse.json({ error: 'login_required' }, { status: 401 });
  }

  const sb = user.isBypass ? getSupabaseServiceRole() : (await createClient());
  if (!sb) {
    return NextResponse.json({ error: 'not_configured' }, { status: 503 });
  }

  const body = await request.json().catch(() => ({}));
  const updates: Record<string, unknown> = {};
  if (typeof body.display_name === 'string') updates.display_name = body.display_name.trim();

  const { data, error } = await sb
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
