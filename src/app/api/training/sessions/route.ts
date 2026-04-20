import { NextResponse } from 'next/server';
import { createClient, getEffectiveUser } from '@/lib/supabase/server';

// GET /api/training/sessions?plan_id=xxx[&limit=20]
export async function GET(req: Request) {
  const user = await getEffectiveUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const sb = await createClient();
  if (!sb) return NextResponse.json({ error: 'DB error' }, { status: 500 });

  const { searchParams } = new URL(req.url);
  const planId = searchParams.get('plan_id');
  const limit  = Math.min(parseInt(searchParams.get('limit') ?? '50'), 200);

  let q = sb
    .from('training_sessions')
    .select('*')
    .eq('user_id', user.id)
    .order('scheduled_date', { ascending: false })
    .limit(limit);

  if (planId) q = q.eq('plan_id', planId);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ sessions: data });
}

// POST /api/training/sessions — セッション作成（AI提案 or 手動）
export async function POST(req: Request) {
  const user = await getEffectiveUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const sb = await createClient();
  if (!sb) return NextResponse.json({ error: 'DB error' }, { status: 500 });

  const body = await req.json() as Record<string, unknown>;

  if (!body.plan_id)        return NextResponse.json({ error: 'plan_id required' }, { status: 400 });
  if (!body.scheduled_date) return NextResponse.json({ error: 'scheduled_date required' }, { status: 400 });

  // プランの所有者確認
  const { data: plan } = await sb
    .from('training_plans')
    .select('id, user_id')
    .eq('id', body.plan_id)
    .single();
  if (!plan || (plan as { user_id: string }).user_id !== user.id)
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { data, error } = await sb
    .from('training_sessions')
    .insert({
      plan_id:                    body.plan_id,
      user_id:                    user.id,
      cycle_id:                   body.cycle_id          ?? null,
      scheduled_date:             body.scheduled_date,
      status:                     body.status            ?? 'planned',
      ai_suggested_period:        body.ai_suggested_period    ?? null,
      ai_suggested_distance_m:    body.ai_suggested_distance_m ?? null,
      ai_suggested_condition:     body.ai_suggested_condition  ?? null,
      ai_suggestion_reason:       body.ai_suggestion_reason    ?? null,
      override_period:            body.override_period         ?? null,
      override_distance_m:        body.override_distance_m     ?? null,
      override_condition:         body.override_condition      ?? null,
      coach_note:                 body.coach_note              ?? null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ session: data }, { status: 201 });
}
