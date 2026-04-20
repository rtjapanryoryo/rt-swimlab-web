import { NextResponse } from 'next/server';
import { createClient, getEffectiveUser } from '@/lib/supabase/server';

type Params = { params: Promise<{ id: string }> };

// PATCH /api/training/sessions/[id] — 実績ログ・コーチ上書き・ステータス更新
export async function PATCH(req: Request, { params }: Params) {
  const { id } = await params;
  const user = await getEffectiveUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const sb = await createClient();
  if (!sb) return NextResponse.json({ error: 'DB error' }, { status: 500 });

  const body = await req.json() as Record<string, unknown>;

  // 更新可能フィールド（コーチ上書き + 実績ログ）
  const allowed = [
    'status',
    'override_period', 'override_distance_m', 'override_condition',
    'coach_note',
    'menu_id',
    'actual_distance_m', 'actual_duration_min',
    'fatigue_before', 'fatigue_after',
    'athlete_note', 'ai_feedback',
  ];
  const patch = Object.fromEntries(
    Object.entries(body).filter(([k]) => allowed.includes(k)),
  );

  const { data, error } = await sb
    .from('training_sessions')
    .update(patch)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ session: data });
}

// DELETE /api/training/sessions/[id]
export async function DELETE(_req: Request, { params }: Params) {
  const { id } = await params;
  const user = await getEffectiveUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const sb = await createClient();
  if (!sb) return NextResponse.json({ error: 'DB error' }, { status: 500 });

  const { error } = await sb
    .from('training_sessions')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
