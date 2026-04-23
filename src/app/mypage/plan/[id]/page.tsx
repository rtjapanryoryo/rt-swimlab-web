'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { PlanTimeline } from '@/components/PlanTimeline';
import { PERIOD_META } from '@/types/training';
import type { TrainingPlan, TrainingCycle, TrainingSession, TodaySuggestion } from '@/types/training';

interface PlanDetail extends TrainingPlan {
  training_cycles:  TrainingCycle[];
  training_sessions: TrainingSession[];
}

const FATIGUE_LABEL = ['', '快調', '良好', '普通', '疲労', '限界'];
const FATIGUE_COLOR = ['', 'text-emerald-600', 'text-teal-600', 'text-slate-600', 'text-orange-600', 'text-red-600'];

export default function PlanDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router  = useRouter();

  const [plan,         setPlan]         = useState<PlanDetail | null>(null);
  const [loading,      setLoading]      = useState(true);
  const [todaySugg,    setTodaySugg]    = useState<TodaySuggestion | null>(null);
  const [logDate,      setLogDate]      = useState(new Date().toISOString().slice(0, 10));
  const [fatigue,      setFatigue]      = useState<number>(3);
  const [distActual,   setDistActual]   = useState('');
  const [athleteNote,  setAthleteNote]  = useState('');
  const [saving,       setSaving]       = useState(false);
  const [showCoachMemo, setShowCoachMemo] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch(`/api/training/plans/${id}`, { credentials: 'include' }).then(r => r.json()),
      fetch(`/api/training/today?plan_id=${id}`, { credentials: 'include' })
        .then(r => r.json())
        .catch(() => null),
    ]).then(([planData, todayData]) => {
      setPlan(planData.plan ?? null);
      if (todayData?.suggestion) {
        setTodaySugg(todayData.suggestion);
      }
    }).finally(() => setLoading(false));
  }, [id]);

  const handleLogSession = async () => {
    if (!plan) return;
    setSaving(true);
    try {
      const existing = plan.training_sessions.find(s => s.scheduled_date === logDate);
      if (existing) {
        await fetch(`/api/training/sessions/${existing.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            status:            'done',
            actual_distance_m: distActual ? parseInt(distActual) : null,
            fatigue_after:     fatigue,
            athlete_note:      athleteNote || null,
          }),
        });
      } else {
        await fetch('/api/training/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            plan_id:           plan.id,
            scheduled_date:    logDate,
            status:            'done',
            actual_distance_m: distActual ? parseInt(distActual) : null,
            fatigue_after:     fatigue,
            athlete_note:      athleteNote || null,
          }),
        });
      }
      const res = await fetch(`/api/training/plans/${id}`, { credentials: 'include' });
      const d   = await res.json() as { plan: PlanDetail };
      setPlan(d.plan);
      setDistActual('');
      setAthleteNote('');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-500">計画が見つかりません</p>
        <button onClick={() => router.push('/mypage/plan')} className="mt-4 text-cyan-500 text-sm">← 一覧に戻る</button>
      </div>
    );
  }

  const periodMeta = todaySugg ? PERIOD_META[todaySugg.period] : null;

  return (
    <div className="space-y-5 max-w-2xl mx-auto">
      {/* ヘッダー */}
      <div className="flex items-start gap-3">
        <button onClick={() => router.push('/mypage/plan')} className="mt-1 text-slate-400 hover:text-slate-700 text-sm">←</button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-slate-900 truncate">{plan.name}</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {plan.goal_meet_name} — {new Date(plan.goal_meet_date).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
      </div>

      {/* 今日のおすすめ練習 */}
      {todaySugg && periodMeta ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className={`px-5 py-3 flex items-center gap-2 ${periodMeta.color}`}>
            <span className={`text-xs font-bold px-2.5 py-0.5 bg-white/60 rounded-lg ${periodMeta.textColor}`}>
              {periodMeta.label}
            </span>
            <span className={`text-xs ${periodMeta.textColor} opacity-70`}>{periodMeta.description}</span>
            <span className="ml-auto text-xs font-semibold text-slate-500">試合まで {todaySugg.days_to_meet}日</span>
          </div>

          <div className="px-5 py-4 space-y-3">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">今日のおすすめ練習</p>

            <div className="flex items-end gap-3">
              <div>
                <span className="text-4xl font-black text-slate-900">{todaySugg.distance_m.toLocaleString()}</span>
                <span className="text-sm text-slate-500 ml-1">m</span>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 font-semibold border border-slate-200 mb-1">
                {todaySugg.condition}
              </span>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">{todaySugg.reason}</p>

            {todaySugg.warning && (
              <div className="flex items-start gap-2 px-3 py-2.5 bg-amber-50 border border-amber-200 rounded-xl">
                <span className="text-amber-500 shrink-0 text-sm">⚠</span>
                <p className="text-xs text-amber-700">{todaySugg.warning}</p>
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setDistActual(String(todaySugg.distance_m))}
                className="flex-1 py-2.5 border border-slate-200 text-slate-700 text-sm font-semibold rounded-xl hover:bg-slate-50 transition-colors"
              >
                この距離を記録欄に入力
              </button>
              <button
                onClick={() => {
                  const p = new URLSearchParams({
                    plan_id:    plan.id,
                    from_story: '1',
                    period:     todaySugg.period,
                    distance:   String(todaySugg.distance_m),
                    condition:  todaySugg.condition,
                  });
                  router.push(`/mypage/menu?${p.toString()}`);
                }}
                className="flex-1 py-2.5 bg-gradient-to-r from-cyan-500 to-teal-500 text-white text-sm font-bold rounded-xl hover:from-cyan-400 hover:to-teal-400 transition-all shadow-sm shadow-cyan-500/20"
              >
                メニューを生成
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex justify-end">
          <button
            onClick={() => {
              const p = new URLSearchParams({ plan_id: plan.id, from_story: '1' });
              router.push(`/mypage/menu?${p.toString()}`);
            }}
            className="px-4 py-2 bg-cyan-500 text-white text-sm font-bold rounded-xl hover:bg-cyan-400 transition-colors"
          >
            メニューを生成
          </button>
        </div>
      )}

      {/* コーチメモ（折りたたみ） */}
      {plan.coach_memo && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 overflow-hidden">
          <button
            onClick={() => setShowCoachMemo(v => !v)}
            className="w-full px-4 py-3 flex items-center gap-2 text-left hover:bg-amber-100/50 transition-colors"
          >
            <span className="text-xs font-bold text-amber-700">コーチメモ</span>
            <span className="ml-auto text-amber-400 text-xs">{showCoachMemo ? '▲ 閉じる' : '▼ 確認する'}</span>
          </button>
          {showCoachMemo && (
            <div className="px-4 pb-4">
              <p className="text-xs text-amber-800 leading-relaxed whitespace-pre-wrap">{plan.coach_memo}</p>
            </div>
          )}
        </div>
      )}

      {/* タイムライン */}
      <PlanTimeline
        cycles={plan.training_cycles}
        sessions={plan.training_sessions}
        meetDate={plan.goal_meet_date}
        meetName={plan.goal_meet_name}
        secondaryMeets={plan.secondary_meets ?? []}
      />

      {/* 練習記録フォーム */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">練習を記録する</p>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">日付</label>
            <input type="date" value={logDate} onChange={e => setLogDate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">実施距離 (m)</label>
            <input
              type="number"
              value={distActual}
              onChange={e => setDistActual(e.target.value)}
              placeholder={todaySugg ? `おすすめ ${todaySugg.distance_m.toLocaleString()}m` : '例: 4000'}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400"
            />
          </div>
        </div>

        {/* 疲労度ボタン */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-2">
            練習後の疲労度：<span className={`font-bold ${FATIGUE_COLOR[fatigue]}`}>{FATIGUE_LABEL[fatigue]}</span>
          </label>
          <div className="grid grid-cols-5 gap-1.5">
            {([1, 2, 3, 4, 5] as const).map(v => (
              <button
                key={v}
                type="button"
                onClick={() => setFatigue(v)}
                className={`py-2 rounded-xl text-[11px] font-bold leading-tight transition-all ${
                  fatigue === v
                    ? 'bg-cyan-500 text-white shadow-md'
                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
              >
                {v}<br /><span className="font-normal">{FATIGUE_LABEL[v]}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">感想・メモ（任意）</label>
          <textarea
            value={athleteNote}
            onChange={e => setAthleteNote(e.target.value)}
            rows={2}
            placeholder="今日の練習の感想、気づき..."
            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400 resize-none"
          />
        </div>

        <button
          onClick={handleLogSession}
          disabled={saving}
          className="w-full py-3 bg-gradient-to-r from-cyan-500 to-teal-500 text-white font-bold rounded-xl hover:from-cyan-400 hover:to-teal-400 disabled:opacity-60 transition-all text-sm"
        >
          {saving ? '記録中…' : '練習を記録する'}
        </button>
      </div>
    </div>
  );
}
