'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  LineChart, Line, BarChart, Bar, ComposedChart,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import type { ValueType } from 'recharts/types/component/DefaultTooltipContent';

const fmtYen  = (v: ValueType | undefined) => [`¥${Number(v ?? 0).toLocaleString()}`, ''];
const fmtSess = (v: ValueType | undefined) => [`${Number(v ?? 0)}件`, ''];
const tt = { fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' };

interface CounselingKpi {
  totalSessions: number;
  completedSessions: number;
  pendingSessions: number;
  confirmedSessions: number;
  totalRevenue: number;
  thisMonthRevenue: number;
  thisMonthSessions: number;
}

interface RevenueKPI {
  mrr: number; arr: number;
  activeCount: number; totalCount: number;
  newThisMonth: number; cancelledThisMonth: number;
  arpu: number;
}

interface RevenueData {
  subscriptionsReady: boolean;
  kpi: RevenueKPI | null;
  planDist: { name: string; count: number; revenue: number }[];
  monthlyTrend: { month: string; mrr: number; newSubs: number; counselingRevenue: number }[];
  counselingKpi: CounselingKpi;
  counselingTrend: { month: string; sessions: number; revenue: number }[];
  counselingPlanDist: { id: string; name: string; count: number; revenue: number }[];
}

const COUNSELING_COLORS: Record<string, string> = {
  free: '#94a3b8',
  athlete: '#0ea5e9',
  coach: '#f59e0b',
};

export default function RevenuePage() {
  const [data, setData]       = useState<RevenueData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/revenue', { credentials: 'include' })
      .then(r => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  const downloadCSV = () => { window.location.href = '/api/admin/export?type=revenue'; };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!data) return null;

  const { counselingKpi, counselingTrend, counselingPlanDist } = data;
  const totalCombinedRevenue = (data.kpi?.mrr ?? 0) + (counselingKpi?.thisMonthRevenue ?? 0);

  return (
    <div className="p-6 space-y-8 min-w-0">

      {/* ヘッダー */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">収益管理</h1>
          <p className="text-sm text-slate-500 mt-0.5">サブスクリプション・カウンセリングの収益分析</p>
        </div>
        <button
          onClick={downloadCSV}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white text-sm rounded-lg hover:bg-slate-700 transition-colors"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          CSV 出力
        </button>
      </div>

      {/* ━━━━━━ 総合収益サマリー ━━━━━━ */}
      <section className="space-y-3">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">今月の総合収益</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-4 text-white lg:col-span-2">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">今月合計（サブスク + カウンセリング）</p>
            <p className="text-3xl font-black mt-2 tabular-nums">¥{totalCombinedRevenue.toLocaleString()}</p>
            <p className="text-xs text-slate-500 mt-1">デモ期間中のため、実際の請求は発生していません</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">サブスク MRR</p>
            <p className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">
              ¥{(data.kpi?.mrr ?? 0).toLocaleString()}
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">有料会員 {data.kpi?.activeCount ?? 0}名</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">カウンセリング（今月完了）</p>
            <p className="text-2xl font-bold text-amber-600 mt-1 tabular-nums">
              ¥{(counselingKpi?.thisMonthRevenue ?? 0).toLocaleString()}
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">{counselingKpi?.thisMonthSessions ?? 0}件完了</p>
          </div>
        </div>
      </section>

      {/* ━━━━━━ サブスクリプション ━━━━━━ */}
      <section className="space-y-3">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">サブスクリプション</p>

        {!data.subscriptionsReady ? (
          <div className="bg-slate-50 border border-dashed border-slate-300 rounded-2xl p-6 text-center space-y-2">
            <p className="text-sm font-semibold text-slate-500">Stripe 連携前のため、サブスクデータはありません</p>
            <p className="text-xs text-slate-400">プランの価格が決定し Stripe を設定すると、ここに自動反映されます</p>
            <Link href="/mypage/subscription" className="inline-block mt-2 text-xs text-cyan-600 underline underline-offset-2">
              プランページを確認
            </Link>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { label: 'MRR',       value: `¥${(data.kpi?.mrr ?? 0).toLocaleString()}`,  accent: 'border-l-emerald-400' },
                { label: 'ARR',       value: `¥${(data.kpi?.arr ?? 0).toLocaleString()}`,  accent: 'border-l-sky-400'     },
                { label: '有料会員数', value: `${data.kpi?.activeCount ?? 0}名`,              accent: 'border-l-violet-400'  },
                { label: 'ARPU',      value: `¥${(data.kpi?.arpu ?? 0).toLocaleString()}`, accent: 'border-l-amber-400'   },
              ].map(({ label, value, accent }) => (
                <div key={label} className={`bg-white rounded-xl border border-slate-200 shadow-sm p-4 border-l-4 ${accent}`}>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</p>
                  <p className="text-xl font-bold text-slate-900 mt-1 tabular-nums">{value}</p>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <p className="text-xs font-semibold text-slate-600 mb-4">月次 MRR 推移（過去6ヶ月）</p>
              <ResponsiveContainer width="100%" height={180}>
                <ComposedChart data={data.monthlyTrend} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={tt} formatter={fmtYen} />
                  <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" iconSize={8} />
                  <Bar dataKey="counselingRevenue" fill="#fcd34d" radius={[4, 4, 0, 0]} name="カウンセリング" />
                  <Line type="monotone" dataKey="mrr" stroke="#10b981" strokeWidth={2.5} dot={false} name="サブスク MRR" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </section>

      {/* ━━━━━━ カウンセリング ━━━━━━ */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">カウンセリング</p>
          <Link
            href="/admin/counseling"
            className="text-xs text-cyan-600 hover:text-cyan-700 font-semibold"
          >
            申し込み管理 →
          </Link>
        </div>

        {/* カウンセリング KPI */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: '累計収益',       value: `¥${(counselingKpi?.totalRevenue ?? 0).toLocaleString()}`,  color: 'text-amber-600',   accent: 'border-l-amber-400'  },
            { label: '完了セッション', value: `${counselingKpi?.completedSessions ?? 0}件`,                color: 'text-emerald-600', accent: 'border-l-emerald-400'},
            { label: '対応待ち',       value: `${counselingKpi?.pendingSessions ?? 0}件`,                  color: 'text-red-500',     accent: 'border-l-red-400'    },
            { label: '日程確定',       value: `${counselingKpi?.confirmedSessions ?? 0}件`,                color: 'text-blue-500',    accent: 'border-l-blue-400'   },
          ].map(({ label, value, color, accent }) => (
            <div key={label} className={`bg-white rounded-xl border border-slate-200 shadow-sm p-4 border-l-4 ${accent}`}>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</p>
              <p className={`text-xl font-bold mt-1 tabular-nums ${color}`}>{value}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* 月次カウンセリング収益・件数 */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <p className="text-xs font-semibold text-slate-600 mb-4">月次カウンセリング収益・件数（過去6ヶ月）</p>
            {counselingTrend.every(t => t.sessions === 0) ? (
              <div className="flex items-center justify-center h-40">
                <p className="text-xs text-slate-400">完了済みセッションがありません</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <ComposedChart data={counselingTrend} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} />
                  <YAxis yAxisId="revenue" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                  <YAxis yAxisId="sessions" orientation="right" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={tt} />
                  <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" iconSize={8} />
                  <Bar yAxisId="revenue" dataKey="revenue" fill="#fcd34d" radius={[4, 4, 0, 0]} name="収益 (¥)" />
                  <Line yAxisId="sessions" type="monotone" dataKey="sessions" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} name="件数" />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* プラン別内訳 */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <p className="text-xs font-semibold text-slate-600 mb-4">プラン別内訳（全期間）</p>
            {counselingPlanDist.length === 0 ? (
              <div className="flex items-center justify-center h-40">
                <p className="text-xs text-slate-400">申し込みがありません</p>
              </div>
            ) : (
              <div className="space-y-3 mt-2">
                {counselingPlanDist.map(p => {
                  const total = counselingPlanDist.reduce((s, x) => s + x.count, 0);
                  const pct = total > 0 ? Math.round((p.count / total) * 100) : 0;
                  return (
                    <div key={p.id} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ background: COUNSELING_COLORS[p.id] ?? '#94a3b8' }}
                          />
                          <span className="font-medium text-slate-700">{p.name}</span>
                        </div>
                        <div className="flex items-center gap-3 tabular-nums">
                          <span className="text-slate-500">{p.count}件</span>
                          <span className="font-bold text-slate-900">¥{p.revenue.toLocaleString()}</span>
                        </div>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${pct}%`, background: COUNSELING_COLORS[p.id] ?? '#94a3b8' }}
                        />
                      </div>
                    </div>
                  );
                })}

                <div className="pt-3 border-t border-slate-100 flex justify-between text-xs">
                  <span className="text-slate-500">累計収益合計</span>
                  <span className="font-black text-slate-900">
                    ¥{counselingPlanDist.reduce((s, p) => s + p.revenue, 0).toLocaleString()}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

    </div>
  );
}
