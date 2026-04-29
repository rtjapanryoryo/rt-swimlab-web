import { NextResponse } from 'next/server';
import { getEffectiveUser, createClient } from '@/lib/supabase/server';
import { extractYouTubeVideoId } from '@/lib/youtube-id';
import type { DrillStroke } from '@/types/drill';
import { DRILL_STROKES } from '@/types/drill';

async function requireAdmin(sb: NonNullable<Awaited<ReturnType<typeof createClient>>>, userId: string) {
  const { data: profile } = await sb.from('profiles').select('role').eq('id', userId).single();
  return profile?.role === 'admin';
}

// PATCH /api/admin/drills/[id]
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getEffectiveUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const sb = await createClient();
  if (!sb) return NextResponse.json({ error: 'DB error' }, { status: 500 });

  if (!(await requireAdmin(sb, user.id))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json() as {
    stroke?: DrillStroke;
    title?: string;
    youtube_url?: string;
    overview?: string;
    key_points?: string;
    sort_order?: number;
    is_published?: boolean;
  };

  const updates: Record<string, unknown> = {};

  if (body.stroke !== undefined) {
    if (!DRILL_STROKES.includes(body.stroke)) {
      return NextResponse.json({ error: 'Invalid stroke' }, { status: 400 });
    }
    updates.stroke = body.stroke;
  }
  if (body.title !== undefined) {
    if (typeof body.title !== 'string' || body.title.length < 1 || body.title.length > 200) {
      return NextResponse.json({ error: 'Invalid title' }, { status: 400 });
    }
    updates.title = body.title.trim();
  }
  if (body.youtube_url !== undefined) {
    if (typeof body.youtube_url !== 'string') {
      return NextResponse.json({ error: 'Invalid youtube_url' }, { status: 400 });
    }
    const vid = extractYouTubeVideoId(body.youtube_url);
    if (!vid) return NextResponse.json({ error: 'Invalid YouTube URL' }, { status: 400 });
    updates.youtube_video_id = vid;
  }
  if (body.overview !== undefined) {
    if (typeof body.overview !== 'string' || body.overview.length > 8000) {
      return NextResponse.json({ error: 'Invalid overview' }, { status: 400 });
    }
    updates.overview = body.overview;
  }
  if (body.key_points !== undefined) {
    if (typeof body.key_points !== 'string' || body.key_points.length > 8000) {
      return NextResponse.json({ error: 'Invalid key_points' }, { status: 400 });
    }
    updates.key_points = body.key_points;
  }
  if (body.sort_order !== undefined) {
    if (typeof body.sort_order !== 'number' || !Number.isFinite(body.sort_order)) {
      return NextResponse.json({ error: 'Invalid sort_order' }, { status: 400 });
    }
    updates.sort_order = Math.trunc(body.sort_order);
  }
  if (body.is_published !== undefined) {
    updates.is_published = Boolean(body.is_published);
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No updates' }, { status: 400 });
  }

  const { data, error } = await sb
    .from('drill_items')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ drill: data });
}

// DELETE /api/admin/drills/[id]
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getEffectiveUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const sb = await createClient();
  if (!sb) return NextResponse.json({ error: 'DB error' }, { status: 500 });

  if (!(await requireAdmin(sb, user.id))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const { error } = await sb.from('drill_items').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
