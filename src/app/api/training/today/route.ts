/**
 * GET /api/training/today?plan_id=xxx
 *
 * 今日の練習提案API
 * ・コーチ思想に従った強度・距離を提案
 * ・試合前ガードを自動適用
 * ・すべて「提案」—— コーチ/選手が上書き可能
 */
import { NextResponse } from 'next/server';
import { createClient, getEffectiveUser } from '@/lib/supabase/server';
import { buildSessionContext } from '@/lib/training/context-builder';
import { calcIntensityGuard } from '@/lib/training/intensity-guard';
import { getPeriodForDate } from '@/lib/training/period-allocator';
import type { TodaySuggestion, PeriodKey } from '@/types/training';

// 期 → 推奨距離マップ（レベル・疲労で調整）
const PERIOD_BASE_DISTANCE: Record<PeriodKey, number> = {
  '1': 3000,
  '2': 4000,
  '3': 4500,
  '4': 4000,
  '5': 3000,
  '6': 2500,
  '7': 2000,
};

function adjustDistance(base: number, avgFatigue: number | null, daysSinceLast: number | null): number {
  let d = base;
  // 高疲労なら-20%
  if (avgFatigue && avgFatigue >= 4) d = Math.round(d * 0.8);
  // 3日以上空いたら+10%（回復十分）
  if (daysSinceLast && daysSinceLast >= 3) d = Math.round(d * 1.1);
  // 500m単位に丸める
  return Math.round(d / 500) * 500;
}

function buildReason(ctx: Awaited<ReturnType<typeof buildSessionContext>>, distance: number): string {
  if (!ctx) return '';
  const parts: string[] = [];
  parts.push(`試合まで${ctx.days_to_meet}日`);
  parts.push(`現在${ctx.current_period}期`);
  if (ctx.days_since_last_session !== null) {
    parts.push(`前回から${ctx.days_since_last_session}日経過`);
  }
  if (ctx.avg_fatigue_7days !== null) {
    const desc = ctx.avg_fatigue_7days >= 4 ? '高疲労' : ctx.avg_fatigue_7days >= 3 ? '中疲労' : '体調良好';
    parts.push(`疲労度${ctx.avg_fatigue_7days}（${desc}）`);
  }
  if (ctx.weekly_volume_target_m) {
    const remaining = ctx.weekly_volume_target_m - ctx.weekly_volume_done_m;
    if (remaining > 0) {
      parts.push(`週間残り目標${remaining.toLocaleString()}m`);
    }
  }
  return parts.join('。') + `。そのため${distance.toLocaleString()}mを提案します。`;
}

export async function GET(req: Request) {
  const user = await getEffectiveUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const sb = await createClient();
  if (!sb) return NextResponse.json({ error: 'DB error' }, { status: 500 });

  const { searchParams } = new URL(req.url);
  const planId = searchParams.get('plan_id');

  // plan_id未指定ならアクティブプランを自動取得
  let resolvedPlanId = planId;
  if (!resolvedPlanId) {
    const { data: activePlan } = await sb
      .from('training_plans')
      .select('id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    resolvedPlanId = activePlan?.id ?? null;
  }

  if (!resolvedPlanId) {
    return NextResponse.json({ suggestion: null, reason: 'no_active_plan' });
  }

  // プラン・サイクル取得
  const { data: plan } = await sb
    .from('training_plans')
    .select('*, training_cycles(period, start_date, end_date, target_weekly_volume_m)')
    .eq('id', resolvedPlanId)
    .single();

  if (!plan || (plan as { user_id: string }).user_id !== user.id) {
    return NextResponse.json({ suggestion: null, reason: 'plan_not_found' });
  }

  // 文脈構築
  const ctx = await buildSessionContext(sb, user.id, resolvedPlanId);
  if (!ctx) return NextResponse.json({ suggestion: null, reason: 'context_error' });

  // 試合前ガード
  const guard = calcIntensityGuard(ctx.days_to_meet);

  // 推奨距離計算
  const baseDistance = PERIOD_BASE_DISTANCE[ctx.current_period] ?? 4000;
  const recommendedDistance = adjustDistance(
    baseDistance,
    ctx.avg_fatigue_7days,
    ctx.days_since_last_session,
  );

  // コンディション推定
  let condition = '普通';
  if (ctx.avg_fatigue_7days && ctx.avg_fatigue_7days >= 4) condition = '軽疲労';
  if (ctx.avg_fatigue_7days && ctx.avg_fatigue_7days >= 4.5) condition = '疲労残り';

  // 距離タイプ
  const distanceType = (plan as { goal_distance_type: string }).goal_distance_type as 'S' | 'M' | 'D';

  const suggestion: TodaySuggestion = {
    period:            ctx.current_period,
    distance_m:        recommendedDistance,
    condition,
    stroke:            (plan as { stroke_primary: string }).stroke_primary,
    distance_type:     distanceType,
    reason:            buildReason(ctx, recommendedDistance),
    warning:           guard.warning,
    days_to_meet:      ctx.days_to_meet,
    intensity_ceiling: guard.intensityCeilingStep !== null
      ? `強度上限：EN${guard.intensityCeilingStep <= 1 ? '1（②）' : guard.intensityCeilingStep <= 2 ? '1（②）' : '2（③）'}`
      : null,
    context:           ctx,
  };

  return NextResponse.json({ suggestion, plan_id: resolvedPlanId });
}
