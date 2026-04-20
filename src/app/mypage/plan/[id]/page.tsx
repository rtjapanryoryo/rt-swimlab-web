'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { PlanTimeline } from '@/components/PlanTimeline';
import type { TrainingPlan, TrainingCycle, TrainingSession } from '@/types/training';

interface PlanDetail extends TrainingPlan {
  training_cycles:  TrainingCycle[];
  training_sessions: TrainingSession[];
}

const FATIGUE_LABEL = ['', '快調', '良好', '普通', '疲労', '限界'];

export default function PlanDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router  = useRouter();

  const [plan,      setPlan]      = useState<PlanDetail | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [logDate,   setLogDate]   = useState(new Date().toISOString().slice(0, 10));
  const [fatigue,   setFatigue]   = useState<number>(3);
  const [distActual, setDistActual] = useState('');
  const [athleteNote, setAthleteNote] = useState('');
  const [saving,    setSaving]    = useState(false);

  useEffect(() => {
    fetch(`/api/training/plans/${id}`, { credentials: 'include' })
      .then(r => r.json())
      .then(d => setPlan(d.plan ?? null))
      .finally(() => setLoading(false));
  }, [id]);

  const handleLogSession = async () => {
    if (!plan) return;
    setSaving(true);
    try {
      // その日のセッションを取得 or 作成
      const existing = plan.training_sessions.find(s => s.scheduled_date === logDate);
      if (existing) {
        await fetch(`/api/training/sessions/${existing.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            status:           'done',
            actual_distance_m: distActual ? parseInt(distActual) : null,
            fatigue_after:    fatigue,
            athlete_note:     athleteNote || null,
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
      // リフレッシュ
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

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* ヘッダー */}
      <div className="flex items-start gap-3">
        <button onClick={() => router.push('/mypage/plan')} className="mt-1 text-slate-400 hover:text-slate-700 text-sm">←</button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-slate-900 truncate">{plan.name}</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {plan.goal_meet_name} — {new Date(plan.goal_meet_date).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <button
          onClick={() => {
            const p = new URLSearchParams({ plan_id: plan.id, from_story: '1' });
            router.push(`/mypage/menu?${p.toString()}`);
          }}
          className="shrink-0 px-4 py-2 bg-cyan-500 text-white text-sm font-bold rounded-xl hover:bg-cyan-400 transition-colors"
        >
          メニュー生成
        </button>
      </div>

      {/* タイムライン */}
      <PlanTimeline
        cycles={plan.training_cycles}
        sessions={plan.training_sessions}
        meetDate={plan.goal_meet_date}
        meetName={plan.goal_meet_name}
      />

      {/* 練習記録ログ */}
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
            <input type="number" value={distActual} onChange={e => setDistActual(e.target.value)}
              placeholder="例: 4000"
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400" />
          </div>
        </div>

        {/* 疲労度スライダー */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-2">
            練習後の疲労度：<span className="text-cyan-600 font-bold">{fatigue} — {FATIGUE_LABEL[fatigue]}</span>
          </label>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map(v => (
              <button
                key={v}
                type="button"
                onClick={() => setFatigue(v)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
                  fatigue === v
                    ? 'bg-cyan-500 text-white shadow-md'
                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
              >
                {v}
              </button>
            ))}
          </div>
          <div className="flex justify-between text-[10px] text-slate-400 mt-1 px-1">
            <span>快調</span><span>限界</span>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">感想・メモ（任意）</label>
          <textarea value={athleteNote} onChange={e => setAthleteNote(e.target.value)}
            rows={2} placeholder="今日の練習の感想、気づき..."
            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400 resize-none" />
        </div>

        <button onClick={handleLogSession} disabled={saving}
          className="w-full py-3 bg-gradient-to-r from-cyan-500 to-teal-500 text-white font-bold rounded-xl hover:from-cyan-400 hover:to-teal-400 disabled:opacity-60 transition-all text-sm">
          {saving ? '記録中…' : '練習を記録する'}
        </button>
      </div>
    </div>
  );
}
