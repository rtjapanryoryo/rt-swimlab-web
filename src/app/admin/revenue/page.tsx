'use client';

import { useState, useEffect } from 'react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import type { ValueType } from 'recharts/types/component/DefaultTooltipContent';

const fmtYen = (v: ValueType | undefined) => [`¥${Number(v ?? 0).toLocaleString()}`, '売上'];
const COLORS = ['#94a3b8', '#0ea5e9', '#8b5cf6'];
const tt = { fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' };

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
  monthlyTrend: { month: string; mrr: number; newSubs: number }[];
}

const SQL_SETUP = `-- Supabase SQL Editor で実行してください
CREATE TABLE subscriptions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  plan          TEXT NOT NULL DEFAULT 'free',
  status        TEXT NOT NULL DEFAULT 'active',
  price_monthly INTEGER NOT NULL DEFAULT 0,
  started_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  cancelled_at  TIMESTAMPTZ,
  stripe_customer_id     TEXT,
  stripe_subscription_id TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin can manage subscriptions" ON subscriptions
  FOR ALL USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));`;

export default function RevenuePage() {
  const [data, setData]     = useState<RevenueData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied]  = useState(false);

  useEffect(() => {
    fetch('/api/admin/revenue', { credentials: 'include' })
      .then(r => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  const downloadCSV = () => { window.location.href = '/api/admin/export?type=revenue'; };
  const copySQL = () => {
    navigator.clipboard.writeText(SQL_SETUP).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // subscriptions テーブル未作成
  if (!data?.subscriptionsReady) {
    return (
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">収益管理</h1>
          <p className="text-sm text-slate-500 mt-0.5">MRR・ARR・プラン別収益の分析</p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⚙️</span>
            <div>
              <p className="font-semibold text-amber-800">subscriptions テーブルが未作成です</p>
              <p className="text-sm text-amber-700 mt-0.5">以下の SQL を Supabase SQL Editor で実行してください</p>
            </div>
          </div>
          <pre className="bg-slate-900 text-green-400 text-xs rounded-lg p-4 overflow-x-auto leading-relaxed">
            {SQL_SETUP}
          </pre>
          <button
            onClick={copySQL}
            className="px-4 py-2 bg-amber-600 text-white text-sm rounded-lg hover:bg-amber-700 transition-colors"
          >
            {copied ? '✓ コピーしました' : 'SQL をコピー'}
          </button>
        </div>
      </div>
    );
  }

  const { kpi, planDist, monthlyTrend } = data;
  if (!kpi) return null;

  const PLAN_LABELS: Record<string, string> = { free: 'Free', basic: 'Basic', pro: 'Pro' };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">収益管理</h1>
          <p className="text-sm text-slate-500 mt-0.5">MRR・ARR・プラン別収益の分析</p>
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

      {/* KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'MRR（月次収益）', value: `¥${kpi.mrr.toLocaleString()}`, accent: 'border-emerald-200' },
          { label: 'ARR（年次換算）',  value: `¥${kpi.arr.toLocaleString()}`, accent: 'border-sky-200'     },
          { label: '有料会員数',       value: kpi.activeCount,                 accent: 'border-violet-200'  },
          { label: 'ARPU（平均単価）', value: `¥${kpi.arpu.toLocaleString()}`, accent: 'border-amber-200'   },
        ].map(({ label, value, accent }) => (
          <div key={label} className={`bg-white rounded-xl border shadow-sm p-4 ${accent}`}>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</p>
            <p className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-col items-center justify-center">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">今月 新規契約</p>
          <p className="text-3xl font-bold text-emerald-600 mt-1">{kpi.newThisMonth}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-col items-center justify-center">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">今月 解約</p>
          <p className="text-3xl font-bold text-rose-500 mt-1">{kpi.cancelledThisMonth}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* MRR 推移 */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <p className="text-sm font-semibold text-slate-700 mb-5">月次 MRR 推移（過去 6 ヶ月）</p>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={monthlyTrend} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={tt} formatter={fmtYen} />
              <Line type="monotone" dataKey="mrr" stroke="#10b981" strokeWidth={2.5} dot={false} name="MRR" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* プラン別 */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <p className="text-sm font-semibold text-slate-700 mb-5">プラン別ユーザー構成</p>
          {planDist.length === 0
            ? <p className="text-xs text-slate-400 py-8 text-center">データなし（すべて Free）</p>
            : (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={planDist} dataKey="count" nameKey="name"
                    cx="50%" cy="50%" outerRadius={80} innerRadius={48} paddingAngle={4}>
                    {planDist.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={tt} formatter={(v) => [v, '人']} />
                  <Legend formatter={(v) => PLAN_LABELS[v] ?? v} iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            )
          }
        </div>

        {/* 新規契約推移 */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 lg:col-span-2">
          <p className="text-sm font-semibold text-slate-700 mb-5">月次 新規契約数推移</p>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={monthlyTrend} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip contentStyle={tt} formatter={(v) => [v, '件']} />
              <Bar dataKey="newSubs" fill="#0ea5e9" radius={[6, 6, 0, 0]} name="新規契約" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
