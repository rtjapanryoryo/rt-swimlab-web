'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

interface KPI {
  totalUsers:       number;
  newUsersMonth:    number;
  newUsersMoMPct:   number | null;
  newUsersWeek:     number;
  newUsersToday:    number;
  totalGenerations: number;
  generationsMonth: number;
  gensMoMPct:       number | null;
  gensWeek:         number;
  gensToday:        number;
  dau:              number;
  wau:              number;
  mau:              number;
  avgGensPerMau:    number;
  quickCount:       number;
  customCount:      number;
  activePlans:      number;
  sessionLogs:      number;
  feedbackTotal:    number;
  feedbackPending:  number;
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
  kpi: KPI;
  users: UserRow[];
  charts: {
    userRegistrationTrend: { date: string; count: number }[];
  };
}

const fmt = (s: string | null, opts: Intl.DateTimeFormatOptions) =>
  s ? new Date(s).toLocaleDateString('ja-JP', opts) : '—';

const tt = { fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' };

function MoMBadge({ pct }: { pct: number | null }) {
  if (pct === null) return null;
  const up = pct >= 0;
  return (
    <span className={`ml-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
      up ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
    }`}>
      {up ? '▲' : '▼'} {Math.abs(pct)}%
    </span>
  );
}

function KPICard({
  label, value, sub, accent, icon, momPct,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent: string;
  icon: React.ReactNode;
  momPct?: number | null;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex gap-4 items-start">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${accent}`}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</p>
        <p className="text-2xl font-bold text-slate-900 tabular-nums mt-0.5 flex items-baseline gap-1">
          {value}
          {momPct !== undefined && <MoMBadge pct={momPct ?? null} />}
        </p>
        {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
      </div>
    </div>
  );
}

const ic = 'w-5 h-5';
const UsersIcon   = () => <svg className={ic} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="7" r="3"/><path d="M3 20v-1a6 6 0 0 1 12 0v1"/><circle cx="18" cy="8" r="2.5"/><path d="M21 20v-.5a4 4 0 0 0-5-3.87"/></svg>;
const GenIcon     = () => <svg className={ic} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>;
const ActiveIcon  = () => <svg className={ic} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>;
const RetainIcon  = () => <svg className={ic} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
const EngageIcon  = () => <svg className={ic} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>;
const CalIcon     = () => <svg className={ic} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>;

export default function AdminDashboard() {
  const [data, setData]       = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

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
          <Link href="/login" className="text-xs text-slate-400 hover:text-slate-600 transition-colors">← ログインへ戻る</Link>
        </div>
      </div>
    );
  }

  const { kpi, users, charts } = data;

  return (
    <div className="p-6 space-y-8">

      {/* ヘッダー */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">概要</h1>
          <p className="text-sm text-slate-500 mt-0.5">RT Swimlab — プラットフォーム速報</p>
        </div>
      </div>

      {/* ── ユーザー指標 ───────────────────────────────────────────── */}
      <div>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">ユーザー</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            label="総ユーザー数"
            value={kpi.totalUsers.toLocaleString()}
            accent="bg-sky-50 text-sky-500"
            icon={<UsersIcon />}
          />
          <KPICard
            label="MAU（30日）"
            value={kpi.mau.toLocaleString()}
            sub={kpi.totalUsers > 0 ? `活性率 ${Math.round((kpi.mau / kpi.totalUsers) * 100)}%` : undefined}
            accent="bg-violet-50 text-violet-500"
            icon={<ActiveIcon />}
          />
          <KPICard
            label="今月の新規"
            value={kpi.newUsersMonth.toLocaleString()}
            momPct={kpi.newUsersMoMPct}
            accent="bg-emerald-50 text-emerald-500"
            icon={<UsersIcon />}
          />
          <KPICard
            label="フィードバック受信"
            value={kpi.feedbackTotal.toLocaleString()}
            sub={kpi.feedbackPending > 0 ? `未対応 ${kpi.feedbackPending} 件` : '未対応なし'}
            accent="bg-teal-50 text-teal-500"
            icon={<RetainIcon />}
          />
        </div>
      </div>

      {/* ── エンゲージメント指標 ───────────────────────────────────── */}
      <div>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">エンゲージメント</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            label="累計生成数"
            value={kpi.totalGenerations.toLocaleString()}
            sub="全期間"
            accent="bg-sky-50 text-sky-500"
            icon={<GenIcon />}
          />
          <KPICard
            label="今月の生成数"
            value={kpi.generationsMonth.toLocaleString()}
            momPct={kpi.gensMoMPct}
            accent="bg-amber-50 text-amber-500"
            icon={<GenIcon />}
          />
          <KPICard
            label="DAU / WAU"
            value={`${kpi.dau} / ${kpi.wau}`}
            sub="本日 / 7日間 アクティブ"
            accent="bg-orange-50 text-orange-500"
            icon={<EngageIcon />}
          />
          <KPICard
            label="平均生成数 / MAU"
            value={kpi.avgGensPerMau > 0 ? `${kpi.avgGensPerMau}回` : '—'}
            sub="今月 MAU 1人あたり"
            accent="bg-rose-50 text-rose-500"
            icon={<EngageIcon />}
          />
        </div>
      </div>

      {/* ── 登録者数推移 ──────────────────────────────────────────── */}
      <div>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">登録者数推移</p>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* 日/週/月ごとの新規登録数 */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
            <p className="text-sm font-semibold text-slate-700">新規登録（期間別）</p>
            <div className="space-y-3">
              {[
                { label: '今日',  value: kpi.newUsersToday, accent: 'text-sky-600',    bg: 'bg-sky-50'    },
                { label: '今週',  value: kpi.newUsersWeek,  accent: 'text-violet-600', bg: 'bg-violet-50' },
                { label: '今月',  value: kpi.newUsersMonth, accent: 'text-emerald-600', bg: 'bg-emerald-50', badge: kpi.newUsersMoMPct },
              ].map(({ label, value, accent, bg, badge }) => (
                <div key={label} className={`flex items-center justify-between px-4 py-3 rounded-xl ${bg}`}>
                  <div className="flex items-center gap-2">
                    <CalIcon />
                    <span className="text-xs font-semibold text-slate-600">{label}</span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className={`text-xl font-bold tabular-nums ${accent}`}>{value}</span>
                    <span className="text-xs text-slate-500">人</span>
                    {badge !== undefined && <MoMBadge pct={badge} />}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 30日間の登録者グラフ */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <p className="text-sm font-semibold text-slate-700 mb-4">過去30日の日別新規登録</p>
            {charts.userRegistrationTrend?.some(d => d.count > 0) ? (
              <ResponsiveContainer width="100%" height={140}>
                <BarChart data={charts.userRegistrationTrend} margin={{ top: 2, right: 4, bottom: 0, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#94a3b8' }} tickLine={false} interval={6} />
                  <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={tt} formatter={(v) => [v, '人']} />
                  <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} name="新規登録" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-36 text-xs text-slate-300">
                この期間の登録者データなし
              </div>
            )}
          </div>

        </div>
      </div>

      {/* ── 週報 / 月報 ───────────────────────────────────────────── */}
      <div>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">週報 / 月報</p>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* 週報 */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-sky-400" />
              <p className="text-sm font-semibold text-slate-700">今週のサマリー（過去7日間）</p>
            </div>
            <div className="divide-y divide-slate-50">
              {[
                { label: '新規登録',   value: `${kpi.newUsersWeek} 人` },
                { label: 'メニュー生成', value: `${kpi.gensWeek} 回` },
                { label: '本日のアクティブ', value: `${kpi.dau} 人（DAU）` },
                { label: '週間アクティブ', value: `${kpi.wau} 人（WAU）` },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between py-2.5">
                  <span className="text-sm text-slate-500">{label}</span>
                  <span className="text-sm font-semibold text-slate-800 tabular-nums">{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 月報 */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-violet-400" />
              <p className="text-sm font-semibold text-slate-700">今月のサマリー</p>
            </div>
            <div className="divide-y divide-slate-50">
              {[
                { label: '新規登録',   value: `${kpi.newUsersMonth} 人`, sub: kpi.newUsersMoMPct !== null ? `先月比 ${kpi.newUsersMoMPct >= 0 ? '+' : ''}${kpi.newUsersMoMPct}%` : undefined },
                { label: 'メニュー生成', value: `${kpi.generationsMonth} 回`, sub: kpi.gensMoMPct !== null ? `先月比 ${kpi.gensMoMPct >= 0 ? '+' : ''}${kpi.gensMoMPct}%` : undefined },
                { label: 'MAU',       value: `${kpi.mau} 人` },
                { label: '平均生成/MAU', value: `${kpi.avgGensPerMau > 0 ? kpi.avgGensPerMau : '—'} 回` },
              ].map(({ label, value, sub }) => (
                <div key={label} className="flex items-center justify-between py-2.5">
                  <div>
                    <span className="text-sm text-slate-500">{label}</span>
                    {sub && <p className="text-[10px] text-slate-400">{sub}</p>}
                  </div>
                  <span className="text-sm font-semibold text-slate-800 tabular-nums">{value}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* ── 生成数推移（30日）───────────────────────────────────── */}
      <div>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">本日 / 今週の生成数</p>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">本日の生成数</p>
            <p className="text-3xl font-bold text-amber-500 tabular-nums mt-1">{kpi.gensToday.toLocaleString()}</p>
            <p className="text-xs text-slate-400 mt-1">回</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">今週の生成数</p>
            <p className="text-3xl font-bold text-sky-500 tabular-nums mt-1">{kpi.gensWeek.toLocaleString()}</p>
            <p className="text-xs text-slate-400 mt-1">回</p>
          </div>
        </div>
      </div>

      {/* ── ユーザーテーブル ───────────────────────────────────────── */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-700">ユーザー一覧（利用回数順・上位 20 件）</p>
          <Link href="/admin/customers" className="text-xs text-sky-500 hover:text-sky-700 transition-colors">
            顧客管理 →
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100">
            <thead className="bg-slate-50">
              <tr>
                {['#', '名前', '累計生成', '役割', '最終利用', '登録日'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
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
                      <div>
                        <p className="text-sm font-medium text-slate-900">{u.display_name ?? '（未設定）'}</p>
                        {u.role !== 'user' && (
                          <span className={`text-[10px] font-bold ${u.role === 'coach' ? 'text-cyan-600' : 'text-amber-600'}`}>
                            {u.role.toUpperCase()}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold text-slate-800 tabular-nums">
                    {u.total_usage_count.toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2.5 py-0.5 text-xs rounded-full font-semibold ${
                      u.role === 'admin' ? 'bg-amber-100 text-amber-700' :
                      u.role === 'coach' ? 'bg-cyan-100 text-cyan-700' :
                      'bg-slate-100 text-slate-600'
                    }`}>
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
