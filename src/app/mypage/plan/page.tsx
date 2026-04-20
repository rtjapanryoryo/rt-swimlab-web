'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { PERIOD_META } from '@/types/training';
import type { TrainingPlan, TrainingCycle, TrainingSession, PeriodKey } from '@/types/training';

interface PlanWithRelations extends TrainingPlan {
  training_cycles: TrainingCycle[];
  training_sessions: Pick<TrainingSession, 'id' | 'scheduled_date' | 'status' | 'actual_distance_m' | 'fatigue_after'>[];
}

function daysUntil(dateStr: string): number {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return Math.ceil((new Date(dateStr).getTime() - today.getTime()) / 86400000);
}

function getCurrentPeriod(cycles: TrainingCycle[]): PeriodKey | null {
  const today = new Date().toISOString().slice(0, 10);
  return (cycles.find(c => c.start_date <= today && c.end_date >= today)?.period as PeriodKey) ?? null;
}

export default function PlanListPage() {
  const [plans,   setPlans]   = useState<PlanWithRelations[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/training/plans', { credentials: 'include' })
      .then(r => r.json())
      .then(d => setPlans(d.plans ?? []))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">トレーニング計画</h1>
          <p className="text-sm text-slate-500 mt-0.5">試合に向けたストーリーを管理します</p>
        </div>
        <Link href="/mypage/plan/new"
          className="px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-teal-500 text-white text-sm font-bold rounded-xl shadow-lg shadow-cyan-500/25 hover:from-cyan-400 hover:to-teal-400 transition-all">
          + 新しい計画
        </Link>
      </div>

      {plans.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 p-12 text-center">
          <p className="text-4xl mb-3">📅</p>
          <p className="text-base font-semibold text-slate-700">まだ計画がありません</p>
          <p className="text-sm text-slate-400 mt-1">試合日を登録してAIとともにシーズンを計画しましょう</p>
          <Link href="/mypage/plan/new"
            className="inline-block mt-5 px-6 py-3 bg-cyan-500 text-white font-bold rounded-xl hover:bg-cyan-400 transition-colors">
            最初の計画を作成
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {plans.map(plan => {
            const daysLeft     = daysUntil(plan.goal_meet_date);
            const currentPeriod = getCurrentPeriod(plan.training_cycles);
            const meta          = currentPeriod ? PERIOD_META[currentPeriod] : null;
            const doneSessions  = plan.training_sessions.filter(s => s.status === 'done');
            const totalDist     = doneSessions.reduce((s, ss) => s + (ss.actual_distance_m ?? 0), 0);

            return (
              <Link key={plan.id} href={`/mypage/plan/${plan.id}`}
                className="block bg-white rounded-2xl border border-slate-200 shadow-sm hover:border-cyan-300 hover:shadow-md transition-all p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-base font-bold text-slate-900 truncate">{plan.name}</p>
                      {plan.is_active && (
                        <span className="text-[10px] bg-cyan-100 text-cyan-700 px-2 py-0.5 rounded-full font-bold">進行中</span>
                      )}
                    </div>
                    <p className="text-sm text-slate-500 mt-0.5">
                      {plan.goal_meet_name ?? '目標試合'} — {new Date(plan.goal_meet_date).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-2xl font-black ${daysLeft <= 7 ? 'text-amber-500' : daysLeft <= 21 ? 'text-orange-500' : 'text-slate-700'}`}>
                      {daysLeft}
                    </p>
                    <p className="text-[10px] text-slate-400 font-semibold">日後</p>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {meta && (
                    <span className={`text-xs px-2.5 py-1 rounded-lg font-semibold ${meta.color} ${meta.textColor}`}>
                      現在：期{currentPeriod} {meta.short}
                    </span>
                  )}
                  <span className="text-xs px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 font-semibold">
                    {plan.goal_event} {plan.goal_distance_type}
                  </span>
                  <span className="text-xs px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 font-semibold">
                    {doneSessions.length}回完了 / {totalDist.toLocaleString()}m
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
