'use client';

import { PERIOD_META } from '@/types/training';
import type { TrainingCycle, TrainingSession, PeriodKey } from '@/types/training';

interface Props {
  cycles:   TrainingCycle[];
  sessions: TrainingSession[];
  meetDate: string;
  meetName: string | null;
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
const STATUS_STYLE: Record<string, string> = {
  done:    'bg-emerald-100 text-emerald-700 border-emerald-200',
  planned: 'bg-blue-50 text-blue-600 border-blue-200',
  skipped: 'bg-slate-100 text-slate-500 border-slate-200',
};
const STATUS_LABEL: Record<string, string> = {
  done: '完了', planned: '予定', skipped: 'スキップ',
};

export function PlanTimeline({ cycles, sessions, meetDate, meetName }: Props) {
  const daysLeft  = daysUntil(meetDate);
  const todayStr  = new Date().toISOString().slice(0, 10);

  // セッションを日付でマップ化
  const sessionMap = new Map<string, TrainingSession>(
    sessions.map(s => [s.scheduled_date, s]),
  );

  return (
    <div className="space-y-4">
      {/* 試合日バナー */}
      <div className="rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 px-5 py-4 flex items-center gap-4">
        <div className="text-3xl">🏆</div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-amber-600 uppercase tracking-wider">目標試合</p>
          <p className="text-base font-bold text-slate-900 truncate">{meetName ?? '目標試合'}</p>
          <p className="text-sm text-amber-700 font-semibold">
            {fmtDate(meetDate)} —— あと <strong className="text-amber-900">{daysLeft}日</strong>
          </p>
        </div>
        {daysLeft <= 7 && (
          <div className="shrink-0 px-3 py-1.5 bg-amber-500 text-white text-xs font-bold rounded-xl animate-pulse">
            テーパー期
          </div>
        )}
      </div>

      {/* 期サイクル一覧 */}
      <div className="space-y-3">
        {cycles
          .slice()
          .sort((a, b) => a.start_date.localeCompare(b.start_date))
          .map(cycle => {
            const meta      = PERIOD_META[cycle.period as PeriodKey];
            const isActive  = cycle.start_date <= todayStr && cycle.end_date >= todayStr;
            const isPast    = cycle.end_date < todayStr;
            const cycleSessions = sessions.filter(
              s => s.scheduled_date >= cycle.start_date && s.scheduled_date <= cycle.end_date,
            );
            const done    = cycleSessions.filter(s => s.status === 'done').length;
            const total   = cycleSessions.length;
            const pct     = total > 0 ? Math.round((done / total) * 100) : 0;
            const totalDist = cycleSessions
              .filter(s => s.status === 'done')
              .reduce((sum, s) => sum + (s.actual_distance_m ?? 0), 0);

            return (
              <div
                key={cycle.id}
                className={`rounded-xl border overflow-hidden transition-all ${
                  isActive
                    ? `border-current ${meta.borderColor} shadow-md`
                    : isPast
                    ? 'border-slate-200 opacity-70'
                    : 'border-slate-200'
                }`}
              >
                {/* 期ヘッダー */}
                <div className={`px-4 py-3 flex items-center gap-3 ${meta.color}`}>
                  <div className={`text-sm font-bold px-2.5 py-0.5 rounded-lg bg-white/60 ${meta.textColor}`}>
                    期{cycle.period} {meta.short}
                  </div>
                  {isActive && (
                    <span className="text-[10px] font-bold bg-white/80 px-2 py-0.5 rounded-full text-slate-600">
                      ◉ 現在
                    </span>
                  )}
                  <div className="ml-auto text-xs text-slate-500">
                    {fmtDate(cycle.start_date)} 〜 {fmtDate(cycle.end_date)}
                  </div>
                </div>

                {/* 期統計 */}
                <div className="px-4 py-3 bg-white space-y-2">
                  <div className="flex items-center gap-3 text-xs text-slate-600">
                    <span>{done}/{total}回完了</span>
                    {totalDist > 0 && <span>{totalDist.toLocaleString()}m 累計</span>}
                    {cycle.target_weekly_volume_m && (
                      <span className="text-slate-400">週間目標{cycle.target_weekly_volume_m.toLocaleString()}m</span>
                    )}
                  </div>
                  {total > 0 && (
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-cyan-400 to-teal-400 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  )}

                  {/* セッションドット */}
                  {cycleSessions.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {cycleSessions
                        .slice()
                        .sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date))
                        .map(s => (
                          <div
                            key={s.id}
                            title={`${s.scheduled_date} ${STATUS_LABEL[s.status]}${s.actual_distance_m ? ` ${s.actual_distance_m.toLocaleString()}m` : ''}`}
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${STATUS_STYLE[s.status]}`}
                          >
                            {fmtDate(s.scheduled_date)}
                            {s.fatigue_after ? ` ${FATIGUE_EMOJI[s.fatigue_after]}` : ''}
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
      </div>

      {/* 未セッションの今日の行 */}
      {!sessionMap.has(todayStr) && (
        <p className="text-xs text-center text-slate-400 py-2">
          今日（{fmtDate(todayStr)}）の練習はまだ記録されていません
        </p>
      )}
    </div>
  );
}
