/**
 * 試合日 → 期（①〜⑦）自動配分アルゴリズム
 * RT Japan 公式ピリオダイゼーション準拠
 *
 * 設計方針：
 * - コーチが決めた start_date / goal_meet_date を受け取り、週ごとに期を割り当てる
 * - コーチはここで決まった配分を UI 上で自由に変更できる（提案に過ぎない）
 */

import type { PeriodKey, PeriodAllocation } from '@/types/training';

// 試合日からさかのぼった日数で期を決める（suggestPeriod の逆）
// 各期の「試合日までの残り日数」ウィンドウ
const PERIOD_WINDOWS: { period: PeriodKey; minDays: number; maxDays: number; baseWeeklyVolume: number }[] = [
  { period: '7', minDays: 0,   maxDays: 7,   baseWeeklyVolume: 8000  }, // テーパー
  { period: '6', minDays: 7,   maxDays: 21,  baseWeeklyVolume: 14000 }, // 調整
  { period: '5', minDays: 21,  maxDays: 42,  baseWeeklyVolume: 18000 }, // 耐乳酸
  { period: '4', minDays: 42,  maxDays: 70,  baseWeeklyVolume: 22000 }, // SL強化
  { period: '3', minDays: 70,  maxDays: 105, baseWeeklyVolume: 24000 }, // 発展形成
  { period: '2', minDays: 105, maxDays: 140, baseWeeklyVolume: 22000 }, // 基礎形成
  { period: '1', minDays: 140, maxDays: Infinity, baseWeeklyVolume: 16000 }, // リカバリー
];

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function toISODate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

/**
 * メイン関数：計画の start_date と goal_meet_date から期配分を生成する
 */
export function allocatePeriods(
  startDateStr: string,
  goalMeetDateStr: string,
): PeriodAllocation[] {
  const startDate   = new Date(startDateStr);
  const meetDate    = new Date(goalMeetDateStr);
  const totalDays   = daysBetween(startDate, meetDate);

  if (totalDays <= 0) return [];

  const allocations: PeriodAllocation[] = [];

  // 試合日から逆順に期を割り当てる
  // 各日付が「試合まで何日か」で期を決定
  let cursor = new Date(startDate);

  while (cursor < meetDate) {
    const daysLeft = daysBetween(cursor, meetDate);
    const window   = PERIOD_WINDOWS.find(w => daysLeft > w.minDays && daysLeft <= w.maxDays)
                  ?? PERIOD_WINDOWS[PERIOD_WINDOWS.length - 1];

    // この期が終わる日 = 「minDays 前」= meetDate - minDays
    // ただし startDate より前にはならない、かつ meetDate を超えない
    const periodEndIdeal = addDays(meetDate, -window.minDays);
    const periodEnd      = periodEndIdeal < meetDate ? periodEndIdeal : meetDate;

    // cursor から periodEnd まで（同じ期が連続するなら1つのブロックにまとめる）
    if (periodEnd <= cursor) {
      cursor = addDays(cursor, 7);
      continue;
    }

    const weeks = Math.max(1, Math.round(daysBetween(cursor, periodEnd) / 7));

    allocations.push({
      period:                 window.period,
      start_date:             toISODate(cursor),
      end_date:               toISODate(periodEnd),
      weeks,
      target_weekly_volume_m: window.baseWeeklyVolume,
    });

    cursor = new Date(periodEnd);
  }

  // 同一期が複数エントリに分かれた場合をマージ
  return mergeSamePeriods(allocations);
}

function mergeSamePeriods(allocations: PeriodAllocation[]): PeriodAllocation[] {
  const merged: PeriodAllocation[] = [];
  for (const a of allocations) {
    const last = merged[merged.length - 1];
    if (last && last.period === a.period) {
      last.end_date  = a.end_date;
      last.weeks    += a.weeks;
    } else {
      merged.push({ ...a });
    }
  }
  return merged;
}

/**
 * 指定日が属する期を計画サイクルから取得する
 */
export function getPeriodForDate(
  cycles: { period: PeriodKey; start_date: string; end_date: string }[],
  dateStr: string,
): PeriodKey | null {
  const date = new Date(dateStr);
  const cycle = cycles.find(c => {
    const s = new Date(c.start_date);
    const e = new Date(c.end_date);
    return date >= s && date <= e;
  });
  return cycle?.period ?? null;
}
