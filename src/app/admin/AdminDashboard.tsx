'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
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
    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
      up ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
    }`}>
      {up ? '▲' : '▼'} {Math.abs(pct)}%
    </span>
  );
}

// Zone 1 — 今日の速報カード（大きな数字）
function TodayCard({ label, value, unit, color, icon }: {
  label: string; value: string | number; unit: string; color: string; icon: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex items-center gap-4">
      <div className="text-3xl shrink-0">{icon}</div>
      <div className="min-w-0">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</p>
        <div className="flex items-baseline gap-1 mt-0.5">
          <span className={`text-3xl font-black tabular-nums ${color}`}>{value}</span>
          <span className="text-sm text-slate-400 font-medium">{unit}</span>
        </div>
      </div>
    </div>
  );
}

// Zone 2 — 健全性KPIカード
function KPICard({ label, value, sub, accent, icon, momPct }: {
  label: string; value: string | number; sub?: string;
  accent: string; icon: React.ReactNode; momPct?: number | null;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex gap-3 items-start">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${accent}`}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</p>
        <div className="flex items-baseline gap-1.5 mt-0.5 flex-wrap">
          <span className="text-xl font-bold text-slate-900 tabular-nums">{value}</span>
          {momPct !== undefined && <MoMBadge pct={momPct ?? null} />}
        </div>
        {sub && <p className="text-[11px] text-slate-400 mt-1">{sub}</p>}
      </div>
    </div>
  );
}

// Zone 3 — サマリー行
function SummaryRow({ label, value, sub, highlight }: {
  label: string; value: string; sub?: string; highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-slate-50 last:border-0">
      <div>
        <p className="text-sm text-slate-600">{label}</p>
        {sub && <p className="text-[10px] text-slate-400 mt-0.5">{sub}</p>}
      </div>
      <span className={`text-sm font-bold tabular-nums ml-4 shrink-0 ${highlight ? 'text-sky-600' : 'text-slate-800'}`}>
        {value}
      </span>
    </div>
  );
}

