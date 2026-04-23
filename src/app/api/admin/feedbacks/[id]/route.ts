import { NextResponse } from 'next/server';
import { getEffectiveUser } from '@/lib/supabase/server';
import { getSupabaseServiceRole } from '@/lib/supabase/admin';
import type { FeedbackStatus } from '@/types/feedback';

const VALID_STATUSES: FeedbackStatus[] = ['pending', 'in_progress', 'resolved', 'dismissed'];

// PATCH /api/admin/feedbacks/[id] — ステータス・管理者メモを更新
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getEffectiveUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const sb = getSupabaseServiceRole();
  if (!sb) return NextResponse.json({ error: 'DB error' }, { status: 500 });

  const { data: profile } = await sb
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json() as { status?: FeedbackStatus; admin_note?: string };

  if (body.status && !VALID_STATUSES.includes(body.status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  if (body.status !== undefined)     updates.status     = body.status;
  if (body.admin_note !== undefined) updates.admin_note = body.admin_note;

  const { data, error } = await sb
    .from('feedbacks')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ feedback: data });
}
