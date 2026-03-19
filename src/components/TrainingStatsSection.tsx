'use client';

import { useState, useEffect, useCallback } from 'react';
import { useProfile } from '@/contexts/ProfileContext';

type MenuData = {
  id: string;
  created_at: string;
  source: string;
  input?: {
    distance?: string;
    stroke?: string;
    period?: string;
  };
};

function toDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parseLocalDate(isoStr: string): string {
  return toDateStr(new Date(isoStr));
}

function calcStreak(menus: MenuData[]): number {
  if (menus.length === 0) return 0;
  const dateSet = new Set(menus.map((m) => parseLocalDate(m.created_at)));
  const sorted = Array.from(dateSet).sort((a, b) => b.localeCompare(a));
  const today = toDateStr(new Date());
  const yesterday = toDateStr(new Date(Date.now() - 86400000));
  if (sorted[0] !== today && sorted[0] !== yesterday) return 0;
  let streak = 1;
  for (let i = 1; i < sorted.length; i++) {
    const diff = Math.round(
      (new Date(sorted[i - 1]).getTime() - new Date(sorted[i]).getTime()) / 86400000
    );
    if (diff === 1) streak++;
    else break;
  }
  return streak;
}

function calcMonthlyCount(menus: MenuData[]): number {
  const now = new Date();
  const monthStart = toDateStr(new Date(now.getFullYear(), now.getMonth(), 1));
  return menus.filter((m) => parseLocalDate(m.created_at) >= monthStart).length;
}

function calcMonthlyDistance(menus: MenuData[]): number {
  const now = new Date();
  const monthStart = toDateStr(new Date(now.getFullYear(), now.getMonth(), 1));
  return menus
    .filter((m) => parseLocalDate(m.created_at) >= monthStart)
    .reduce((sum, m) => sum + (parseInt(m.input?.distance ?? '0', 10) || 0), 0);
}

type HeatmapCell = { date: string; count: number; isFuture: boolean };
type HeatmapColumn = { week: HeatmapCell[]; monthLabel: string | null };

function genHeatmap(menus: MenuData[], weeksCount = 14): HeatmapColumn[] {
  const countByDate: Record<string, number> = {};
  menus.forEach((m) => {
    const date = parseLocalDate(m.created_at);
    countByDate[date] = (countByDate[date] ?? 0) + 1;
  });

  const today = new Date();
  const todayStr = toDateStr(today);
  const todayDow = today.getDay();

  const lastSunday = new Date(today);
  lastSunday.setDate(today.getDate() - todayDow);

  const firstSunday = new Date(lastSunday);
  firstSunday.setDate(lastSunday.getDate() - (weeksCount - 1) * 7);

  const MONTH_NAMES = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];

  const columns: HeatmapColumn[] = [];
  let prevMonth: number | null = null;

  for (let w = 0; w < weeksCount; w++) {
    const weekStart = new Date(firstSunday);
    weekStart.setDate(firstSunday.getDate() + w * 7);
    const week: HeatmapCell[] = [];

    for (let d = 0; d < 7; d++) {
      const day = new Date(weekStart);
      day.setDate(weekStart.getDate() + d);
      const dateStr = toDateStr(day);
      week.push({
        date: dateStr,
        count: countByDate[dateStr] ?? 0,
        isFuture: dateStr > todayStr,
      });
    }

    const thisMonth = weekStart.getMonth();
    const monthLabel = prevMonth !== thisMonth ? MONTH_NAMES[thisMonth] : null;
    prevMonth = thisMonth;

    columns.push({ week, monthLabel });
  }
  return columns;
}

function cellColor(count: number, isFuture: boolean): string {
  if (isFuture) return 'bg-transparent';
  if (count === 0) return 'bg-slate-100';
  if (count === 1) return 'bg-cyan-300';
  if (count === 2) return 'bg-cyan-500';
  return 'bg-teal-500';
}

const BADGES = [
  { id: 'first', label: '初生成', icon: '🎯', threshold: 1, from: 'from-cyan-400', to: 'to-teal-400' },
  { id: 'five', label: '5回達成', icon: '⚡', threshold: 5, from: 'from-yellow-400', to: 'to-orange-400' },
  { id: 'ten', label: '10回達成', icon: '🔥', threshold: 10, from: 'from-orange-400', to: 'to-red-500' },
  { id: 'twentyfive', label: '25回達成', icon: '🏆', threshold: 25, from: 'from-violet-400', to: 'to-purple-500' },
  { id: 'fifty', label: '50回達成', icon: '💎', threshold: 50, from: 'from-blue-400', to: 'to-cyan-500' },
  { id: 'hundred', label: '100回達成', icon: '👑', threshold: 100, from: 'from-amber-400', to: 'to-yellow-300' },
];

