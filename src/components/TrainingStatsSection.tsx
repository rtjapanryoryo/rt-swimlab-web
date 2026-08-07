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
  result?: {
    mainM?: number;
    generationContext?: {
      mainSetTimeMinutes?: number;
    };
  };
};

function getMenuDistance(menu: MenuData): number {
  const mainSetDistance = Number(menu.result?.mainM);
  const isMainSetOnly =
    menu.source === 'custom' &&
    Number(menu.result?.generationContext?.mainSetTimeMinutes) > 0 &&
    Number.isFinite(mainSetDistance) &&
    mainSetDistance > 0;

  // 新しいcustom生成は全体練習距離を持たないため、メインセット合計を活動距離として扱います。
  return isMainSetOnly
    ? mainSetDistance
    : parseInt(menu.input?.distance ?? '0', 10) || 0;
}

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

function calcStrokeDistribution(menus: MenuData[]): { stroke: string; count: number; pct: number }[] {
  const counts: Record<string, number> = {};
  menus.forEach((m) => {
    const s = m.input?.stroke ?? 'Fr';
    counts[s] = (counts[s] ?? 0) + 1;
  });
  const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;
  return Object.entries(counts)
    .map(([stroke, count]) => ({ stroke, count, pct: Math.round((count / total) * 100) }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
}

function calcPeriodDistribution(menus: MenuData[]): { period: string; count: number; pct: number }[] {
  const PERIOD_LABELS: Record<string, string> = {
    '1': 'リカバリー', '2': '基礎形成', '3': '発展形成',
    '4': '強化SL', '5': '強化AN', '6': '調整', '7': 'テーパー',
  };
  const counts: Record<string, number> = {};
  menus.forEach((m) => {
    const p = m.input?.period ?? '2';
    counts[p] = (counts[p] ?? 0) + 1;
  });
  const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;
  return Object.entries(counts)
    .map(([period, count]) => ({ period: PERIOD_LABELS[period] ?? `期${period}`, count, pct: Math.round((count / total) * 100) }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
}

function calcMonthlyStats(menus: MenuData[]) {
  const now = new Date();
  const monthStart = toDateStr(new Date(now.getFullYear(), now.getMonth(), 1));
  const thisMonth = menus.filter((m) => parseLocalDate(m.created_at) >= monthStart);
  const count = thisMonth.length;
  const days = new Set(thisMonth.map((m) => parseLocalDate(m.created_at))).size;
  const distance = thisMonth.reduce((sum, menu) => sum + getMenuDistance(menu), 0);
  return { count, days, distance };
}

type CalendarDay = {
  date: string | null;
  day: number | null;
  count: number;
  isToday: boolean;
  isFuture: boolean;
};

function genMonthCalendar(menus: MenuData[]): { days: CalendarDay[]; year: number; month: number } {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const today = toDateStr(now);

  const countByDate: Record<string, number> = {};
  menus.forEach((m) => {
    const date = parseLocalDate(m.created_at);
    countByDate[date] = (countByDate[date] ?? 0) + 1;
  });

  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // 月曜始まり (0=月, 6=日)
  const rawDow = firstDay.getDay(); // 0=Sun
  const startOffset = rawDow === 0 ? 6 : rawDow - 1;

  const days: CalendarDay[] = [];

  for (let i = 0; i < startOffset; i++) {
    days.push({ date: null, day: null, count: 0, isToday: false, isFuture: false });
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    days.push({
      date: dateStr,
      day: d,
      count: countByDate[dateStr] ?? 0,
      isToday: dateStr === today,
      isFuture: dateStr > today,
    });
  }

  return { days, year, month };
}

const BADGES = [
  { id: 'first', label: '初生成', icon: '🎯', threshold: 1, from: 'from-cyan-400', to: 'to-teal-400' },
  { id: 'five', label: '5回達成', icon: '⚡', threshold: 5, from: 'from-yellow-400', to: 'to-orange-400' },
  { id: 'ten', label: '10回達成', icon: '🔥', threshold: 10, from: 'from-orange-400', to: 'to-red-500' },
  { id: 'twentyfive', label: '25回達成', icon: '🏆', threshold: 25, from: 'from-violet-400', to: 'to-purple-500' },
  { id: 'fifty', label: '50回達成', icon: '💎', threshold: 50, from: 'from-blue-400', to: 'to-cyan-500' },
  { id: 'hundred', label: '100回達成', icon: '👑', threshold: 100, from: 'from-amber-400', to: 'to-yellow-300' },
];

const MONTH_NAMES = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
const DOW_LABELS = ['月', '火', '水', '木', '金', '土', '日'];

function DayCell({ cell }: { cell: CalendarDay }) {
  if (!cell.date || cell.day === null) {
    return <div className="h-7" />;
  }
  if (cell.isFuture) {
    return (
      <div className="h-7 flex items-center justify-center">
        <span className="text-[10px] text-slate-200">{cell.day}</span>
      </div>
    );
  }

  const hasPractice = cell.count > 0;
  const bg = hasPractice
    ? cell.count >= 3
      ? 'bg-teal-500'
      : cell.count === 2
      ? 'bg-cyan-500'
      : 'bg-cyan-300'
    : cell.isToday
    ? 'bg-transparent'
    : 'bg-slate-100';

  const textColor = hasPractice ? 'text-white' : cell.isToday ? 'text-cyan-600' : 'text-slate-400';
  const ring = cell.isToday ? 'ring-1 ring-cyan-400' : '';

  return (
    <div
      className={`h-7 flex items-center justify-center rounded-md ${bg} ${ring} transition-all`}
      title={hasPractice ? `${cell.date}：${cell.count}回生成` : cell.isToday ? '今日' : cell.date ?? ''}
    >
      <span className={`text-[10px] font-semibold ${textColor}`}>{cell.day}</span>
    </div>
  );
}

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
  const { count: monthlyCount, days: activeDays, distance: monthlyDist } = calcMonthlyStats(menus);
  const { days: calDays, year, month } = genMonthCalendar(menus);
  const strokeDist = calcStrokeDistribution(menus);
  const periodDist = calcPeriodDistribution(menus);

  const nextBadge = BADGES.find((b) => totalCount < b.threshold);
  const STROKE_COLORS: Record<string, string> = {
    Fr: 'bg-cyan-500', Ba: 'bg-blue-500', Br: 'bg-teal-500', Fly: 'bg-violet-500', IM: 'bg-orange-500',
  };

  if (loading) {
    return (
      <section className="dashboard-card overflow-hidden">
        <div className="px-6 py-5 border-b border-cyan-100/80 flex items-center gap-2">
          <span className="w-2 h-6 rounded-full bg-gradient-to-b from-cyan-400 to-teal-500" />
          <h2 className="text-sm font-bold text-slate-800 tracking-wide">今月のアクティビティ</h2>
        </div>
        <div className="p-6 animate-pulse space-y-4">
          <div className="h-48 rounded-2xl bg-slate-100" />
          <div className="grid grid-cols-3 gap-3">
            {[0, 1, 2].map((i) => <div key={i} className="h-16 rounded-xl bg-slate-100" />)}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="dashboard-card overflow-hidden">
      {/* ヘッダー */}
      <div className="px-5 py-3 border-b border-cyan-100/80 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2 h-6 rounded-full bg-gradient-to-b from-cyan-400 to-teal-500" />
          <h2 className="text-sm font-bold text-slate-800 tracking-wide">今月のアクティビティ</h2>
        </div>
        <span className="text-xs text-slate-400 font-medium">
          {MONTH_NAMES[month]}
        </span>
      </div>

      <div className="p-4 space-y-4">

        {/* ─── カレンダー ─── */}
        <div>
          <div className="grid grid-cols-7 gap-0.5 mb-0.5">
            {DOW_LABELS.map((d, i) => (
              <div key={i} className={`text-center text-[9px] font-bold ${i >= 5 ? 'text-slate-300' : 'text-slate-400'}`}>
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-0.5">
            {calDays.map((cell, i) => (
              <DayCell key={i} cell={cell} />
            ))}
          </div>
          <div className="flex items-center gap-2 mt-1.5 justify-end">
            {[
              { bg: 'bg-slate-100', label: 'なし' },
              { bg: 'bg-cyan-300',  label: '1回' },
              { bg: 'bg-cyan-500',  label: '2回' },
              { bg: 'bg-teal-500',  label: '3回+' },
            ].map(({ bg, label }) => (
              <div key={label} className="flex items-center gap-0.5">
                <div className={`w-2.5 h-2.5 rounded-sm ${bg}`} />
                <span className="text-[9px] text-slate-400">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ─── 今月サマリー ─── */}
        <div className="grid grid-cols-3 gap-2 pt-1 border-t border-cyan-100/60">
          <div className="text-center py-1.5">
            <div className="text-lg font-black text-cyan-600 tabular-nums">{monthlyCount}</div>
            <div className="text-[10px] text-slate-500 font-medium">今月の生成回数</div>
          </div>
          <div className="text-center py-1.5 border-x border-cyan-100/60">
            <div className="text-lg font-black text-teal-600 tabular-nums">{activeDays}</div>
            <div className="text-[10px] text-slate-500 font-medium">練習した日数</div>
          </div>
          <div className="text-center py-1.5">
            <div className="text-lg font-black text-violet-600 tabular-nums leading-tight">
              {monthlyDist >= 1000
                ? `${(monthlyDist / 1000).toFixed(1)}`
                : `${monthlyDist}`}
            </div>
            <div className="text-[10px] text-slate-500 font-medium">
              {monthlyDist >= 1000 ? '合計距離 (km)' : '合計距離 (m)'}
            </div>
          </div>
        </div>

        {/* ─── ストリーク ─── */}
        {streak > 0 && (
          <div className={`flex items-center gap-2.5 px-3.5 py-2 rounded-xl border ${
            streak >= 3
              ? 'bg-gradient-to-r from-orange-50 to-amber-50 border-orange-200'
              : 'bg-slate-50 border-slate-200'
          }`}>
            <span className="text-lg">{streak >= 3 ? '🔥' : '✅'}</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-sm font-bold text-slate-800">{streak}日間 連続練習中！</span>
              <span className="text-[10px] text-slate-400">この調子で続けましょう</span>
            </div>
          </div>
        )}

        {/* ─── アチーブメント ─── */}
        <div className="pt-1 border-t border-cyan-100/60">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">アチーブメント</p>
            <p className="text-[10px] text-slate-400">
              {BADGES.filter((b) => totalCount >= b.threshold).length}/{BADGES.length}
            </p>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {BADGES.map((badge) => {
              const unlocked = totalCount >= badge.threshold;
              const isNext = !unlocked && badge === nextBadge;
              const remaining = badge.threshold - totalCount;
              return (
                <div
                  key={badge.id}
                  className={`flex-shrink-0 flex flex-col items-center gap-1 w-[68px] py-2 rounded-2xl border-2 transition-all ${
                    unlocked
                      ? `border-transparent bg-gradient-to-br ${badge.from} ${badge.to} shadow-md`
                      : isNext
                      ? 'border-cyan-200 bg-cyan-50/80'
                      : 'border-slate-100 bg-slate-50'
                  }`}
                >
                  <span className={`text-xl leading-none ${!unlocked && !isNext ? 'grayscale opacity-30' : ''}`}>
                    {badge.icon}
                  </span>
                  <span className={`text-[10px] font-bold text-center leading-tight px-0.5 ${
                    unlocked ? 'text-white' : isNext ? 'text-cyan-700' : 'text-slate-400'
                  }`}>
                    {badge.label}
                  </span>
                  <span className={`text-[9px] font-medium ${
                    unlocked ? 'text-white/70' : isNext ? 'text-cyan-500 font-bold' : 'text-slate-300'
                  }`}>
                    {unlocked ? '達成！' : isNext ? `あと${remaining}回` : `${badge.threshold}回`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ─── データ分布 ─── */}
        {menus.length >= 3 && (
          <div className="pt-1 border-t border-cyan-100/60 space-y-4">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">練習データ分析</p>

            {/* 種目分布 */}
            {strokeDist.length > 0 && (
              <div>
                <p className="text-[10px] text-slate-400 mb-1.5">種目別</p>
                <div className="space-y-1.5">
                  {strokeDist.map((d) => (
                    <div key={d.stroke} className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-slate-600 w-6">{d.stroke}</span>
                      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${STROKE_COLORS[d.stroke] ?? 'bg-slate-400'} transition-all`}
                          style={{ width: `${d.pct}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-slate-500 tabular-nums w-8 text-right">{d.pct}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 期分布 */}
            {periodDist.length > 0 && (
              <div>
                <p className="text-[10px] text-slate-400 mb-1.5">期別</p>
                <div className="space-y-1.5">
                  {periodDist.map((d) => (
                    <div key={d.period} className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-slate-600 w-14 truncate">{d.period}</span>
                      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-teal-400 transition-all"
                          style={{ width: `${d.pct}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-slate-500 tabular-nums w-8 text-right">{d.pct}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
