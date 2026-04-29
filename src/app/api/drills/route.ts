import { NextResponse } from 'next/server';
import { createClient, getEffectiveUser } from '@/lib/supabase/server';
import type { DrillStroke } from '@/types/drill';
import { DRILL_STROKES } from '@/types/drill';

// GET /api/drills?stroke=freestyle — 公開ドリルのみ（ログイン必須）
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

  const { data, error } = await sb
    .from('drill_items')
    .select(
      'id, stroke, title, youtube_video_id, overview, key_points, sort_order, created_at, updated_at'
    )
    .eq('stroke', stroke)
    .eq('is_published', true)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ drills: data ?? [] });
}
