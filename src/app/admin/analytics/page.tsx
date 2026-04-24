'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import type { ValueType } from 'recharts/types/component/DefaultTooltipContent';

const fmtCount = (v: ValueType | undefined) => [v ?? 0, '件'] as [ValueType, string];
const COLORS = ['#0ea5e9', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#64748b', '#06b6d4'];
const tt = { fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' };

type Period = '7d' | '30d' | '3m' | '6m' | 'all';

const PERIODS: { id: Period; label: string; shortLabel: string }[] = [
  { id: '7d',  label: '過去7日',   shortLabel: '7日' },
  { id: '30d', label: '過去30日',  shortLabel: '30日' },
  { id: '3m',  label: '過去3ヶ月', shortLabel: '3ヶ月' },
  { id: '6m',  label: '過去6ヶ月', shortLabel: '6ヶ月' },
  { id: 'all', label: '累計',      shortLabel: '累計' },
];

interface AnalyticsData {
  period: Period;
  kpi: {
    totalGenerations:  number;
    periodGenerations: number;
    totalUsers:        number;
    periodUsers:       number;
  };
  charts: {
    dailyTrend:            { date: string; count: number }[];
    monthlyTrend:          { month: string; count: number }[];
    hourlyDist:            { hour: string; count: number }[];
    weekdayDist:           { day: string; count: number }[];
    userRegistrationTrend: { date: string; count: number }[];
    strokeDist:            { name: string; count: number }[];
    periodDist:            { name: string; count: number }[];
    levelDist:             { name: string; count: number }[];
    distTypeDist:          { name: string; count: number }[];
  };
}

// 概要 KPI 用に stats も読む
interface StatsKPI {
  totalUsers: number; newUsersMonth: number; newUsersMoMPct: number | null;
  newUsersWeek: number; newUsersToday: number;
  totalGenerations: number; generationsMonth: number; gensMoMPct: number | null;
  gensWeek: number; gensToday: number;
  dau: number; wau: number; mau: number; avgGensPerMau: number;
  quickCount: number; customCount: number;
  activePlans: number; sessionLogs: number;
  feedbackTotal: number; feedbackPending: number;
}

function Card({ title, sub, badge, children }: { title: string; sub?: string; badge?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
      <div className="mb-4 flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-slate-800">{title}</p>
          {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
        </div>
        {badge && <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full shrink-0">{badge}</span>}
      </div>
      {children}
    </div>
  );
}

function MetricRow({ label, value, note, good }: { label: string; value: string; note?: string; good?: boolean | null }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-slate-50 last:border-0">
      <div>
        <p className="text-sm text-slate-700">{label}</p>
        {note && <p className="text-[11px] text-slate-400 mt-0.5">{note}</p>}
      </div>
      <span className={`text-sm font-bold tabular-nums ml-4 shrink-0 ${
        good === true ? 'text-emerald-600' : good === false ? 'text-red-500' : 'text-slate-800'
      }`}>
        {value}
      </span>
    </div>
  );
}

function StatBadge({ label, value, sub, color }: { label: string; value: string; sub?: string; color: string }) {
  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
      <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{label}</p>
      <p className={`text-2xl font-bold mt-1 tabular-nums ${color}`}>{value}</p>
      {sub && <p className="text-[11px] text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function NoData() {
  return <p className="text-xs text-slate-400 py-10 text-center">データなし</p>;
}

export default function AnalyticsPage() {
  const [period, setPeriod]   = useState<Period>('30d');
  const [data, setData]       = useState<AnalyticsData | null>(null);
  const [stats, setStats]     = useState<StatsKPI | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = useCallback((p: Period) => {
    setLoading(true);
    fetch(`/api/admin/analytics?period=${p}`, { credentials: 'include' })
      .then(r => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchAnalytics(period);
  }, [period, fetchAnalytics]);

  useEffect(() => {
    fetch('/api/admin/stats', { credentials: 'include' })
      .then(r => r.json())
      .then(d => setStats(d.kpi ?? null))
      .catch(() => {});
  }, []);

  const handlePeriod = (p: Period) => {
    setPeriod(p);
  };

  const downloadLogs = () => { window.location.href = '/api/admin/export?type=logs'; };

  const useDailyView = period === '7d' || period === '30d';
  const periodLabel = PERIODS.find(p => p.id === period)?.label ?? period;

  // trendData を共通フォーマット { label, count } に正規化
  const trendData: { label: string; count: number }[] = data
    ? (useDailyView
        ? data.charts.dailyTrend.map(d => ({ label: d.date, count: d.count }))
        : data.charts.monthlyTrend.map(d => ({ label: d.month, count: d.count })))
    : [];

  const total           = (stats?.quickCount ?? 0) + (stats?.customCount ?? 0);
  const quickCustom     = [
    { name: 'Quick',  count: stats?.quickCount  ?? 0 },
    { name: 'Custom', count: stats?.customCount ?? 0 },
  ];
  const dauWauRatio     = (stats?.wau ?? 0) > 0 ? Math.round(((stats?.dau ?? 0) / (stats?.wau ?? 0)) * 100) : 0;
  const mauEngaged      = (stats?.mau ?? 0) > 0 && (stats?.totalUsers ?? 0) > 0
    ? Math.round(((stats?.mau ?? 0) / (stats?.totalUsers ?? 0)) * 100) : 0;
  const planAdoptionPct = (stats?.totalUsers ?? 0) > 0
    ? Math.round(((stats?.activePlans ?? 0) / (stats?.totalUsers ?? 0)) * 100) : 0;
  const customDepthPct  = total > 0 ? Math.round(((stats?.customCount ?? 0) / total) * 100) : 0;

  return (
    <div className="p-6 space-y-8">

      {/* ヘッダー */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">利用分析</h1>
          <p className="text-sm text-slate-500 mt-0.5">メニュー生成パターンと成長・定着指標</p>
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

      {/* ── 期間セレクター ─────────────────────────────────────────── */}
      <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {PERIODS.map(p => (
          <button
            key={p.id}
            onClick={() => handlePeriod(p.id)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              period === p.id
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* ── Section 1: 主要指標サマリ ──────────────────────────────────── */}
      <section className="space-y-3">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">主要指標（累計）</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatBadge label="累計生成数"   value={(stats?.totalGenerations ?? 0).toLocaleString()} sub="全期間の総生成数"           color="text-sky-600" />
          <StatBadge label="今月の生成数" value={(stats?.generationsMonth ?? 0).toLocaleString()} sub={stats?.gensMoMPct !== null && stats?.gensMoMPct !== undefined ? `先月比 ${stats.gensMoMPct >= 0 ? '+' : ''}${stats.gensMoMPct}%` : undefined} color="text-emerald-600" />
          <StatBadge label="MAU（30日）"  value={(stats?.mau ?? 0).toLocaleString()} sub={`活性率 ${mauEngaged}%`} color="text-violet-600" />
          <StatBadge label="DAU / WAU"    value={`${stats?.dau ?? 0} / ${stats?.wau ?? 0}`} sub={`粘着度 ${dauWauRatio}%`} color="text-amber-600" />
        </div>
      </section>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : !data ? (
        <div className="p-6 text-slate-500 text-sm">データを取得できませんでした</div>
      ) : (
        <>
          {/* ── Section 2: 期間別生成トレンド ─────────────────────────── */}
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">生成トレンド</p>
              <span className="text-[10px] font-bold px-2 py-0.5 bg-sky-100 text-sky-600 rounded-full">{periodLabel}</span>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <Card title="メニュー生成回数" sub={`${periodLabel}の推移`} badge={periodLabel}>
                {trendData.some(d => d.count > 0) ? (
                  useDailyView ? (
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={trendData} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} interval={period === '7d' ? 0 : 4} />
                        <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} allowDecimals={false} />
                        <Tooltip contentStyle={tt} formatter={fmtCount} />
                        <Line type="monotone" dataKey="count" stroke="#0ea5e9" strokeWidth={2.5} dot={period === '7d'} name="生成回数" />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={trendData} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                        <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} />
                        <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} allowDecimals={false} />
                        <Tooltip contentStyle={tt} formatter={fmtCount} />
                        <Bar dataKey="count" fill="#0ea5e9" radius={[6, 6, 0, 0]} name="生成回数" />
                      </BarChart>
                    </ResponsiveContainer>
                  )
                ) : <NoData />}
              </Card>

              <Card title="新規ユーザー登録" sub={`${periodLabel}の新規登録推移`} badge={periodLabel}>
                {data.charts.userRegistrationTrend.some(d => d.count > 0) ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={data.charts.userRegistrationTrend} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} interval={period === '7d' ? 0 : 'preserveStartEnd'} />
                      <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} allowDecimals={false} />
                      <Tooltip contentStyle={tt} formatter={(v) => [v, '人']} />
                      <Bar dataKey="count" fill="#10b981" radius={[6, 6, 0, 0]} name="新規登録" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <NoData />}
              </Card>
            </div>
          </section>

          {/* ── Section 3: 曜日・時間帯分析 ──────────────────────────── */}
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">曜日・時間帯分析</p>
              <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full">{periodLabel}</span>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

              <Card title="曜日別の生成分布" sub="最も利用が多い曜日を把握" badge={periodLabel}>
                {data.charts.weekdayDist.some(d => d.count > 0) ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={data.charts.weekdayDist} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#475569' }} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} allowDecimals={false} />
                      <Tooltip contentStyle={tt} formatter={fmtCount} />
                      <Bar dataKey="count" radius={[6, 6, 0, 0]} name="件数">
                        {data.charts.weekdayDist.map((_, i) => (
                          <Cell key={i} fill={i === 0 || i === 6 ? '#f59e0b' : '#10b981'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : <NoData />}
              </Card>

              <Card title="時間帯別の生成分布" sub="利用が集中する時間帯を把握" badge={periodLabel}>
                {data.charts.hourlyDist.some(d => d.count > 0) ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={data.charts.hourlyDist} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="hour" tick={{ fontSize: 9, fill: '#94a3b8' }} tickLine={false} interval={2} />
                      <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} allowDecimals={false} />
                      <Tooltip contentStyle={tt} formatter={fmtCount} />
                      <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="件数" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <NoData />}
              </Card>

            </div>
          </section>

          {/* ── Section 4: 定着指標 ──────────────────────────────────── */}
          {stats && (
            <section className="space-y-3">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">定着指標（累計）</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                <Card title="アクティビティ深度" sub="ユーザーの定着状況と利用頻度">
                  <MetricRow label="MAU 活性率"           value={`${mauEngaged}%`}      note={`全ユーザー中 30日以内に利用した割合`}     good={mauEngaged >= 30} />
                  <MetricRow label="DAU / WAU 粘着度"     value={`${dauWauRatio}%`}     note="週間アクティブ中、毎日来る割合"            good={dauWauRatio >= 20} />
                  <MetricRow label="平均生成 / MAU（今月）" value={stats.avgGensPerMau > 0 ? `${stats.avgGensPerMau} 回` : '—'} note="今月の MAU 1人あたり平均生成回数" good={stats.avgGensPerMau >= 3} />
                  <MetricRow label="MoM 新規ユーザー成長"  value={stats.newUsersMoMPct !== null ? `${stats.newUsersMoMPct >= 0 ? '+' : ''}${stats.newUsersMoMPct}%` : '—'} note={`今月 ${stats.newUsersMonth} 人 vs 先月比`} good={stats.newUsersMoMPct !== null ? stats.newUsersMoMPct >= 0 : null} />
                </Card>

                <Card title="機能採用率" sub="ユーザーがどこまで機能を活用しているか">
                  <MetricRow label="計画登録率（現在）"    value={`${planAdoptionPct}%`}              note={`計画を1件以上登録しているユーザーの割合（累計 ${stats.activePlans} 件）`} good={planAdoptionPct >= 20} />
                  <MetricRow label="練習ログ記録数（累計）" value={stats.sessionLogs.toLocaleString()} note="完了済みセッション総数"       good={stats.sessionLogs > 0} />
                  <MetricRow label="Custom 生成率（累計）" value={`${customDepthPct}%`}               note={`全メニューのうちカスタム設定で生成した割合（Quick ${stats.quickCount} / Custom ${stats.customCount} 件）`} good={customDepthPct >= 30} />
                  <MetricRow label="フィードバック受信（累計）" value={stats.feedbackTotal.toLocaleString()} note={stats.feedbackPending > 0 ? `未対応 ${stats.feedbackPending} 件あり` : '未対応なし'} good={stats.feedbackPending === 0} />
                </Card>

              </div>
            </section>
          )}

          {/* ── Section 5: 利用パターン詳細 ─────────────────────────── */}
          <section className="space-y-3">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">利用パターン詳細（累計）</p>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

              <Card title="Quick vs Custom 比率" sub="メニュー生成フロー別の累計分布" badge="累計">
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={quickCustom} dataKey="count" nameKey="name" cx="50%" cy="50%"
                      outerRadius={90} innerRadius={52} paddingAngle={4}>
                      {quickCustom.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                    </Pie>
                    <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle">
                      <tspan x="50%" dy="-6" fontSize="22" fontWeight="bold" fill="#0f172a">{total.toLocaleString()}</tspan>
                      <tspan x="50%" dy="18" fontSize="11" fill="#94a3b8">累計生成数</tspan>
                    </text>
                    <Tooltip contentStyle={tt} formatter={fmtCount} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </Card>

              <Card title="種目別メニュー数" sub="泳法ごとの累計生成数" badge="累計">
                {data.charts.strokeDist.length === 0 ? <NoData /> : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={data.charts.strokeDist} layout="vertical" margin={{ top: 0, right: 8, bottom: 0, left: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} allowDecimals={false} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: '#475569' }} tickLine={false} axisLine={false} width={36} />
                      <Tooltip contentStyle={tt} formatter={fmtCount} />
                      <Bar dataKey="count" fill="#10b981" radius={[0, 6, 6, 0]} name="件数" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </Card>

              <Card title="期別利用分布" sub="トレーニング期のシーズナリティ（累計）" badge="累計">
                {data.charts.periodDist.length === 0 ? <NoData /> : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={data.charts.periodDist} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#94a3b8' }} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} allowDecimals={false} />
                      <Tooltip contentStyle={tt} formatter={fmtCount} />
                      <Bar dataKey="count" fill="#8b5cf6" radius={[6, 6, 0, 0]} name="件数" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </Card>

              <div className="space-y-5">
                <Card title="レベル別構成" sub="ユーザー層の分布（累計）" badge="累計">
                  {data.charts.levelDist.length === 0 ? <NoData /> : (
                    <ResponsiveContainer width="100%" height={160}>
                      <BarChart data={data.charts.levelDist} margin={{ top: 0, right: 8, bottom: 0, left: -16 }}>
                        <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#475569' }} tickLine={false} />
                        <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} allowDecimals={false} />
                        <Tooltip contentStyle={tt} formatter={fmtCount} />
                        <Bar dataKey="count" radius={[6, 6, 0, 0]} name="件数">
                          {data.charts.levelDist.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </Card>
                <Card title="距離タイプ別（S / M / D）" sub="短距離・中距離・長距離の需要（累計）" badge="累計">
                  {data.charts.distTypeDist.length === 0 ? <NoData /> : (
                    <ResponsiveContainer width="100%" height={160}>
                      <BarChart data={data.charts.distTypeDist} margin={{ top: 0, right: 8, bottom: 0, left: -16 }}>
                        <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#475569' }} tickLine={false} />
                        <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} allowDecimals={false} />
                        <Tooltip contentStyle={tt} formatter={fmtCount} />
                        <Bar dataKey="count" radius={[6, 6, 0, 0]} name="件数">
                          {data.charts.distTypeDist.map((_, i) => <Cell key={i} fill={COLORS[(i + 2) % COLORS.length]} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </Card>
              </div>

            </div>
          </section>
        </>
      )}

    </div>
  );
}
