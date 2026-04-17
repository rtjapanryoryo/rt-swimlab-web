'use client';

import { useState, useEffect } from 'react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import type { ValueType } from 'recharts/types/component/DefaultTooltipContent';

const fmtCount = (v: ValueType | undefined) => [v ?? 0, '件'] as [ValueType, string];
const COLORS = ['#0ea5e9', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#64748b', '#06b6d4'];
const tt = { fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' };

interface StatsData {
  charts: {
    dailyTrend:   { date: string; count: number }[];
    strokeDist:   { name: string; count: number }[];
    periodDist:   { name: string; count: number }[];
    levelDist:    { name: string; count: number }[];
    distTypeDist: { name: string; count: number }[];
  };
  kpi: {
    totalGenerations: number;
    generationsMonth: number;
    dau: number;
    wau: number;
    quickCount: number;
    customCount: number;
  };
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
      <p className="text-sm font-semibold text-slate-700 mb-5">{title}</p>
      {children}
    </div>
  );
}

export default function AnalyticsPage() {
  const [data, setData] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/stats', { credentials: 'include' })
      .then(r => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  const downloadLogs = () => { window.location.href = '/api/admin/export?type=logs'; };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!data) return <div className="p-6 text-slate-500">データを取得できませんでした</div>;

  const { charts, kpi } = data;
  const total = kpi.quickCount + kpi.customCount;
  const quickCustom = [
    { name: 'Quick', count: kpi.quickCount  },
    { name: 'Custom', count: kpi.customCount },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">利用分析</h1>
          <p className="text-sm text-slate-500 mt-0.5">全ユーザーのメニュー生成パターン詳細</p>
        </div>
        <button
          onClick={downloadLogs}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white text-sm rounded-lg hover:bg-slate-700 transition-colors"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          ログ CSV
        </button>
      </div>

      {/* KPIミニ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: '累計生成',     value: kpi.totalGenerations.toLocaleString() },
          { label: '今月生成',     value: kpi.generationsMonth.toLocaleString() },
          { label: 'DAU / WAU', value: `${kpi.dau} / ${kpi.wau}` },
          { label: 'Quick 率',    value: total > 0 ? `${Math.round(kpi.quickCount / total * 100)}%` : '—' },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</p>
            <p className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">{value}</p>
          </div>
        ))}
      </div>

      {/* 日別トレンド（フルwidth）*/}
      <Section title="日別生成回数トレンド（過去 30 日）">
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={charts.dailyTrend} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} interval={4} />
            <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} allowDecimals={false} />
            <Tooltip contentStyle={tt} formatter={fmtCount} />
            <Line type="monotone" dataKey="count" stroke="#0ea5e9" strokeWidth={2.5} dot={false} name="生成回数" />
          </LineChart>
        </ResponsiveContainer>
      </Section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick vs Custom ドーナツ */}
        <Section title="Quick vs Custom 比率">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={quickCustom} dataKey="count" nameKey="name" cx="50%" cy="50%"
                outerRadius={90} innerRadius={52} paddingAngle={4}>
                {quickCustom.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
              </Pie>
              <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" className="fill-slate-800">
                <tspan x="50%" dy="-6" fontSize="22" fontWeight="bold">{total.toLocaleString()}</tspan>
                <tspan x="50%" dy="18" fontSize="11" fill="#94a3b8">総生成数</tspan>
              </text>
              <Tooltip contentStyle={tt} formatter={fmtCount} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </Section>

        {/* 種目別 */}
        <Section title="種目別メニュー数">
          {charts.strokeDist.length === 0
            ? <p className="text-xs text-slate-400 py-8 text-center">データなし</p>
            : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={charts.strokeDist} layout="vertical" margin={{ top: 0, right: 8, bottom: 0, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: '#475569' }} tickLine={false} axisLine={false} width={36} />
                  <Tooltip contentStyle={tt} formatter={fmtCount} />
                  <Bar dataKey="count" fill="#10b981" radius={[0, 6, 6, 0]} name="件数" />
                </BarChart>
              </ResponsiveContainer>
            )
          }
        </Section>

        {/* 期別 */}
        <Section title="期別利用分布">
          {charts.periodDist.length === 0
            ? <p className="text-xs text-slate-400 py-8 text-center">データなし</p>
            : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={charts.periodDist} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#94a3b8' }} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={tt} formatter={fmtCount} />
                  <Bar dataKey="count" fill="#8b5cf6" radius={[6, 6, 0, 0]} name="件数" />
                </BarChart>
              </ResponsiveContainer>
            )
          }
        </Section>

        {/* レベル × 距離タイプ */}
        <div className="space-y-6">
          <Section title="レベル別構成">
            {charts.levelDist.length === 0
              ? <p className="text-xs text-slate-400 py-4 text-center">データなし</p>
              : (
                <ResponsiveContainer width="100%" height={100}>
                  <BarChart data={charts.levelDist} margin={{ top: 0, right: 8, bottom: 0, left: -16 }}>
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#475569' }} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={tt} formatter={fmtCount} />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]} name="件数">
                      {charts.levelDist.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )
            }
          </Section>
          <Section title="距離タイプ別（S / M / D）">
            {charts.distTypeDist.length === 0
              ? <p className="text-xs text-slate-400 py-4 text-center">データなし</p>
              : (
                <ResponsiveContainer width="100%" height={100}>
                  <BarChart data={charts.distTypeDist} margin={{ top: 0, right: 8, bottom: 0, left: -16 }}>
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#475569' }} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={tt} formatter={fmtCount} />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]} name="件数">
                      {charts.distTypeDist.map((_, i) => <Cell key={i} fill={COLORS[(i + 2) % COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )
            }
          </Section>
        </div>
      </div>
    </div>
  );
}
