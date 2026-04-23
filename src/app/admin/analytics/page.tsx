'use client';

import { useState, useEffect } from 'react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import type { ValueType } from 'recharts/types/component/DefaultTooltipContent';

const fmtCount = (v: ValueType | undefined) => [v ?? 0, '件'] as [ValueType, string];
const COLORS = ['#0ea5e9', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#64748b', '#06b6d4'];
const tt = { fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' };

interface KPI {
  totalUsers:       number;
  newUsersMonth:    number;
  newUsersMoMPct:   number | null;
  totalGenerations: number;
  generationsMonth: number;
  gensMoMPct:       number | null;
  dau:              number;
  wau:              number;
  mau:              number;
  avgGensPerMau:    number;
  wowRetentionPct:  number | null;
  quickCount:       number;
  customCount:      number;
  activePlans:      number;
  sessionLogs:      number;
}

interface StatsData {
  charts: {
    dailyTrend:   { date: string; count: number }[];
    strokeDist:   { name: string; count: number }[];
    periodDist:   { name: string; count: number }[];
    levelDist:    { name: string; count: number }[];
    distTypeDist: { name: string; count: number }[];
  };
  kpi: KPI;
}

function Card({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
      <div className="mb-5">
        <p className="text-sm font-semibold text-slate-700">{title}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
      {children}
    </div>
  );
}

function MetricRow({ label, value, note, good }: { label: string; value: string; note?: string; good?: boolean | null }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-slate-100 last:border-0">
      <div>
        <p className="text-sm text-slate-700">{label}</p>
        {note && <p className="text-[11px] text-slate-400 mt-0.5">{note}</p>}
      </div>
      <span className={`text-sm font-bold tabular-nums ${
        good === true ? 'text-emerald-600' : good === false ? 'text-red-500' : 'text-slate-800'
      }`}>
        {value}
      </span>
    </div>
  );
}

function NoData() {
  return <p className="text-xs text-slate-400 py-10 text-center">データなし</p>;
}

export default function AnalyticsPage() {
  const [data, setData]       = useState<StatsData | null>(null);
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
      <div className="flex items-center justify-center flex-1">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-sky-400 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-slate-400">読み込み中…</p>
        </div>
      </div>
    );
  }

  if (!data) return <div className="p-6 text-slate-500 text-sm">データを取得できませんでした</div>;

  const { charts, kpi } = data;
  const total = kpi.quickCount + kpi.customCount;
  const quickCustom = [
    { name: 'Quick',  count: kpi.quickCount  },
    { name: 'Custom', count: kpi.customCount },
  ];

  // ── コンサル向け指標の評価 ────────────────────────────────────────────
  const dauWauRatio      = kpi.wau > 0 ? Math.round((kpi.dau / kpi.wau) * 100) : 0;
  const mauEngaged       = kpi.mau > 0 && kpi.totalUsers > 0
    ? Math.round((kpi.mau / kpi.totalUsers) * 100) : 0;
  const planAdoptionPct  = kpi.totalUsers > 0
    ? Math.round((kpi.activePlans / kpi.totalUsers) * 100) : 0;
  const logAdoptionPct   = kpi.totalUsers > 0
    ? Math.round((Math.min(kpi.sessionLogs, kpi.totalUsers) / kpi.totalUsers) * 100) : 0;
  const customDepthPct   = total > 0 ? Math.round((kpi.customCount / total) * 100) : 0;

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

      {/* ── Section 1: 成長・定着指標（コンサル / アナリスト向け） ───── */}
      <section className="space-y-3">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">成長・定着指標</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* リテンション・アクティビティ深度 */}
          <Card
            title="リテンション & アクティビティ深度"
            sub="ユーザーの定着状況と利用頻度"
          >
            <MetricRow
              label="WoW リテンション"
              value={kpi.wowRetentionPct !== null ? `${kpi.wowRetentionPct}%` : '—'}
              note="先週アクティブ → 今週も継続した割合"
              good={kpi.wowRetentionPct !== null ? kpi.wowRetentionPct >= 40 : null}
            />
            <MetricRow
              label="MAU 活性率"
              value={`${mauEngaged}%`}
              note="全ユーザー中 30 日以内に利用した割合"
              good={mauEngaged >= 30}
            />
            <MetricRow
              label="DAU / WAU 比率"
              value={`${dauWauRatio}%`}
              note="週間アクティブ中、毎日来る割合（粘着度）"
              good={dauWauRatio >= 20}
            />
            <MetricRow
              label="平均生成 / MAU"
              value={kpi.avgGensPerMau > 0 ? `${kpi.avgGensPerMau} 回` : '—'}
              note="今月の MAU 1 人あたり平均生成回数"
              good={kpi.avgGensPerMau >= 3}
            />
          </Card>

          {/* 機能別採用率 */}
          <Card
            title="機能採用率（Feature Adoption)"
            sub="ユーザーがどこまでプロダクトを活用しているか"
          >
            <MetricRow
              label="トレーニング計画 採用率"
              value={`${planAdoptionPct}%`}
              note={`全 ${kpi.totalUsers} ユーザー中 計画を登録した割合（延べ ${kpi.activePlans} 件）`}
              good={planAdoptionPct >= 20}
            />
            <MetricRow
              label="練習ログ 記録率"
              value={`${logAdoptionPct}%`}
              note={`セッションログ累計 ${kpi.sessionLogs.toLocaleString()} 件（ユーザーあたり換算）`}
              good={logAdoptionPct >= 15}
            />
            <MetricRow
              label="Custom 生成率"
              value={`${customDepthPct}%`}
              note="全メニューのうち カスタム設定（詳細入力）で生成した割合"
              good={customDepthPct >= 30}
            />
            <MetricRow
              label="MoM 新規ユーザー成長"
              value={kpi.newUsersMoMPct !== null ? `${kpi.newUsersMoMPct >= 0 ? '+' : ''}${kpi.newUsersMoMPct}%` : '—'}
              note={`今月 ${kpi.newUsersMonth} 人 vs 先月比`}
              good={kpi.newUsersMoMPct !== null ? kpi.newUsersMoMPct >= 0 : null}
            />
          </Card>

        </div>

        {/* 判断ガイド */}
        <div className="bg-slate-50 rounded-xl border border-slate-200 px-5 py-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-500">
          <div>
            <p className="font-bold text-slate-700 mb-1">WoW リテンション</p>
            <p>≥ 40% = 良好 / 25–39% = 要観察 / &lt;25% = 改善必要。スイミングの週次リズムにより他アプリより低めが自然。</p>
          </div>
          <div>
            <p className="font-bold text-slate-700 mb-1">MAU 活性率</p>
            <p>≥ 30% = エンゲージメント良好。試合シーズンで上昇、オフシーズンで低下するサイクル変動を考慮。</p>
          </div>
          <div>
            <p className="font-bold text-slate-700 mb-1">機能採用率の読み方</p>
            <p>計画→ログと段階的に定着するはず。計画採用率が低ければ UI/UX、ログ記録率が低ければリマインダー改善を検討。</p>
          </div>
        </div>
      </section>

      {/* ── Section 2: 利用トレンド ───────────────────────────────────── */}
      <section className="space-y-3">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">利用トレンド（過去 30 日）</p>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-4">
          {[
            { label: '累計生成',   value: kpi.totalGenerations.toLocaleString(), color: 'text-sky-600'    },
            { label: '今月生成',   value: kpi.generationsMonth.toLocaleString(), color: 'text-emerald-600' },
            { label: 'DAU / WAU', value: `${kpi.dau} / ${kpi.wau}`,             color: 'text-amber-600'  },
            { label: 'Quick 率',  value: total > 0 ? `${Math.round(kpi.quickCount / total * 100)}%` : '—', color: 'text-violet-600' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</p>
              <p className={`text-2xl font-bold mt-1 tabular-nums ${color}`}>{value}</p>
            </div>
          ))}
        </div>

        <Card title="日別生成回数トレンド">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={charts.dailyTrend} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} interval={4} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip contentStyle={tt} formatter={fmtCount} />
              <Line type="monotone" dataKey="count" stroke="#0ea5e9" strokeWidth={2.5} dot={false} name="生成回数" />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </section>

      {/* ── Section 3: 利用パターン詳細 ─────────────────────────────── */}
      <section className="space-y-3">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">利用パターン詳細</p>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          <Card title="Quick vs Custom 比率" sub="UI フロー別の利用分布">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={quickCustom} dataKey="count" nameKey="name" cx="50%" cy="50%"
                  outerRadius={90} innerRadius={52} paddingAngle={4}>
                  {quickCustom.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                </Pie>
                <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle">
                  <tspan x="50%" dy="-6" fontSize="22" fontWeight="bold" fill="#0f172a">{total.toLocaleString()}</tspan>
                  <tspan x="50%" dy="18" fontSize="11" fill="#94a3b8">総生成数</tspan>
                </text>
                <Tooltip contentStyle={tt} formatter={fmtCount} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </Card>

          <Card title="種目別メニュー数" sub="どの泳法で多く生成されているか">
            {charts.strokeDist.length === 0 ? <NoData /> : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={charts.strokeDist} layout="vertical" margin={{ top: 0, right: 8, bottom: 0, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: '#475569' }} tickLine={false} axisLine={false} width={36} />
                  <Tooltip contentStyle={tt} formatter={fmtCount} />
                  <Bar dataKey="count" fill="#10b981" radius={[0, 6, 6, 0]} name="件数" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>

          <Card title="期別利用分布" sub="どのトレーニング期に生成が集中するか（シーズナリティ）">
            {charts.periodDist.length === 0 ? <NoData /> : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={charts.periodDist} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#94a3b8' }} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={tt} formatter={fmtCount} />
                  <Bar dataKey="count" fill="#8b5cf6" radius={[6, 6, 0, 0]} name="件数" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>

          <div className="space-y-6">
            <Card title="レベル別構成" sub="ユーザー層の分布（初中級 / 中級 / 上級）">
              {charts.levelDist.length === 0 ? <NoData /> : (
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={charts.levelDist} margin={{ top: 0, right: 8, bottom: 0, left: -16 }}>
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#475569' }} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={tt} formatter={fmtCount} />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]} name="件数">
                      {charts.levelDist.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Card>
            <Card title="距離タイプ別（S / M / D）" sub="短距離・中距離・長距離の需要">
              {charts.distTypeDist.length === 0 ? <NoData /> : (
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={charts.distTypeDist} margin={{ top: 0, right: 8, bottom: 0, left: -16 }}>
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#475569' }} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={tt} formatter={fmtCount} />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]} name="件数">
                      {charts.distTypeDist.map((_, i) => <Cell key={i} fill={COLORS[(i + 2) % COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Card>
          </div>

        </div>
      </section>

    </div>
  );
}
