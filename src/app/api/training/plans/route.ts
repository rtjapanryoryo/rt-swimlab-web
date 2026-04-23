import { NextResponse } from 'next/server';
import { createClient, getEffectiveUser } from '@/lib/supabase/server';
import { allocatePeriods } from '@/lib/training/period-allocator';
import type { CreatePlanInput, SecondaryMeet } from '@/types/training';

// GET /api/training/plans — アクティブプラン一覧
export async function GET() {
  const user = await getEffectiveUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const sb = await createClient();
  if (!sb) return NextResponse.json({ error: 'DB error' }, { status: 500 });

  const { data: plans, error } = await sb
    .from('training_plans')
    .select(`
      *,
      training_cycles(period, start_date, end_date, target_weekly_volume_m),
      training_sessions(id, scheduled_date, status, actual_distance_m, fatigue_after)
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ plans });
}

// POST /api/training/plans — 新規プラン作成 + 期自動配分
export async function POST(req: Request) {
  const user = await getEffectiveUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const sb = await createClient();
  if (!sb) return NextResponse.json({ error: 'DB error' }, { status: 500 });

  const body = (await req.json()) as CreatePlanInput & { auto_allocate?: boolean; secondary_meets?: SecondaryMeet[] };

  // バリデーション
  if (!body.name?.trim())          return NextResponse.json({ error: 'name is required' }, { status: 400 });
  if (!body.goal_meet_date)        return NextResponse.json({ error: 'goal_meet_date is required' }, { status: 400 });
  if (!body.start_date)            return NextResponse.json({ error: 'start_date is required' }, { status: 400 });
  if (body.start_date >= body.goal_meet_date)
    return NextResponse.json({ error: 'start_date must be before goal_meet_date' }, { status: 400 });

  // プラン作成
  const { data: plan, error: planErr } = await sb
    .from('training_plans')
    .insert({
      user_id:            user.id,
      name:               body.name.trim(),
      goal_event:         body.goal_event         ?? 'Fr',
      goal_distance_type: body.goal_distance_type ?? 'M',
      goal_time_sec:      body.goal_time_sec       ?? null,
      goal_meet_date:     body.goal_meet_date,
      goal_meet_name:     body.goal_meet_name      ?? null,
      secondary_meets:    body.secondary_meets     ?? [],
      start_date:         body.start_date,
      level:              body.level               ?? '中級（育成クラス〜県大会）',
      stroke_primary:     body.stroke_primary      ?? 'Fr',
      coach_memo:         body.coach_memo          ?? null,
    })
    .select()
    .single();

  if (planErr) return NextResponse.json({ error: planErr.message }, { status: 500 });

  // 期自動配分（オプション・デフォルトtrue）
  const autoAllocate = body.auto_allocate !== false;
  if (autoAllocate && plan) {
    const allocations = allocatePeriods(plan.start_date as string, plan.goal_meet_date as string);
    if (allocations.length > 0) {
      const cycles = allocations.map(a => ({
        plan_id:                plan.id,
        period:                 a.period,
        start_date:             a.start_date,
        end_date:               a.end_date,
        target_weekly_volume_m: a.target_weekly_volume_m,
      }));
      await sb.from('training_cycles').insert(cycles);
    }
  }

  // 作成したプランをサイクル込みで返す
  const { data: created } = await sb
    .from('training_plans')
    .select('*, training_cycles(period, start_date, end_date, target_weekly_volume_m)')
    .eq('id', plan.id)
    .single();

  return NextResponse.json({ plan: created }, { status: 201 });
}