const ic = 'w-4 h-4';
const UsersIcon  = () => <svg className={ic} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="7" r="3"/><path d="M3 20v-1a6 6 0 0 1 12 0v1"/><circle cx="18" cy="8" r="2.5"/><path d="M21 20v-.5a4 4 0 0 0-5-3.87"/></svg>;
const GenIcon    = () => <svg className={ic} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>;
const ActiveIcon = () => <svg className={ic} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>;
const MsgIcon    = () => <svg className={ic} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>;

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
      <div className="flex-1 flex items-center justify-center bg-slate-50">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-sky-400 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-slate-400">データを読み込み中…</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-50">
        <div className="text-center space-y-2">
          <p className="text-red-500 text-sm">{error ?? 'データが取得できませんでした'}</p>
          <Link href="/login" className="text-xs text-slate-400 hover:text-slate-600 transition-colors">← ログインへ戻る</Link>
        </div>
      </div>
    );
  }

  const { kpi, users, charts } = data;
  const mauActivePct = kpi.totalUsers > 0 ? Math.round((kpi.mau / kpi.totalUsers) * 100) : 0;

  return (
    <div className="bg-slate-50 min-h-full p-6 space-y-6">

      {/* ── ページタイトル ─────────────────────────────────── */}
      <div>
        <h1 className="text-xl font-bold text-slate-900">概要</h1>
        <p className="text-sm text-slate-500 mt-0.5">RT Swimlab — プラットフォーム速報</p>
      </div>

      {/* ══ Zone 1: 今日の速報 ═══════════════════════════════ */}
      <section>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">今日の速報</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <TodayCard label="本日の生成数"   value={kpi.gensToday}    unit="回" color="text-amber-500" icon="✏️" />
          <TodayCard label="本日のアクティブ" value={kpi.dau}          unit="人" color="text-sky-500"  icon="🏊" />
          <TodayCard label="本日の新規登録"  value={kpi.newUsersToday} unit="人" color="text-emerald-500" icon="👤" />
        </div>
      </section>

      {/* ══ Zone 2: サービス健全性KPI ═════════════════════════ */}
      <section>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">サービス全体</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KPICard
            label="総ユーザー数"
            value={kpi.totalUsers.toLocaleString()}
            sub={`MAU 活性率 ${mauActivePct}%`}
            accent="bg-sky-50 text-sky-500"
            icon={<UsersIcon />}
          />
          <KPICard
            label="MAU（30日）"
            value={kpi.mau.toLocaleString()}
            sub={`WAU ${kpi.wau} 人 / DAU ${kpi.dau} 人`}
            accent="bg-violet-50 text-violet-500"
            icon={<ActiveIcon />}
          />
          <KPICard
            label="累計生成数"
            value={kpi.totalGenerations.toLocaleString()}
            sub={`今月 ${kpi.generationsMonth} 回`}
            momPct={kpi.gensMoMPct}
            accent="bg-amber-50 text-amber-500"
            icon={<GenIcon />}
          />
          <KPICard
            label="フィードバック"
            value={kpi.feedbackTotal.toLocaleString()}
            sub={kpi.feedbackPending > 0 ? `⚠️ 未対応 ${kpi.feedbackPending} 件` : '未対応なし'}
            accent="bg-teal-50 text-teal-500"
            icon={<MsgIcon />}
          />
        </div>
      </section>

      {/* ══ Zone 3: 週・月サマリー ＋ 登録推移グラフ ═══════════ */}
      <section>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">推移・サマリー</p>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

          {/* サマリー（週・月） */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm divide-y divide-slate-100 overflow-hidden">

            {/* 今週 */}
            <div className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-2 h-2 rounded-full bg-sky-400 shrink-0" />
                <p className="text-sm font-semibold text-slate-700">今週（過去7日間）</p>
              </div>
              <SummaryRow label="新規登録"      value={`${kpi.newUsersWeek} 人`} />
              <SummaryRow label="メニュー生成"   value={`${kpi.gensWeek} 回`} highlight />
              <SummaryRow label="週間アクティブ" value={`${kpi.wau} 人（WAU）`} />
            </div>

            {/* 今月 */}
            <div className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-2 h-2 rounded-full bg-violet-400 shrink-0" />
                <p className="text-sm font-semibold text-slate-700">今月</p>
              </div>
              <SummaryRow
                label="新規登録"
                value={`${kpi.newUsersMonth} 人`}
                sub={kpi.newUsersMoMPct !== null ? `先月比 ${kpi.newUsersMoMPct >= 0 ? '+' : ''}${kpi.newUsersMoMPct}%` : undefined}
              />
              <SummaryRow
                label="メニュー生成"
                value={`${kpi.generationsMonth} 回`}
                sub={kpi.gensMoMPct !== null ? `先月比 ${kpi.gensMoMPct >= 0 ? '+' : ''}${kpi.gensMoMPct}%` : undefined}
                highlight
              />
              <SummaryRow label="平均生成 / MAU" value={kpi.avgGensPerMau > 0 ? `${kpi.avgGensPerMau} 回` : '—'} />
            </div>

          </div>

          {/* 登録推移グラフ */}
          <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold text-slate-700">過去30日の新規登録</p>
              <div className="flex items-center gap-4 text-xs text-slate-500">
                <span>今日 <strong className="text-sky-600">{kpi.newUsersToday}</strong> 人</span>
                <span>今週 <strong className="text-violet-600">{kpi.newUsersWeek}</strong> 人</span>
                <span>今月 <strong className="text-emerald-600">{kpi.newUsersMonth}</strong> 人</span>
              </div>
            </div>
            {charts.userRegistrationTrend?.some(d => d.count > 0) ? (
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={charts.userRegistrationTrend} margin={{ top: 2, right: 4, bottom: 0, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#94a3b8' }} tickLine={false} interval={6} />
                  <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={tt} formatter={(v) => [v, '人']} />
                  <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} name="新規登録" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-40 text-xs text-slate-300">
                この期間の登録者データなし
              </div>
            )}
          </div>

        </div>
      </section>

      {/* ══ Zone 4: ユーザーテーブル ════════════════════════════ */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-700">ユーザー一覧（利用回数順・上位 20 件）</p>
          <Link href="/admin/customers" className="text-xs text-sky-500 hover:text-sky-700 transition-colors font-medium">
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
