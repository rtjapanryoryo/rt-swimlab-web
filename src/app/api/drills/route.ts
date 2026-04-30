import { NextResponse } from 'next/server';
import { createClient, getEffectiveUser } from '@/lib/supabase/server';
import type { DrillStroke } from '@/types/drill';
import { DRILL_STROKES } from '@/types/drill';

// GET /api/drills?stroke=freestyle[&preview=1] — 公開ドリル（ログイン必須）。preview=1 は管理者のみ未公開も返す
export async function GET(req: Request) {
  const user = await getEffectiveUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const stroke = searchParams.get('stroke') as DrillStroke | null;
  if (!stroke || !DRILL_STROKES.includes(stroke)) {
    return NextResponse.json({ error: 'Invalid stroke' }, { status: 400 });
  }

  const sb = await createClient();
  if (!sb) return NextResponse.json({ error: 'DB error' }, { status: 500 });

  const wantsPreview = searchParams.get('preview') === '1';
  let isAdmin = false;
  if (wantsPreview) {
    const { data: profile } = await sb.from('profiles').select('role').eq('id', user.id).single();
    isAdmin = profile?.role === 'admin';
    if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let query = sb
    .from('drill_items')
    .select('id, stroke, title, youtube_video_id, overview, key_points, sort_order, is_published, created_at, updated_at')
    .eq('stroke', stroke)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (!isAdmin) {
    query = query.eq('is_published', true);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ drills: data ?? [], preview: isAdmin });
}
