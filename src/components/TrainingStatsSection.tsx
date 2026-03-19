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
    const prevMs = new Date(sorted[i - 1]).getTime();
    const currMs = new Date(sorted[i]).getTime();
    const diffDays = Math.round((prevMs - currMs) / 86400000);
    if (diffDays === 1) streak++;
    else break;
  }
  return streak;
}

function calcMonthlyDistance(menus: MenuData[]): number {
  const now = new Date();
  const monthStart = toDateStr(new Date(now.getFullYear(), now.getMonth(), 1));
  return menus
    .filter((m) => parseLocalDate(m.created_at) >= monthStart)
    .reduce((sum, m) => sum + (parseInt(m.input?.distance ?? '0', 10) || 0), 0);
}

function genHeatmap(menus: MenuData[], weeksCount = 14) {
  const countByDate: Record<string, number> = {};
  menus.forEach((m) => {
    const date = parseLocalDate(m.created_at);
    countByDate[date] = (countByDate[date] ?? 0) + 1;
  });

  const today = new Date();
  const todayStr = toDateStr(today);
  const todayDow = today.getDay(); // 0=Sun

  const lastSunday = new Date(today);
  lastSunday.setDate(today.getDate() - todayDow);

  const firstSunday = new Date(lastSunday);
  firstSunday.setDate(lastSunday.getDate() - (weeksCount - 1) * 7);

  const columns: Array<Array<{ date: string; count: number; isFuture: boolean }>> = [];
  for (let w = 0; w < weeksCount; w++) {
    const weekStart = new Date(firstSunday);
    weekStart.setDate(firstSunday.getDate() + w * 7);
    const week: Array<{ date: string; count: number; isFuture: boolean }> = [];
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
    columns.push(week);
  }
  return columns;
}

function cellColor(count: number, isFuture: boolean): string {
  if (isFuture) return 'bg-transparent border border-dashed border-slate-100';
  if (count === 0) return 'bg-slate-100';
  if (count === 1) return 'bg-cyan-300';
  if (count === 2) return 'bg-cyan-500';
  return 'bg-teal-500 shadow-sm shadow-teal-500/50';
}

