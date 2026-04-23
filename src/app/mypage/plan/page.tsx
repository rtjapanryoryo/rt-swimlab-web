'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { PERIOD_META } from '@/types/training';
import type { TrainingPlan, TrainingCycle, TrainingSession, PeriodKey, SecondaryMeet } from '@/types/training';

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

function fmtDateShort(s: string) {
  return new Date(s).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' });
}

/** 期×試合残日数から選手に寄り添うメッセージを返す */
function getPeriodMessage(period: PeriodKey, daysLeft: number): string {
  if (daysLeft <= 7) return 'いよいよ試合週。あとは調整に徹して、ベストな状態で臨んでください。';
  if (daysLeft <= 14) return 'テーパー期。量を落として感覚を研ぎ澄ます時期です。';
  if (daysLeft <= 21) return '調整の仕上げ段階。体と相談しながら丁寧に。';

  const messages: Record<PeriodKey, string> = {
    '1': '今は充電期間。焦らずリセットすることが、次のステージへの近道です。',
    '2': '有酸素の基盤を積み上げる時期。地道な量が後の伸びに直結します。',
    '3': 'フォームと強度を同時に高める時期。技術の積み重ねが結果を変えます。',
    '4': 'スピード持久力を鍛える大事な時期。追い込む準備が整ってきました。',
    '5': '一番きつい時期ですが、ここが正念場。乗り越えると大きく変わります。',
    '6': '量を落として質に集中。感覚を研ぎ澄ます大切な調整期です。',
    '7': 'いよいよ最終調整。今までの積み重ねを信じて、ピークに合わせましょう。',
  };
  return messages[period];
}

/** 期のフェーズを自然語で返す（技術コード不使用） */
function getPeriodPhrase(period: PeriodKey, daysLeft: number): string {
  if (daysLeft <= 7) return '試合直前';
  const meta = PERIOD_META[period];
  return meta.label + '期';
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
          <p className="text-sm text-slate-400 mt-1">試合日を登録するとAIが毎日の練習を提案します</p>
          <Link href="/mypage/plan/new"
            className="inline-block mt-5 px-6 py-3 bg-cyan-500 text-white font-bold rounded-xl hover:bg-cyan-400 transition-colors">
            最初の計画を作成
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {plans.map(plan => {
            const daysLeft      = daysUntil(plan.goal_meet_date);
            const currentPeriod = getCurrentPeriod(plan.training_cycles);
            const meta          = currentPeriod ? PERIOD_META[currentPeriod] : null;
            const doneSessions  = plan.training_sessions.filter(s => s.status === 'done');
            const totalDist     = doneSessions.reduce((s, ss) => s + (ss.actual_distance_m ?? 0), 0);
            const secondaryMeets: SecondaryMeet[] = plan.secondary_meets ?? [];
            // 直近の準備試合（まだ先のもの）
            const upcomingSecondary = secondaryMeets
              .filter(m => daysUntil(m.date) > 0 && daysUntil(m.date) < daysLeft)
              .sort((a, b) => a.date.localeCompare(b.date));

            return (
              <Link key={plan.id} href={`/mypage/plan/${plan.id}`}
                className="block bg-white rounded-2xl border border-slate-200 shadow-sm hover:border-cyan-300 hover:shadow-md transition-all overflow-hidden">

                {/* 期カラーライン（上部） */}
                {meta && (
                  <div className={`h-1 w-full ${meta.color.replace('bg-', 'bg-').replace('-50', '-300').replace('-100', '-400')}`} />
                )}

                <div className="p-5 space-y-3">
                  {/* ヘッダー行 */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-base font-bold text-slate-900 truncate">{plan.name}</p>
                        {plan.is_active && (
                          <span className="text-[10px] bg-cyan-100 text-cyan-700 px-2 py-0.5 rounded-full font-bold">進行中</span>
                        )}
                      </div>
                      <p className="text-sm text-slate-500 mt-0.5">
                        {plan.goal_meet_name ?? '目標試合'} — {fmtDateShort(plan.goal_meet_date)}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`text-2xl font-black tabular-nums ${
                        daysLeft <= 7 ? 'text-amber-500' : daysLeft <= 21 ? 'text-orange-500' : 'text-slate-700'
                      }`}>
                        {daysLeft}
                      </p>
                      <p className="text-[10px] text-slate-400 font-semibold">日後</p>
                    </div>
                  </div>

                  {/* フェーズと寄り添いメッセージ */}
                  {currentPeriod && meta && (
                    <div className={`px-3 py-2.5 rounded-xl ${meta.color}`}>
                      <p className={`text-[10px] font-bold ${meta.textColor} mb-0.5`}>
                        {getPeriodPhrase(currentPeriod, daysLeft)}
                      </p>
                      <p className={`text-xs ${meta.textColor} opacity-90 leading-relaxed`}>
                        {getPeriodMessage(currentPeriod, daysLeft)}
                      </p>
                    </div>
                  )}

                  {/* 準備試合バッジ */}
                  {upcomingSecondary.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {upcomingSecondary.map((m, i) => (
                        <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-violet-50 text-violet-600 border border-violet-200 font-semibold">
                          {m.name} {fmtDateShort(m.date)}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* フッター統計 */}
                  <div className="flex items-center gap-3 text-xs text-slate-400 pt-1 border-t border-slate-100">
                    <span>{plan.goal_event} / {plan.goal_distance_type === 'S' ? '短距離' : plan.goal_distance_type === 'M' ? '中距離' : '長距離'}</span>
                    {doneSessions.length > 0 && (
                      <span className="text-emerald-600 font-semibold">
                        {doneSessions.length}回完了 · {(totalDist / 1000).toFixed(1)}km
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
