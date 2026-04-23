'use client';

import { PERIOD_META } from '@/types/training';
import type { TrainingCycle, TrainingSession, PeriodKey, SecondaryMeet } from '@/types/training';

interface Props {
  cycles:          TrainingCycle[];
  sessions:        TrainingSession[];
  meetDate:        string;
  meetName:        string | null;
  secondaryMeets?: SecondaryMeet[];
}

function daysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((new Date(dateStr).getTime() - today.getTime()) / 86400000);
}

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' });
}

const FATIGUE_EMOJI = ['', '😊', '🙂', '😐', '😓', '😵'];

export function PlanTimeline({ cycles, sessions, meetDate, meetName, secondaryMeets = [] }: Props) {
  const daysLeft = daysUntil(meetDate);
  const todayStr = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-3">
      {/* 試合日バナー（Aマーク） */}
      <div className="rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 px-5 py-4 flex items-center gap-4">
        <div className="text-3xl">🏆</div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">メインの試合（Aマーク）</p>
          <p className="text-base font-bold text-slate-900 truncate">{meetName ?? '目標試合'}</p>
          <p className="text-sm text-amber-700 font-semibold">
            {fmtDate(meetDate)} — あと <strong className="text-amber-900">{daysLeft}日</strong>
          </p>
        </div>
        {daysLeft <= 7 && (
          <div className="shrink-0 px-3 py-1.5 bg-amber-500 text-white text-xs font-bold rounded-xl animate-pulse">
            最終調整中
          </div>
        )}
      </div>

      {/* 準備試合バナー（B/Cマーク） */}
      {secondaryMeets.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {secondaryMeets
            .sort((a, b) => a.date.localeCompare(b.date))
            .map((m, i) => {
              const d = daysUntil(m.date);
              const isPast = d < 0;
              return (
                <div
                  key={i}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold ${
                    isPast
                      ? 'bg-slate-50 border-slate-200 text-slate-400'
                      : 'bg-violet-50 border-violet-200 text-violet-700'
                  }`}
                >
                  <span>{isPast ? '済' : '準備'}</span>
                  <span>{m.name}</span>
                  <span className="opacity-70">{fmtDate(m.date)}</span>
                  {!isPast && <span className="opacity-60">あと{d}日</span>}
                </div>
              );
            })}
        </div>
      )}

      {/* 期サイクル一覧 */}
      <div className="space-y-2">
        {cycles
          .slice()
          .sort((a, b) => a.start_date.localeCompare(b.start_date))
          .map(cycle => {
            const meta     = PERIOD_META[cycle.period as PeriodKey];
            const isActive = cycle.start_date <= todayStr && cycle.end_date >= todayStr;
            const isPast   = cycle.end_date < todayStr;
            const cycleSessions = sessions.filter(
              s => s.scheduled_date >= cycle.start_date && s.scheduled_date <= cycle.end_date,
            );
            const doneSessions = cycleSessions.filter(s => s.status === 'done');
            const done     = doneSessions.length;
            const total    = cycleSessions.length;
            const pct      = total > 0 ? Math.round((done / total) * 100) : 0;
            const totalDist = doneSessions.reduce((sum, s) => sum + (s.actual_distance_m ?? 0), 0);

            return (
              <div
                key={cycle.id}
                className={`rounded-xl border overflow-hidden transition-all ${
                  isActive
                    ? `${meta.borderColor} shadow-md`
                    : isPast
                    ? 'border-slate-200 opacity-60'
                    : 'border-slate-200'
                }`}
              >
                {/* 期ヘッダー */}
                <div className={`px-4 py-2.5 flex items-center gap-2 ${meta.color}`}>
                  <div className={`text-xs font-bold px-2 py-0.5 rounded-lg bg-white/60 ${meta.textColor}`}>
                    期{cycle.period} {meta.label}
                  </div>
                  {isActive && (
                    <span className="text-[10px] font-bold bg-white/80 px-2 py-0.5 rounded-full text-slate-600">
                      ◉ 現在
                    </span>
                  )}
                  <span className={`text-[10px] ${meta.textColor} opacity-60 hidden sm:inline`}>{meta.description}</span>
                  <div className="ml-auto text-xs text-slate-500">
                    {fmtDate(cycle.start_date)} 〜 {fmtDate(cycle.end_date)}
                  </div>
                </div>

                {/* 期内容 */}
                <div className="px-4 py-3 bg-white space-y-2">
                  {/* 統計行 */}
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span className="font-semibold text-slate-700">{done}/{total}回</span>
                    {totalDist > 0 && (
                      <span className="text-emerald-600 font-semibold">{(totalDist / 1000).toFixed(1)}km</span>
                    )}
                    {cycle.target_weekly_volume_m && (
                      <span className="ml-auto">週間目標 {(cycle.target_weekly_volume_m / 1000).toFixed(0)}km</span>
                    )}
                  </div>

                  {/* 進捗バー */}
                  {total > 0 && (
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-cyan-400 to-teal-400 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  )}

                  {/* セッション一覧 */}
                  {cycleSessions.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      {cycleSessions
                        .slice()
                        .sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date))
                        .map(s => {
                          const isToday = s.scheduled_date === todayStr;
                          const isDone  = s.status === 'done';
                          const isSkip  = s.status === 'skipped';
                          return (
                            <div
                              key={s.id}
                              title={`${s.scheduled_date}${s.actual_distance_m ? ` ${s.actual_distance_m.toLocaleString()}m` : ''}`}
                              className={`px-2 py-1 rounded-lg text-[10px] font-semibold border leading-tight ${
                                isDone
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : isSkip
                                  ? 'bg-slate-100 text-slate-400 border-slate-200 line-through'
                                  : isToday
                                  ? 'bg-cyan-50 text-cyan-700 border-cyan-300 ring-1 ring-cyan-300'
                                  : 'bg-blue-50 text-blue-600 border-blue-200'
                              }`}
                            >
                              <div>{fmtDate(s.scheduled_date)}</div>
                              {isDone && s.actual_distance_m && (
                                <div className="opacity-80">{(s.actual_distance_m / 1000).toFixed(1)}km {s.fatigue_after ? FATIGUE_EMOJI[s.fatigue_after] : ''}</div>
                              )}
                              {isDone && !s.actual_distance_m && s.fatigue_after && (
                                <div>{FATIGUE_EMOJI[s.fatigue_after]}</div>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  )}

                  {/* セッションなし */}
                  {cycleSessions.length === 0 && !isPast && (
                    <p className="text-[10px] text-slate-400">練習記録がまだありません</p>
                  )}
                </div>
              </div>
            );
          })}
      </div>

      {/* 今日の記録がない場合 */}
      {!sessions.some(s => s.scheduled_date === todayStr) && (
        <p className="text-xs text-center text-slate-400 py-1">
          今日（{fmtDate(todayStr)}）の練習はまだ記録されていません
        </p>
      )}
    </div>
  );
}
