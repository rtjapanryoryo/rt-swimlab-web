'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

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
}

const fmt = (s: string | null, opts: Intl.DateTimeFormatOptions) =>
  s ? new Date(s).toLocaleDateString('ja-JP', opts) : '—';

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
const UsersIcon    = () => <svg className={ic} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="7" r="3"/><path d="M3 20v-1a6 6 0 0 1 12 0v1"/><circle cx="18" cy="8" r="2.5"/><path d="M21 20v-.5a4 4 0 0 0-5-3.87"/></svg>;
const GenIcon      = () => <svg className={ic} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>;
const ActiveIcon   = () => <svg className={ic} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>;
const RetainIcon   = () => <svg className={ic} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
const PlanIcon     = () => <svg className={ic} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>;
const SessionIcon  = () => <svg className={ic} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>;
const SplitIcon    = () => <svg className={ic} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="8" rx="1.5"/><rect x="14" y="3" width="7" height="4" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="10" width="7" height="11" rx="1.5"/></svg>;
const EngageIcon   = () => <svg className={ic} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>;

export default function AdminDashboard() {
  const [data, setData]     = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState<string | null>(null);

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

  const { kpi, users } = data;
  const totalMenus = kpi.quickCount + kpi.customCount;

  return (
    <div className="p-6 space-y-6">

      {/* ヘッダー */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">概要</h1>
          <p className="text-sm text-slate-500 mt-0.5">RT Swimlab — プラットフォーム速報</p>
        </div>
        <Link href="/mypage" className="text-xs text-slate-400 hover:text-slate-700 transition-colors px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:border-slate-300">
          ← マイページ
        </Link>
      </div>


      {/* ── ユーザー指標 ───────────────────────────────────────────── */}
      <div>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">ユーザー</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            label="総ユーザー"
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
            icon={<SplitIcon />}
          />
        </div>
      </div>

      {/* ── 機能別利用状況 ────────────────────────────────────────── */}
      <div>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">機能別利用</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            label="カスタム生成（累計）"
            value={kpi.customCount.toLocaleString()}
            sub={totalMenus > 0 ? `全体の ${Math.round((kpi.customCount / totalMenus) * 100)}%・Quick ${kpi.quickCount} 件` : undefined}
            accent="bg-indigo-50 text-indigo-500"
            icon={<SplitIcon />}
          />
          <KPICard
            label="計画登録（現在）"
            value={kpi.activePlans.toLocaleString()}
            sub={kpi.totalUsers > 0 ? `登録率 ${Math.round((kpi.activePlans / kpi.totalUsers) * 100)}%` : '登録プラン総数'}
            accent="bg-cyan-50 text-cyan-500"
            icon={<PlanIcon />}
          />
          <KPICard
            label="練習ログ（累計）"
            value={kpi.sessionLogs.toLocaleString()}
            sub="完了済みセッション数"
            accent="bg-emerald-50 text-emerald-500"
            icon={<SessionIcon />}
          />
          <KPICard
            label="ログ / 計画（比率）"
            value={kpi.activePlans > 0 ? `${Math.round(kpi.sessionLogs / kpi.activePlans * 10) / 10}回` : '—'}
            sub="計画1件あたり平均ログ数"
            accent="bg-teal-50 text-teal-500"
            icon={<SessionIcon />}
          />
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
                      <span className="text-sm font-medium text-slate-900">
                        {u.display_name ?? '（未設定）'}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold text-slate-800 tabular-nums">
                    {u.total_usage_count.toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2.5 py-0.5 text-xs rounded-full font-semibold ${
                      u.role === 'admin' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'
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