const BADGES = [
  {
    id: 'first',
    label: '初生成',
    desc: 'First Step',
    icon: '🎯',
    threshold: 1,
    from: 'from-cyan-400',
    to: 'to-teal-400',
  },
  {
    id: 'five',
    label: '5回達成',
    desc: 'Getting Started',
    icon: '⚡',
    threshold: 5,
    from: 'from-yellow-400',
    to: 'to-orange-400',
  },
  {
    id: 'ten',
    label: '10回達成',
    desc: 'On Fire',
    icon: '🔥',
    threshold: 10,
    from: 'from-orange-400',
    to: 'to-red-500',
  },
  {
    id: 'twentyfive',
    label: '25回達成',
    desc: 'Committed',
    icon: '🏆',
    threshold: 25,
    from: 'from-violet-400',
    to: 'to-purple-500',
  },
  {
    id: 'fifty',
    label: '50回達成',
    desc: 'Dedicated',
    icon: '💎',
    threshold: 50,
    from: 'from-blue-400',
    to: 'to-cyan-500',
  },
  {
    id: 'hundred',
    label: '100回達成',
    desc: 'Legend',
    icon: '👑',
    threshold: 100,
    from: 'from-amber-400',
    to: 'to-yellow-300',
  },
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

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    const onMenuSaved = () => fetchStats();
    window.addEventListener('menu-saved', onMenuSaved);
    return () => window.removeEventListener('menu-saved', onMenuSaved);
  }, [fetchStats]);

  const totalCount = profile?.total_usage_count ?? 0;
  const streak = calcStreak(menus);
  const monthlyDist = calcMonthlyDistance(menus);
  const heatmap = genHeatmap(menus, 14);

  if (loading) {
    return (
      <section className="dashboard-card overflow-hidden">
        <div className="px-6 py-5 border-b border-cyan-100/80 flex items-center gap-2">
          <span className="w-2 h-6 rounded-full bg-gradient-to-b from-cyan-400 to-teal-500" />
          <h2 className="text-sm font-bold text-slate-800 tracking-wide">トレーニング統計</h2>
        </div>
        <div className="p-6 animate-pulse space-y-4">
          <div className="grid grid-cols-3 gap-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-24 rounded-2xl bg-slate-100" />
            ))}
          </div>
          <div className="h-20 rounded-xl bg-slate-100" />
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

      <div className="p-6 space-y-6">

        {/* ─── 統計カード 3枚 ─── */}
        <div className="grid grid-cols-3 gap-3">

          {/* ストリーク */}
          <div
            className={`relative overflow-hidden rounded-2xl p-4 text-center border transition-all ${
              streak >= 3
                ? 'bg-gradient-to-br from-orange-50 to-amber-50 border-orange-200 shadow-md shadow-orange-200/40'
                : 'bg-gradient-to-br from-slate-50 to-slate-100 border-slate-200'
            }`}
          >
            {streak >= 3 && (
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute -top-4 -right-4 w-16 h-16 rounded-full bg-orange-300/20 blur-xl" />
              </div>
            )}
            <div className="relative">
              <div className="text-2xl mb-1">{streak > 0 ? '🔥' : '💤'}</div>
              <div
                className={`text-3xl font-black tabular-nums ${
                  streak > 0 ? 'text-orange-500' : 'text-slate-400'
                }`}
              >
                {streak}
              </div>
              <div className="text-[10px] font-bold uppercase tracking-wider mt-1 text-slate-500">
                日連続
              </div>
            </div>
          </div>

          {/* 今月の距離 */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-cyan-50 to-teal-50 border border-cyan-200 p-4 text-center">
            <div className="absolute -bottom-4 -right-4 w-16 h-16 rounded-full bg-cyan-300/20 blur-xl pointer-events-none" />
            <div className="relative">
              <div className="text-2xl mb-1">📏</div>
              <div className="text-xl font-black text-cyan-600 tabular-nums leading-tight">
                {monthlyDist >= 1000
                  ? `${(monthlyDist / 1000).toFixed(1)}km`
                  : `${monthlyDist.toLocaleString()}m`}
              </div>
              <div className="text-[10px] font-bold uppercase tracking-wider mt-1 text-slate-500">
                今月の距離
              </div>
            </div>
          </div>

          {/* 累計生成 */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-50 to-purple-50 border border-violet-200 p-4 text-center">
            <div className="absolute -bottom-4 -left-4 w-16 h-16 rounded-full bg-violet-300/20 blur-xl pointer-events-none" />
            <div className="relative">
              <div className="text-2xl mb-1">🏊</div>
              <div className="text-3xl font-black text-violet-600 tabular-nums">{totalCount}</div>
              <div className="text-[10px] font-bold uppercase tracking-wider mt-1 text-slate-500">
                累計生成
              </div>
            </div>
          </div>
        </div>

        {/* ─── アクティビティヒートマップ ─── */}
        <div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
            アクティビティ <span className="font-normal text-slate-400 normal-case tracking-normal">（過去14週）</span>
          </p>
          <div className="overflow-x-auto pb-2">
            <div className="flex gap-[3px] min-w-min">
              {/* Day labels */}
              <div className="flex flex-col gap-[3px] mr-1 pt-0">
                {DAY_LABELS.map((label, i) => (
                  <div
                    key={i}
                    className="w-3 h-3 text-[8px] text-slate-400 flex items-center justify-end leading-none"
                  >
                    {i % 2 === 1 ? label : ''}
                  </div>
                ))}
              </div>
              {/* Heatmap grid */}
              {heatmap.map((week, wi) => (
                <div key={wi} className="flex flex-col gap-[3px]">
                  {week.map((cell, di) => (
                    <div
                      key={di}
                      className={`w-3 h-3 rounded-[2px] ${cellColor(cell.count, cell.isFuture)} transition-colors`}
                      title={cell.isFuture ? '' : `${cell.date}：${cell.count}回`}
                    />
                  ))}
                </div>
              ))}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-1.5 mt-2 justify-end pr-1">
              <span className="text-[9px] text-slate-400">少</span>
              {['bg-slate-100', 'bg-cyan-300', 'bg-cyan-500', 'bg-teal-500'].map((c, i) => (
                <div key={i} className={`w-3 h-3 rounded-[2px] ${c}`} />
              ))}
              <span className="text-[9px] text-slate-400">多</span>
            </div>
          </div>
        </div>

        {/* ─── アチーブメントバッジ ─── */}
        <div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
            アチーブメント
          </p>
          <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-hide">
            {BADGES.map((badge) => {
              const unlocked = totalCount >= badge.threshold;
              return (
                <div
                  key={badge.id}
                  className={`flex-shrink-0 flex flex-col items-center gap-1.5 w-16 py-3 rounded-2xl border-2 transition-all duration-300 ${
                    unlocked
                      ? `border-transparent bg-gradient-to-br ${badge.from} ${badge.to} shadow-lg`
                      : 'border-slate-100 bg-slate-50 grayscale opacity-40'
                  }`}
                >
                  <span className="text-xl leading-none">{badge.icon}</span>
                  <span
                    className={`text-[9px] font-bold text-center leading-tight px-1 ${
                      unlocked ? 'text-white' : 'text-slate-500'
                    }`}
                  >
                    {badge.label}
                  </span>
                  {unlocked && (
                    <span className="text-[8px] text-white/70 font-medium">
                      {badge.desc}
                    </span>
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