const DAY_LABELS = ['日', '月', '火', '水', '木', '金', '土'];

export function TrainingStatsSection() {
  const { profile } = useProfile();
  const [menus, setMenus] = useState<MenuData[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(() => {
    const from = toDateStr(new Date(Date.now() - 120 * 86400000));
    fetch(`/api/menus?from=${from}&limit=100`, { credentials: 'include' })
      .then(async (res) => {
        const data = await res.json();
        if (res.ok) setMenus(data.menus ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  useEffect(() => {
    const onSaved = () => fetchStats();
    window.addEventListener('menu-saved', onSaved);
    return () => window.removeEventListener('menu-saved', onSaved);
  }, [fetchStats]);

  const totalCount = profile?.total_usage_count ?? 0;
  const streak = calcStreak(menus);
  const monthlyCount = calcMonthlyCount(menus);
  const monthlyDist = calcMonthlyDistance(menus);
  const heatmap = genHeatmap(menus, 14);

  // 次のバッジ
  const nextBadge = BADGES.find((b) => totalCount < b.threshold);
  const nextBadgeRemaining = nextBadge ? nextBadge.threshold - totalCount : 0;

  if (loading) {
    return (
      <section className="dashboard-card overflow-hidden">
        <div className="px-6 py-5 border-b border-cyan-100/80 flex items-center gap-2">
          <span className="w-2 h-6 rounded-full bg-gradient-to-b from-cyan-400 to-teal-500" />
          <h2 className="text-sm font-bold text-slate-800 tracking-wide">トレーニング統計</h2>
        </div>
        <div className="p-6 animate-pulse space-y-4">
          <div className="grid grid-cols-3 gap-3">
            {[0, 1, 2].map((i) => <div key={i} className="h-28 rounded-2xl bg-slate-100" />)}
          </div>
          <div className="h-24 rounded-xl bg-slate-100" />
        </div>
      </section>
    );
  }

  return (
    <section className="dashboard-card overflow-hidden">
      <div className="px-6 py-5 border-b border-cyan-100/80 flex items-center gap-2">
        <span className="w-2 h-6 rounded-full bg-gradient-to-b from-cyan-400 to-teal-500" />
        <h2 className="text-sm font-bold text-slate-800 tracking-wide">トレーニング統計</h2>
      </div>

      <div className="p-6 space-y-7">

        {/* ─── 統計カード 3枚 ─── */}
        <div className="grid grid-cols-3 gap-3">

          {/* ストリーク */}
          <div className={`relative overflow-hidden rounded-2xl p-4 border transition-all ${
            streak >= 3
              ? 'bg-gradient-to-br from-orange-50 to-amber-50 border-orange-200 shadow-md shadow-orange-100'
              : 'bg-slate-50 border-slate-200'
          }`}>
            {streak >= 3 && (
              <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full bg-orange-300/20 blur-2xl pointer-events-none" />
            )}
            <div className="relative flex flex-col items-center text-center gap-1">
              <span className="text-2xl">{streak > 0 ? '🔥' : '💤'}</span>
              <div className={`text-3xl font-black tabular-nums leading-none ${streak > 0 ? 'text-orange-500' : 'text-slate-400'}`}>
                {streak}
              </div>
              <div className="text-xs font-bold text-slate-700">連続練習日</div>
              <div className="text-[10px] text-slate-400 leading-tight">
                {streak > 0 ? `${streak}日間継続中！` : '今日から再開しよう'}
              </div>
            </div>
          </div>

          {/* 今月の練習回数 */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-cyan-50 to-teal-50 border border-cyan-200 p-4">
            <div className="absolute -bottom-6 -right-6 w-20 h-20 rounded-full bg-cyan-200/30 blur-2xl pointer-events-none" />
            <div className="relative flex flex-col items-center text-center gap-1">
              <span className="text-2xl">📋</span>
              <div className="text-3xl font-black text-cyan-600 tabular-nums leading-none">{monthlyCount}</div>
              <div className="text-xs font-bold text-slate-700">今月の練習回数</div>
              <div className="text-[10px] text-slate-400 leading-tight">
                {monthlyDist > 0
                  ? `合計 ${monthlyDist >= 1000 ? `${(monthlyDist / 1000).toFixed(1)}km` : `${monthlyDist.toLocaleString()}m`}`
                  : 'メニュー生成回数'}
              </div>
            </div>
          </div>

          {/* 累計生成 */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-50 to-purple-50 border border-violet-200 p-4">
            <div className="absolute -bottom-6 -left-6 w-20 h-20 rounded-full bg-violet-200/30 blur-2xl pointer-events-none" />
            <div className="relative flex flex-col items-center text-center gap-1">
              <span className="text-2xl">🏊</span>
              <div className="text-3xl font-black text-violet-600 tabular-nums leading-none">{totalCount}</div>
              <div className="text-xs font-bold text-slate-700">累計生成回数</div>
              <div className="text-[10px] text-slate-400 leading-tight">
                {nextBadge ? `あと${nextBadgeRemaining}回で${nextBadge.icon}` : '全バッジ解放済み！'}
              </div>
            </div>
          </div>
        </div>

        {/* ─── アクティビティヒートマップ ─── */}
        <div>
          <div className="flex items-baseline justify-between mb-2">
            <p className="text-xs font-bold text-slate-600">練習アクティビティ</p>
            <p className="text-[10px] text-slate-400">過去14週間 ／ 1マス＝1日</p>
          </div>

          <div className="overflow-x-auto">
            <div className="min-w-min">
              {/* 月ラベル行 */}
              <div className="flex gap-[3px] mb-1 pl-5">
                {heatmap.map((col, wi) => (
                  <div key={wi} className="w-4 text-[9px] text-slate-400 font-medium whitespace-nowrap">
                    {col.monthLabel ?? ''}
                  </div>
                ))}
              </div>

              {/* グリッド本体 */}
              <div className="flex gap-[3px]">
                {/* 曜日ラベル */}
                <div className="flex flex-col gap-[3px] mr-1">
                  {DAY_LABELS.map((label, i) => (
                    <div key={i} className="w-4 h-4 text-[9px] text-slate-400 flex items-center justify-end leading-none pr-0.5">
                      {i % 2 === 1 ? label : ''}
                    </div>
                  ))}
                </div>

                {/* ヒートマップ列 */}
                {heatmap.map((col, wi) => (
                  <div key={wi} className="flex flex-col gap-[3px]">
                    {col.week.map((cell, di) => (
                      <div
                        key={di}
                        className={`w-4 h-4 rounded-[3px] ${cellColor(cell.count, cell.isFuture)} transition-colors`}
                        title={cell.isFuture ? '未来' : cell.count === 0 ? `${cell.date}：練習なし` : `${cell.date}：${cell.count}回生成`}
                      />
                    ))}
                  </div>
                ))}
              </div>

              {/* 凡例 */}
              <div className="flex items-center gap-1.5 mt-2 pl-5">
                <span className="text-[9px] text-slate-400">練習なし</span>
                {[
                  { cls: 'bg-slate-100', label: '0回' },
                  { cls: 'bg-cyan-300', label: '1回' },
                  { cls: 'bg-cyan-500', label: '2回' },
                  { cls: 'bg-teal-500', label: '3回以上' },
                ].map((item) => (
                  <div key={item.cls} className="flex items-center gap-0.5">
                    <div className={`w-4 h-4 rounded-[3px] ${item.cls}`} />
                    <span className="text-[9px] text-slate-400">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ─── アチーブメントバッジ ─── */}
        <div>
          <div className="flex items-baseline justify-between mb-3">
            <p className="text-xs font-bold text-slate-600">アチーブメント</p>
            <p className="text-[10px] text-slate-400">
              {BADGES.filter((b) => totalCount >= b.threshold).length} / {BADGES.length} 解放済み
            </p>
          </div>
          <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-hide">
            {BADGES.map((badge) => {
              const unlocked = totalCount >= badge.threshold;
              const isNext = !unlocked && badge === nextBadge;
              const remaining = badge.threshold - totalCount;

              return (
                <div
                  key={badge.id}
                  className={`flex-shrink-0 flex flex-col items-center gap-1.5 w-[72px] pt-3 pb-2.5 rounded-2xl border-2 transition-all duration-300 ${
                    unlocked
                      ? `border-transparent bg-gradient-to-br ${badge.from} ${badge.to} shadow-lg`
                      : isNext
                      ? 'border-cyan-200 bg-cyan-50/60'
                      : 'border-slate-100 bg-slate-50'
                  }`}
                >
                  <span className={`text-2xl leading-none ${!unlocked && !isNext ? 'grayscale opacity-40' : ''}`}>
                    {badge.icon}
                  </span>
                  <span className={`text-[10px] font-bold text-center leading-tight px-1 ${
                    unlocked ? 'text-white' : isNext ? 'text-cyan-700' : 'text-slate-400'
                  }`}>
                    {badge.label}
                  </span>
                  {unlocked ? (
                    <span className="text-[9px] text-white/70 font-medium">達成！</span>
                  ) : isNext ? (
                    <span className="text-[9px] text-cyan-500 font-bold">あと{remaining}回</span>
                  ) : (
                    <span className="text-[9px] text-slate-300">{badge.threshold}回</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </section>
  );
}
