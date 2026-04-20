import { NextResponse } from 'next/server';
import { createClient, getEffectiveUser } from '@/lib/supabase/server';

type Params = { params: Promise<{ id: string }> };

// GET /api/training/plans/[id] — プラン詳細（サイクル・セッション込み）
export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;
  const user = await getEffectiveUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const sb = await createClient();
  if (!sb) return NextResponse.json({ error: 'DB error' }, { status: 500 });

  const { data: plan, error } = await sb
    .from('training_plans')
    .select(`
      *,
      training_cycles(id, period, start_date, end_date, target_weekly_volume_m, notes),
      training_sessions(
        id, scheduled_date, status,
        ai_suggested_period, ai_suggested_distance_m, ai_suggestion_reason,
        override_period, override_distance_m,
        actual_distance_m, fatigue_after, coach_note, athlete_note, ai_feedback,
        menu_id
      )
    `)
    .eq('id', id)
    .single();

  if (error || !plan) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if ((plan as { user_id: string }).user_id !== user.id)
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  return NextResponse.json({ plan });
}

// PATCH /api/training/plans/[id] — プラン更新（coach_memo含む）
export async function PATCH(req: Request, { params }: Params) {
  const { id } = await params;
  const user = await getEffectiveUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const sb = await createClient();
  if (!sb) return NextResponse.json({ error: 'DB error' }, { status: 500 });

  const body = await req.json() as Record<string, unknown>;
  const allowed = [
    'name', 'goal_event', 'goal_distance_type', 'goal_time_sec',
    'goal_meet_date', 'goal_meet_name', 'level', 'stroke_primary',
    'coach_memo', 'is_active',
  ];
  const patch = Object.fromEntries(
    Object.entries(body).filter(([k]) => allowed.includes(k)),
  );

  const { data, error } = await sb
    .from('training_plans')
    .update(patch)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ plan: data });
}

// DELETE /api/training/plans/[id]
export async function DELETE(_req: Request, { params }: Params) {
  const { id } = await params;
  const user = await getEffectiveUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const sb = await createClient();
  if (!sb) return NextResponse.json({ error: 'DB error' }, { status: 500 });

  const { error } = await sb
    .from('training_plans')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
