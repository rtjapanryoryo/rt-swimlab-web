/**
 * 生成ログ API
 * - GET: 自分のログ一覧
 * - POST: 新規ログ追加 + total_usage_count +1（テスト用ダミー含む）
 */
import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/supabase/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'login_required' }, { status: 401 });
  }

  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json({ error: 'not_configured' }, { status: 503 });
  }

  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '50', 10), 100);

  const { data, error } = await supabase
    .from('generation_logs')
    .select('id, content_details, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[generation-logs] GET error:', error);
    return NextResponse.json({ logs: [] });
  }

  return NextResponse.json({ logs: data ?? [] });
}

export async function POST(request: NextRequest) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'login_required' }, { status: 401 });
  }

  const sb = await createClient();
  if (!sb) {
    return NextResponse.json({ error: 'not_configured' }, { status: 503 });
  }

  const body = await request.json().catch(() => ({}));
  const content = typeof body.content_details === 'string' ? body.content_details : '（テスト用：新しい編集メニューを生成）';

  try {
    const { data: log, error: insertErr } = await sb
      .from('generation_logs')
      .insert({
        user_id: user.id,
        content_details: content,
      })
      .select('id, created_at')
      .single();

    if (insertErr) {
      console.error('[generation-logs] insert error:', insertErr);
      return NextResponse.json({ error: insertErr.message }, { status: 500 });
    }

    const { data: profile } = await sb
      .from('profiles')
      .select('total_usage_count')
      .eq('id', user.id)
      .single();

    const current = profile?.total_usage_count ?? 0;
    const nextCount = current + 1;
    await sb
      .from('profiles')
      .update({ total_usage_count: nextCount, updated_at: new Date().toISOString() })
      .eq('id', user.id);

    return NextResponse.json({ log, total_usage_count: nextCount });
  } catch (e) {
    console.error('[generation-logs] POST error:', e);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
