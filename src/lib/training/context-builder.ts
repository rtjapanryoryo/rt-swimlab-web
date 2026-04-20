/**
 * セッション履歴 → AI 文脈生成
 *
 * 練習の「ストーリー」をAIに伝える橋渡し役。
 * この文脈がカスタムメニュー生成のsystem promptに注入される。
 *
 * コーチ思想（coach_memo）を先頭に配置することで、
 * AIがコーチの方針に従った提案をするようにする。
 */

import type { SessionContext, RecentSession, PeriodKey } from '@/types/training';
import type { SupabaseClient } from '@supabase/supabase-js';
import { calcIntensityGuard } from './intensity-guard';
import { getPeriodForDate } from './period-allocator';

function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

function toISODate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * アクティブプランの今日のセッション文脈を構築する
 */
export async function buildSessionContext(
  sb: SupabaseClient,
  userId: string,
  planId: string,
  targetDate: Date = new Date(),
): Promise<SessionContext | null> {
  const todayStr = toISODate(targetDate);

  // プラン取得
  const { data: plan } = await sb
    .from('training_plans')
    .select('*')
    .eq('id', planId)
    .eq('user_id', userId)
    .single();

  if (!plan) return null;

  // サイクル取得
  const { data: cycles } = await sb
    .from('training_cycles')
    .select('period, start_date, end_date, target_weekly_volume_m')
    .eq('plan_id', planId)
    .order('start_date');

  const cyclelist = cycles ?? [];

  // 今日の期を判定
  const currentPeriod = (getPeriodForDate(cyclelist, todayStr) ?? '3') as PeriodKey;

  // 試合まで残り日数
  const meetDate      = new Date(plan.goal_meet_date);
  const daysToMeet    = Math.max(0, daysBetween(targetDate, meetDate));

  // 強度ガード計算
  const guard = calcIntensityGuard(daysToMeet);

  // 直近5セッション取得（実施済み）
  const { data: recentRaw } = await sb
    .from('training_sessions')
    .select('scheduled_date, actual_distance_m, fatigue_after, ai_suggested_period, override_period, status')
    .eq('plan_id', planId)
    .eq('user_id', userId)
    .lte('scheduled_date', todayStr)
    .order('scheduled_date', { ascending: false })
    .limit(5);

  const recentSessions: RecentSession[] = (recentRaw ?? []).map(r => ({
    date:        r.scheduled_date as string,
    distance_m:  r.actual_distance_m as number | null,
    fatigue_after: r.fatigue_after as (1 | 2 | 3 | 4 | 5) | null,
    period:      (r.override_period ?? r.ai_suggested_period) as PeriodKey | null,
    status:      r.status as 'planned' | 'done' | 'skipped',
  }));

  // 前回セッションからの経過日数
  const lastDone = recentSessions.find(s => s.status === 'done');
  const daysSinceLast = lastDone
    ? daysBetween(new Date(lastDone.date), targetDate)
    : null;

  // 直近7日の平均疲労度
  const weekAgo = new Date(targetDate);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const fatigueValues = recentSessions
    .filter(s => s.status === 'done' && new Date(s.date) >= weekAgo && s.fatigue_after !== null)
    .map(s => s.fatigue_after as number);
  const avgFatigue = fatigueValues.length
    ? fatigueValues.reduce((a, b) => a + b, 0) / fatigueValues.length
    : null;

  // 今週の実施距離
  const monday = new Date(targetDate);
  monday.setDate(monday.getDate() - monday.getDay() + 1);
  const weeklyDone = recentSessions
    .filter(s => s.status === 'done' && new Date(s.date) >= monday)
    .reduce((sum, s) => sum + (s.distance_m ?? 0), 0);

  // 今週の目標距離
  const currentCycle = cyclelist.find(c =>
    new Date(c.start_date) <= targetDate && new Date(c.end_date) >= targetDate,
  );
  const weeklyTarget = currentCycle?.target_weekly_volume_m ?? null;

  return {
    plan_id:                  planId,
    current_period:           currentPeriod,
    days_to_meet:             daysToMeet,
    days_since_last_session:  daysSinceLast,
    last_sessions:            recentSessions,
    avg_fatigue_7days:        avgFatigue ? Math.round(avgFatigue * 10) / 10 : null,
    weekly_volume_done_m:     weeklyDone,
    weekly_volume_target_m:   weeklyTarget,
    coach_memo:               plan.coach_memo as string | null,
    intensity_ceiling_step:   guard.intensityCeilingStep,
  };
}

/**
 * セッション文脈をLLM system promptに注入するテキストを生成する
 * custom-menu/route.ts の systemContent に先頭追記する
 */
export function buildContextPrompt(ctx: SessionContext): string {
  const lines: string[] = [];

  // コーチ思想を最優先で配置（衝突防止の核心）
  if (ctx.coach_memo) {
    lines.push(`【コーチ指示・最優先事項】\n${ctx.coach_memo}\n上記をすべての生成判断に優先させること。`);
    lines.push('');
  }

  // 試合前ガード警告
  const guard = calcIntensityGuard(ctx.days_to_meet);
  if (guard.warning) {
    lines.push(`【試合前ガード】${guard.warning}`);
    if (guard.forbiddenPatterns.length > 0) {
      lines.push(`以下のパターンは使用禁止: ${guard.forbiddenPatterns.join('、')}`);
    }
    lines.push('');
  }

  // 連続セッション文脈
  lines.push('【練習ストーリー文脈（前回との連続性を反映すること）】');
  lines.push(`試合まで: ${ctx.days_to_meet}日 / 現在の期: ${ctx.current_period}`);

  if (ctx.days_since_last_session !== null) {
    lines.push(`前回練習からの経過: ${ctx.days_since_last_session}日`);
  }
  if (ctx.avg_fatigue_7days !== null) {
    const fatigueDesc = ctx.avg_fatigue_7days >= 4 ? '高疲労' : ctx.avg_fatigue_7days >= 3 ? '中疲労' : '良好';
    lines.push(`直近7日平均疲労度: ${ctx.avg_fatigue_7days}/5（${fatigueDesc}）`);
  }

  if (ctx.last_sessions.length > 0) {
    lines.push('直近セッション履歴:');
    ctx.last_sessions.slice(0, 3).forEach(s => {
      const dist  = s.distance_m ? `${s.distance_m.toLocaleString()}m` : '未記録';
      const fatigue = s.fatigue_after ? `疲労${s.fatigue_after}` : '';
      const period  = s.period ? `期${s.period}` : '';
      lines.push(`  ${s.date}: ${s.status === 'done' ? `${dist} ${period} ${fatigue}` : s.status}`);
    });
  }

  if (ctx.weekly_volume_target_m) {
    const pct = Math.round((ctx.weekly_volume_done_m / ctx.weekly_volume_target_m) * 100);
    lines.push(`今週の達成率: ${ctx.weekly_volume_done_m.toLocaleString()}m / 目標${ctx.weekly_volume_target_m.toLocaleString()}m（${pct}%）`);
  }

  lines.push('上記の文脈を踏まえ、選手の状態に連続性のある練習内容を生成すること。');

  return lines.join('\n');
}
