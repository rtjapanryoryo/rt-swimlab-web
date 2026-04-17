'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { ValueType } from 'recharts/types/component/DefaultTooltipContent';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

const fmtCount = (v: ValueType | undefined) => [v ?? 0, '件'] as [ValueType, string];

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

const CHART_COLORS = ['#0ea5e9', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444'];

const fmt = (s: string | null, opts: Intl.DateTimeFormatOptions) =>
  s ? new Date(s).toLocaleDateString('ja-JP', opts) : '—';

const tooltipStyle = {
  fontSize: 12,
  borderRadius: 8,
  border: '1px solid #e2e8f0',
  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
};

// ── KPIカード ──────────────────────────────────────────────────────────────

function KPICard({
  title,
  value,
  sub,
  accentClass,
  icon,
}: {
  title: string;
  value: string | number;
  sub?: string;
  accentClass: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex gap-4 items-start">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${accentClass}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">{title}</p>
        <p className="text-2xl font-bold text-slate-900 tabular-nums mt-0.5">{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
      </div>
    </div>
  );
}

// ── アイコン ───────────────────────────────────────────────────────────────

const ic = 'w-5 h-5';
const UsersIcon  = () => <svg className={ic} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="7" r="3"/><path d="M3 20v-1a6 6 0 0 1 12 0v1"/><circle cx="18" cy="8" r="2.5"/><path d="M21 20v-.5a4 4 0 0 0-5-3.87"/></svg>;
const GenIcon    = () => <svg className={ic} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>;
const ActiveIcon = () => <svg className={ic} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>;
const SplitIcon  = () => <svg className={ic} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="8" rx="1.5"/><rect x="14" y="3" width="7" height="4" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="10" width="7" height="11" rx="1.5"/></svg>;

// ── セクションラッパー ─────────────────────────────────────────────────────

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
      <p className="text-sm font-semibold text-slate-700 mb-5">{title}</p>
      {children}
    </div>
  );
}

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
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-sky-400 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-slate-400">データを読み込み中…</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-2">
          <p className="text-red-500 text-sm">{error ?? 'データが取得できませんでした'}</p>
          <Link href="/mypage" className="text-xs text-slate-400 hover:text-slate-600 transition-colors">← マイページへ戻る</Link>
        </div>
      </div>
    );
  }

  const { kpi, charts, users } = data;
  const totalMenus = kpi.quickCount + kpi.customCount;

  return (
    <div className="p-6 space-y-6">

      {/* ページヘッダー */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">ダッシュボード</h1>
          <p className="text-sm text-slate-500 mt-0.5">RT Swimlab — プラットフォーム全体の概要</p>
        </div>
        <Link href="/mypage" className="text-xs text-slate-400 hover:text-slate-700 transition-colors px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:border-slate-300">
          ← マイページ
        </Link>
      </div>

      {/* サービスロール警告 */}
      {!data.serviceRoleActive && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-4 flex gap-3">
          <span className="text-red-500 shrink-0">⚠</span>
          <div className="text-sm text-red-700">
            <strong>SUPABASE_SERVICE_ROLE_KEY が未設定です。</strong>
            <span className="ml-1">generation_logs・menus テーブルのRLSにより、全ユーザーのデータが取得できません。環境変数を設定するか、Supabase で admin 用RLSポリシーを追加してください。</span>
          </div>
        </div>
      )}

      {/* ── KPI ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="総ユーザー"
          value={kpi.totalUsers}
          sub={`今月 +${kpi.newUsersMonth} 人`}
          accentClass="bg-sky-50 text-sky-500"
          icon={<UsersIcon />}
        />
        <KPICard
          title="累計生成"
          value={kpi.totalGenerations.toLocaleString()}
          sub={`今月 ${kpi.generationsMonth.toLocaleString()} 回`}
          accentClass="bg-emerald-50 text-emerald-500"
          icon={<GenIcon />}
        />
        <KPICard
          title="DAU / WAU"
          value={`${kpi.dau} / ${kpi.wau}`}
          sub="本日 / 7日間 アクティブ"
          accentClass="bg-amber-50 text-amber-500"
          icon={<ActiveIcon />}
        />
        <KPICard
          title="Quick / Custom"
          value={`${kpi.quickCount} / ${kpi.customCount}`}
          sub={totalMenus > 0 ? `Quick 率 ${Math.round((kpi.quickCount / totalMenus) * 100)}%` : '生成なし'}
          accentClass="bg-violet-50 text-violet-500"
          icon={<SplitIcon />}
        />
      </div>

      {/* ── 日別トレンド ─────────────────────────────────────────────── */}
      <Card title="日別生成回数（過去 30 日）">
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
      </Card>

      {/* ── チャートグリッド ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        <Card title="種目別メニュー数">
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
        </Card>

        <Card title="期別利用分布">
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
        </Card>

        <Card title="レベル別構成">
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
        </Card>

        <Card title="距離タイプ別（S / M / D）">
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
        </Card>
      </div>

      {/* ── ユーザーテーブル ─────────────────────────────────────────── */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-700">ユーザー一覧（利用回数順・上位 20 件）</p>
          <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{users.length} 件</span>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100">
            <thead className="bg-slate-50">
              <tr>
                {['#', '名前', '累計生成', '役割', '最終利用', '登録日'].map(h => (
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
              {users.map((u, idx) => (
                <tr key={u.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-4 py-3 text-xs text-slate-300 tabular-nums w-8">{idx + 1}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-sky-100 flex items-center justify-center shrink-0">
                        <span className="text-[11px] font-bold text-sky-600">
                          {(u.display_name ?? '?').charAt(0)}
                        </span>
                      </div>
                      <span className="text-sm font-medium text-slate-900">
                        {u.display_name ?? '（未設定）'}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold text-slate-800 tabular-nums">
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

    </div>
  );
}
