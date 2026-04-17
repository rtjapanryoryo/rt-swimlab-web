'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { ValueType } from 'recharts/types/component/DefaultTooltipContent';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

const fmtCount = (v: ValueType | undefined) => [v ?? 0, '件'] as [ValueType, string];

// ── 型定義 ─────────────────────────────────────────────────────────────────

interface KPI {
  totalUsers: number;
  newUsersMonth: number;
  totalGenerations: number;
  generationsMonth: number;
  dau: number;
  wau: number;
  quickCount: number;
  customCount: number;
}

interface ChartData {
  dailyTrend:   { date: string; count: number }[];
  strokeDist:   { name: string; count: number }[];
  periodDist:   { name: string; count: number }[];
  levelDist:    { name: string; count: number }[];
  distTypeDist: { name: string; count: number }[];
}

interface UserRow {
  id: string;
  display_name: string | null;
  role: string;
  total_usage_count: number;
  created_at: string;
  last_active: string | null;
}

interface StatsData {
  serviceRoleActive: boolean;
  kpi: KPI;
  charts: ChartData;
  users: UserRow[];
}

// ── 定数 ──────────────────────────────────────────────────────────────────

const CHART_COLORS = ['#0ea5e9', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444'];

const fmt = (s: string | null, opts: Intl.DateTimeFormatOptions) =>
  s ? new Date(s).toLocaleDateString('ja-JP', opts) : '—';

// ── KPIカード ──────────────────────────────────────────────────────────────

function KPICard({
  title,
  value,
  sub,
  accent,
}: {
  title: string;
  value: string | number;
  sub?: string;
  accent?: string;
}) {
  return (
    <div className={`bg-white rounded-2xl border shadow-sm p-5 ${accent ?? 'border-slate-200'}`}>
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">{title}</p>
      <p className="text-3xl font-bold text-slate-900 tabular-nums">{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-1.5">{sub}</p>}
    </div>
  );
}

// ── ツールチップスタイル ────────────────────────────────────────────────────

const tooltipStyle = {
  fontSize: 12,
  borderRadius: 8,
  border: '1px solid #e2e8f0',
  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
};

// ── メインコンポーネント ───────────────────────────────────────────────────

export default function AdminDashboard() {
  const [data, setData] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/admin/stats', { credentials: 'include' })
      .then(async r => {
        if (!r.ok) {
          const d = await r.json().catch(() => ({}));
          throw new Error((d as { error?: string }).error ?? 'failed');
        }
        return r.json() as Promise<StatsData>;
      })
      .then(setData)
      .catch(e => setError(e instanceof Error ? e.message : 'エラーが発生しました'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-2 border-sky-400 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-slate-400">データを読み込み中…</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-red-500 text-sm">{error ?? 'データが取得できませんでした'}</p>
      </div>
    );
  }

  const { kpi, charts, users } = data;
  const totalMenus = kpi.quickCount + kpi.customCount;

  return (
    <div className="min-h-screen bg-slate-50">

      {/* ヘッダー */}
      <header className="bg-slate-900 text-white px-6 py-5 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold tracking-tight">管理者ダッシュボード</h1>
          <p className="text-slate-400 text-xs mt-0.5">RT Swimlab — 本部分析</p>
        </div>
        <Link href="/mypage" className="text-xs text-slate-400 hover:text-white transition-colors">
          ← マイページへ
        </Link>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {!data.serviceRoleActive && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-4 text-sm text-red-700">
            ⚠️ <strong>SUPABASE_SERVICE_ROLE_KEY が未設定です。</strong>
            generation_logs・menus テーブルのRLSにより、全ユーザーのデータが取得できません。
            環境変数を設定するか、Supabaseで admin 用RLSポリシーを追加してください。
          </div>
        )}

        {/* ── KPI ─────────────────────────────────────────────────────── */}
        <section>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">概要</p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard
              title="総ユーザー"
              value={kpi.totalUsers}
              sub={`今月 +${kpi.newUsersMonth} 人`}
              accent="border-sky-200"
            />
            <KPICard
              title="累計生成"
              value={kpi.totalGenerations.toLocaleString()}
              sub={`今月 ${kpi.generationsMonth.toLocaleString()} 回`}
              accent="border-emerald-200"
            />
            <KPICard
              title="DAU / WAU"
              value={`${kpi.dau} / ${kpi.wau}`}
              sub="本日 / 7日間アクティブユーザー"
              accent="border-amber-200"
            />
            <KPICard
              title="Quick / Custom"
              value={`${kpi.quickCount} / ${kpi.customCount}`}
              sub={totalMenus > 0 ? `Quick 率 ${Math.round((kpi.quickCount / totalMenus) * 100)}%` : '生成なし'}
              accent="border-violet-200"
            />
          </div>
        </section>

        {/* ── 日別トレンド ─────────────────────────────────────────────── */}
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <p className="text-sm font-semibold text-slate-700 mb-5">日別生成回数（過去 30 日）</p>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={charts.dailyTrend} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: '#94a3b8' }}
                tickLine={false}
                interval={4}
              />
              <YAxis
                tick={{ fontSize: 10, fill: '#94a3b8' }}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <Tooltip contentStyle={tooltipStyle} formatter={fmtCount} />
              <Line
                type="monotone"
                dataKey="count"
                stroke="#0ea5e9"
                strokeWidth={2}
                dot={false}
                name="生成回数"
              />
            </LineChart>
          </ResponsiveContainer>
        </section>

        {/* ── チャートグリッド ─────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* 種目別 */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <p className="text-sm font-semibold text-slate-700 mb-5">種目別メニュー数</p>
            {charts.strokeDist.length === 0 ? (
              <p className="text-xs text-slate-400 py-8 text-center">データなし</p>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart
                  data={charts.strokeDist}
                  layout="vertical"
                  margin={{ top: 0, right: 8, bottom: 0, left: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: '#475569' }} tickLine={false} axisLine={false} width={36} />
                  <Tooltip contentStyle={tooltipStyle} formatter={fmtCount} />
                  <Bar dataKey="count" fill="#10b981" radius={[0, 6, 6, 0]} name="件数" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* 期別 */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <p className="text-sm font-semibold text-slate-700 mb-5">期別利用分布</p>
            {charts.periodDist.length === 0 ? (
              <p className="text-xs text-slate-400 py-8 text-center">データなし</p>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={charts.periodDist} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#94a3b8' }} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={tooltipStyle} formatter={fmtCount} />
                  <Bar dataKey="count" fill="#8b5cf6" radius={[6, 6, 0, 0]} name="件数" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* レベル別 */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <p className="text-sm font-semibold text-slate-700 mb-5">レベル別構成</p>
            {charts.levelDist.length === 0 ? (
              <p className="text-xs text-slate-400 py-8 text-center">データなし</p>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={charts.levelDist}
                    dataKey="count"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    innerRadius={46}
                    paddingAngle={3}
                  >
                    {charts.levelDist.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} formatter={fmtCount} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* 距離タイプ別 */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <p className="text-sm font-semibold text-slate-700 mb-5">距離タイプ別（S / M / D）</p>
            {charts.distTypeDist.length === 0 ? (
              <p className="text-xs text-slate-400 py-8 text-center">データなし</p>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={charts.distTypeDist}
                    dataKey="count"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    innerRadius={46}
                    paddingAngle={3}
                  >
                    {charts.distTypeDist.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[(i + 2) % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} formatter={fmtCount} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* ── ユーザーテーブル ─────────────────────────────────────────── */}
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-700">ユーザー一覧（利用回数順・上位 20 件）</p>
            <span className="text-xs text-slate-400">{users.length} 件</span>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100">
              <thead className="bg-slate-50">
                <tr>
                  {['名前', '累計生成', '役割', '最終利用', '登録日'].map(h => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-slate-900">
                      {u.display_name ?? '（未設定）'}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700 tabular-nums">
                      {u.total_usage_count.toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2.5 py-0.5 text-xs rounded-full font-semibold ${
                          u.role === 'admin'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-500">
                      {fmt(u.last_active, { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-400">
                      {fmt(u.created_at, { year: 'numeric', month: '2-digit', day: '2-digit' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {users.length === 0 && (
              <div className="py-12 text-center text-sm text-slate-400">ユーザーデータがありません</div>
            )}
          </div>
        </section>

      </main>
    </div>
  );
}
