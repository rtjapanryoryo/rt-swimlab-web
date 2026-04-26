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

function mapPlanLevelToGoalSheetLevel(planLevel: string): 'beginner' | 'intermediate' | 'advanced' {
  if (planLevel.includes('初級') || planLevel.includes('入門')) return 'beginner';
  if (planLevel.includes('上級') || planLevel.includes('選抜')) return 'advanced';
  return 'intermediate';
}

function summarizeGoalSheet(level: string, content: Record<string, unknown>): string | null {
  const str = (v: unknown) => String(v ?? '').trim();
  const filled = (v: unknown) => str(v).length > 2;
  const parts: string[] = [];

  if (level === 'beginner') {
    if (filled(content.vision_how))       parts.push(`なりたい姿: ${str(content.vision_how)}`);
    if (filled(content.vision_deadline))  parts.push(`目標期限: ${str(content.vision_deadline)}`);
    if (filled(content.current_best_time))parts.push(`現ベスト: ${str(content.current_best_time)}`);
    if (filled(content.current_weaknesses)) parts.push(`課題: ${str(content.current_weaknesses)}`);
    if (filled(content.goal_this_week))   parts.push(`今週の目標: ${str(content.goal_this_week)}`);
  } else if (level === 'intermediate') {
    if (filled(content.vision_event))       parts.push(`目標種目: ${str(content.vision_event)}`);
    if (filled(content.vision_target_time)) parts.push(`目標タイム: ${str(content.vision_target_time)}`);
    if (filled(content.vision_player_type)) parts.push(`目指す選手像: ${str(content.vision_player_type)}`);
    if (filled(content.current_best_time))  parts.push(`現ベスト: ${str(content.current_best_time)}`);
    if (filled(content.current_improvements)) parts.push(`改善点: ${str(content.current_improvements)}`);
    if (filled(content.season_meet))        parts.push(`目標大会: ${str(content.season_meet)}`);
    if (filled(content.season_time))        parts.push(`シーズン目標タイム: ${str(content.season_time)}`);
  } else if (level === 'advanced') {
    if (filled(content.vision_time))    parts.push(`目標タイム: ${str(content.vision_time)}`);
    if (filled(content.vision_pattern)) parts.push(`必勝パターン: ${str(content.vision_pattern)}`);
    if (filled(content.diff_first))     parts.push(`前半差: ${str(content.diff_first)}`);
    if (filled(content.diff_second))    parts.push(`後半差: ${str(content.diff_second)}`);
  }

  return parts.length > 0 ? parts.join(' / ') : null;
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

  // サイクル・目標シート・直近メニューを並列取得
  const [cyclesResult, goalSheetResult, recentMenusResult, recentRaw] = await Promise.all([
    sb
      .from('training_cycles')
      .select('period, start_date, end_date, target_weekly_volume_m')
      .eq('plan_id', planId)
      .order('start_date'),

    sb
      .from('goal_sheets')
      .select('level, content')
      .eq('user_id', userId)
      .eq('level', mapPlanLevelToGoalSheetLevel(plan.level as string))
      .maybeSingle(),

    sb
      .from('menus')
      .select('result, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(3),

    sb
      .from('training_sessions')
      .select('scheduled_date, actual_distance_m, fatigue_after, ai_suggested_period, override_period, status, athlete_note')
      .eq('plan_id', planId)
      .eq('user_id', userId)
      .lte('scheduled_date', todayStr)
      .order('scheduled_date', { ascending: false })
      .limit(5),
  ]);

  const cyclelist = cyclesResult.data ?? [];

  // 今日の期を判定
  const currentPeriod = (getPeriodForDate(cyclelist, todayStr) ?? '3') as PeriodKey;

  // 試合まで残り日数
  const meetDate   = new Date(plan.goal_meet_date);
  const daysToMeet = Math.max(0, daysBetween(targetDate, meetDate));

  // 強度ガード計算
  const guard = calcIntensityGuard(daysToMeet);

  // 直近セッション
  const recentSessions: RecentSession[] = (recentRaw.data ?? []).map(r => ({
    date:          r.scheduled_date as string,
    distance_m:    r.actual_distance_m as number | null,
    fatigue_after: r.fatigue_after as (1 | 2 | 3 | 4 | 5) | null,
    period:        (r.override_period ?? r.ai_suggested_period) as PeriodKey | null,
    status:        r.status as 'planned' | 'done' | 'skipped',
    athlete_note:  r.athlete_note as string | null,
  }));

  // 前回セッションからの経過日数
  const lastDone      = recentSessions.find(s => s.status === 'done');
  const daysSinceLast = lastDone ? daysBetween(new Date(lastDone.date), targetDate) : null;

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

  // 目標シート要約
  const gs = goalSheetResult.data;
  const goalContext = gs
    ? summarizeGoalSheet(gs.level as string, gs.content as Record<string, unknown>)
    : null;

  // 直近メニューのintention（重複防止・連続性確保用）
  const recentMenuIntentions = (recentMenusResult.data ?? [])
    .map(m => {
      const result = m.result as Record<string, unknown> | null;
      return (result?.intention as string | undefined) ?? null;
    })
    .filter((v): v is string => v !== null && v.length > 0);

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
    goal_context:             goalContext,
    recent_menu_intentions:   recentMenuIntentions,
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

  // 目標シート（選手が何を目指しているか）
  if (ctx.goal_context) {
    lines.push('【選手の目標・課題（目標シートより）】');
    lines.push(ctx.goal_context);
    lines.push('intentionには上記の目標・課題と今日の練習の接点を必ず言及すること。');
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
      const dist    = s.distance_m ? `${s.distance_m.toLocaleString()}m` : '未記録';
      const fatigue = s.fatigue_after ? `疲労${s.fatigue_after}` : '';
      const period  = s.period ? `期${s.period}` : '';
      const note    = s.athlete_note ? ` ／ 選手メモ:「${s.athlete_note}」` : '';
      lines.push(`  ${s.date}: ${s.status === 'done' ? `${dist} ${period} ${fatigue}${note}` : s.status}`);
    });
  }

  if (ctx.weekly_volume_target_m) {
    const pct = Math.round((ctx.weekly_volume_done_m / ctx.weekly_volume_target_m) * 100);
    lines.push(`今週の達成率: ${ctx.weekly_volume_done_m.toLocaleString()}m / 目標${ctx.weekly_volume_target_m.toLocaleString()}m（${pct}%）`);
  }

  lines.push('上記の文脈を踏まえ、選手の状態に連続性のある練習内容を生成すること。');

  // 直近メニューのintention（重複防止）
  if (ctx.recent_menu_intentions.length > 0) {
    lines.push('');
    lines.push('【直近の練習テーマ（重複禁止・必ず異なる切り口で生成すること）】');
    ctx.recent_menu_intentions.forEach((intention, i) => {
      lines.push(`  ${i + 1}回前: ${intention}`);
    });
    lines.push('上記と同じ軸・テーマ・フレーズは使わないこと。感覚軸/技術軸/強度軸/タイミング軸のうち、まだ使っていない軸を選んで設計すること。');
  }

  return lines.join('\n');
}
