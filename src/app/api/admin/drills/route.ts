import { NextResponse } from 'next/server';
import { getEffectiveUser, createClient } from '@/lib/supabase/server';
import { extractYouTubeVideoId } from '@/lib/youtube-id';
import type { DrillStroke } from '@/types/drill';
import { DRILL_STROKES } from '@/types/drill';

async function requireAdmin(sb: NonNullable<Awaited<ReturnType<typeof createClient>>>, userId: string) {
  const { data: profile } = await sb.from('profiles').select('role').eq('id', userId).single();
  return profile?.role === 'admin';
}

// GET /api/admin/drills?stroke=freestyle — 全件（下書き含む）
export async function GET(req: Request) {
  const user = await getEffectiveUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const sb = await createClient();
  if (!sb) return NextResponse.json({ error: 'DB error' }, { status: 500 });

  if (!(await requireAdmin(sb, user.id))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const stroke = searchParams.get('stroke') as DrillStroke | null;

  let query = sb
    .from('drill_items')
    .select('*')
    .order('stroke', { ascending: true })
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (stroke && DRILL_STROKES.includes(stroke)) {
    query = query.eq('stroke', stroke);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ drills: data ?? [] });
}

// POST /api/admin/drills
export async function POST(req: Request) {
  const user = await getEffectiveUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const sb = await createClient();
  if (!sb) return NextResponse.json({ error: 'DB error' }, { status: 500 });

  if (!(await requireAdmin(sb, user.id))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json() as {
    stroke?: DrillStroke;
    title?: string;
    youtube_url?: string;
    overview?: string;
    key_points?: string;
    sort_order?: number;
    is_published?: boolean;
  };

  const { stroke, title, youtube_url, overview, key_points } = body;
  if (!stroke || !DRILL_STROKES.includes(stroke)) {
    return NextResponse.json({ error: 'Invalid stroke' }, { status: 400 });
  }
  if (!title || typeof title !== 'string' || title.length < 1 || title.length > 200) {
    return NextResponse.json({ error: 'Invalid title' }, { status: 400 });
  }
  if (typeof overview !== 'string' || overview.length > 8000) {
    return NextResponse.json({ error: 'Invalid overview' }, { status: 400 });
  }
  if (typeof key_points !== 'string' || key_points.length > 8000) {
    return NextResponse.json({ error: 'Invalid key_points' }, { status: 400 });
  }
  if (!youtube_url || typeof youtube_url !== 'string') {
    return NextResponse.json({ error: 'youtube_url required' }, { status: 400 });
  }

  const youtube_video_id = extractYouTubeVideoId(youtube_url);
  if (!youtube_video_id) {
    return NextResponse.json({ error: 'Invalid YouTube URL' }, { status: 400 });
  }

  const sort_order = typeof body.sort_order === 'number' && Number.isFinite(body.sort_order)
    ? Math.trunc(body.sort_order)
    : 0;
  const is_published = Boolean(body.is_published);

  const { data, error } = await sb
    .from('drill_items')
    .insert({
      stroke,
      title: title.trim(),
      youtube_video_id,
      overview,
      key_points,
      sort_order,
      is_published,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ drill: data });
}
