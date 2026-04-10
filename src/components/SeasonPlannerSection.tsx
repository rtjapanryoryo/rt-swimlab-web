'use client';

import { useState, useEffect } from 'react';
import { useProfile } from '@/contexts/ProfileContext';

const PERIODS = [
  { num: '1', label: 'リカバリー', short: '回復', color: 'from-slate-400 to-slate-500', bg: 'bg-slate-100', text: 'text-slate-600', desc: '疲労回復・基礎固め' },
  { num: '2', label: '基礎形成', short: '基礎', color: 'from-blue-400 to-blue-500', bg: 'bg-blue-50', text: 'text-blue-700', desc: '有酸素基盤・フォーム構築' },
  { num: '3', label: '発展形成', short: '発展', color: 'from-teal-400 to-teal-500', bg: 'bg-teal-50', text: 'text-teal-700', desc: 'EN強度・技術発展' },
  { num: '4', label: '強化 (SL)', short: 'SL強化', color: 'from-orange-400 to-orange-500', bg: 'bg-orange-50', text: 'text-orange-700', desc: 'スピード持久力強化' },
  { num: '5', label: '強化 (AN)', short: 'AN強化', color: 'from-red-400 to-red-500', bg: 'bg-red-50', text: 'text-red-700', desc: '耐乳酸・高強度' },
  { num: '6', label: '調整期', short: '調整', color: 'from-violet-400 to-violet-500', bg: 'bg-violet-50', text: 'text-violet-700', desc: 'レース調整・量を落とす' },
  { num: '7', label: 'テーパー', short: 'テーパー', color: 'from-amber-400 to-amber-500', bg: 'bg-amber-50', text: 'text-amber-700', desc: '最終調整・ピーキング' },
];

function daysUntil(dateStr: string): number {
  const target = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / 86400000);
}

function suggestPeriod(days: number): string {
  if (days <= 7)  return '7';
  if (days <= 21) return '6';
  if (days <= 42) return '5';
  if (days <= 70) return '4';
  if (days <= 105) return '3';
  if (days <= 140) return '2';
  return '1';
}

export function SeasonPlannerSection() {
  const { profile } = useProfile();
  const [raceDate, setRaceDate] = useState('');
  const [currentPeriod, setCurrentPeriod] = useState('');
  const [saved, setSaved] = useState(false);

  const userId = profile?.display_name ?? 'guest';

  useEffect(() => {
    const stored = localStorage.getItem(`rt-season-${userId}`);
    if (stored) {
      try {
        const d = JSON.parse(stored) as { raceDate?: string; currentPeriod?: string };
        queueMicrotask(() => {
          if (d.raceDate) setRaceDate(d.raceDate);
          if (d.currentPeriod) setCurrentPeriod(d.currentPeriod);
        });
      } catch { /* ignore */ }
    }
  }, [userId]);

  const handleSave = () => {
    localStorage.setItem(
      `rt-season-${userId}`,
      JSON.stringify({ raceDate, currentPeriod })
    );
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const days = raceDate ? daysUntil(raceDate) : null;
  const suggested = days !== null ? suggestPeriod(days) : null;
  const currentP = PERIODS.find((p) => p.num === currentPeriod);
  const suggestedP = PERIODS.find((p) => p.num === suggested);

  return (
    <section className="dashboard-card overflow-hidden">
      <div className="px-6 py-4 border-b border-cyan-100/80 flex items-center gap-2">
        <span className="w-2 h-6 rounded-full bg-gradient-to-b from-cyan-400 to-teal-500" />
        <h2 className="text-sm font-bold text-slate-800 tracking-wide">シーズン管理</h2>
      </div>

      <div className="p-5 space-y-5">

        {/* 期タイムライン */}
        <div>
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-3">トレーニング期</p>
          <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide">
            {PERIODS.map((p) => {
              const isCurrent = p.num === currentPeriod;
              return (
                <button
                  key={p.num}
                  onClick={() => setCurrentPeriod(p.num === currentPeriod ? '' : p.num)}
                  className={`flex-shrink-0 flex flex-col items-center gap-1 px-3 py-2.5 rounded-xl border-2 transition-all ${
                    isCurrent
                      ? `border-transparent bg-gradient-to-br ${p.color} text-white shadow-md`
                      : `${p.bg} border-transparent hover:border-slate-200`
                  }`}
                >
                  <span className={`text-xs font-black ${isCurrent ? 'text-white' : p.text}`}>
                    {['①','②','③','④','⑤','⑥','⑦'][parseInt(p.num)-1]}
                  </span>
                  <span className={`text-[10px] font-bold whitespace-nowrap ${isCurrent ? 'text-white' : p.text}`}>
                    {p.short}
                  </span>
                </button>
              );
            })}
          </div>
          {currentP && (
            <div className={`mt-2 px-3 py-2 rounded-xl ${currentP.bg} flex items-center gap-2`}>
              <span className={`text-xs font-bold ${currentP.text}`}>現在: {currentP.label}</span>
              <span className="text-[11px] text-slate-500">{currentP.desc}</span>
            </div>
          )}
        </div>

        {/* 目標レース日 */}
        <div>
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-2">目標レース日</p>
          <div className="flex gap-2 items-center">
            <input
              type="date"
              value={raceDate}
              onChange={(e) => setRaceDate(e.target.value)}
              className="flex-1 px-3 py-2 text-sm border-2 border-slate-200 rounded-xl focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 outline-none transition-colors"
            />
            <button
              onClick={handleSave}
              className="px-4 py-2 text-sm font-semibold bg-gradient-to-r from-cyan-500 to-teal-500 text-white rounded-xl shadow-md shadow-cyan-500/20 hover:from-cyan-400 hover:to-teal-400 transition-all"
            >
              {saved ? '✓ 保存' : '保存'}
            </button>
          </div>

          {/* レースまでのカウントダウン */}
          {days !== null && (
            <div className={`mt-3 px-4 py-3 rounded-xl border flex items-center justify-between ${
              days < 0 ? 'bg-slate-50 border-slate-200' :
              days <= 7 ? 'bg-red-50 border-red-200' :
              days <= 21 ? 'bg-orange-50 border-orange-200' :
              'bg-cyan-50 border-cyan-200'
            }`}>
              <div>
                <div className={`text-sm font-bold ${
                  days < 0 ? 'text-slate-500' :
                  days <= 7 ? 'text-red-600' :
                  days <= 21 ? 'text-orange-600' :
                  'text-cyan-700'
                }`}>
                  {days < 0 ? `レースから ${Math.abs(days)}日後` :
                   days === 0 ? '🏊 今日がレース当日！' :
                   `レースまで ${days}日`}
                </div>
                {days > 0 && (
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    約 {Math.ceil(days / 7)} 週間
                  </div>
                )}
              </div>
              {suggestedP && days > 0 && (
                <div className={`text-right`}>
                  <div className="text-[10px] text-slate-400 mb-0.5">推奨期</div>
                  <span className={`text-xs font-bold px-2 py-1 rounded-lg ${suggestedP.bg} ${suggestedP.text}`}>
                    {suggestedP.label}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
