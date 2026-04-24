'use client';

import { useState, useEffect, useMemo } from 'react';

interface Customer {
  id: string;
  display_name: string | null;
  role: string;
  plan: string;
  status: string;
  price_monthly: number;
  total_spend: number;
  total_usage_count: number;
  month_count: number;
  quick_count: number;
  custom_count: number;
  freq_per_week: number;
  days_active: number;
  created_at: string;
  first_menu_at: string | null;
  last_active: string | null;
  sub_started_at: string | null;
}

type SortKey = 'total_usage_count' | 'total_spend' | 'freq_per_week' | 'last_active' | 'created_at';

const PLAN_STYLES: Record<string, { badge: string; dot: string }> = {
  free:  { badge: 'bg-slate-100 text-slate-600',   dot: 'bg-slate-400'   },
  basic: { badge: 'bg-sky-100 text-sky-700',        dot: 'bg-sky-500'     },
  pro:   { badge: 'bg-violet-100 text-violet-700',  dot: 'bg-violet-500'  },
};

const fmtDate = (s: string | null) =>
  s ? new Date(s).toLocaleDateString('ja-JP', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—';

const fmtDateShort = (s: string | null) =>
  s ? new Date(s).toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' }) : '—';

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');
  const [planFilter, setPlan] = useState('all');
  const [sortKey, setSortKey] = useState<SortKey>('total_usage_count');
  const [sortAsc, setSortAsc] = useState(false);

  useEffect(() => {
    fetch('/api/admin/customers', { credentials: 'include' })
      .then(r => r.json())
      .then(d => setCustomers(d.customers ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    let list = customers;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(c => (c.display_name ?? '').toLowerCase().includes(q));
    }
    if (planFilter !== 'all') list = list.filter(c => c.plan === planFilter);
    list = [...list].sort((a, b) => {
      const av = a[sortKey] ?? '';
      const bv = b[sortKey] ?? '';
      return sortAsc
        ? String(av).localeCompare(String(bv), undefined, { numeric: true })
        : String(bv).localeCompare(String(av), undefined, { numeric: true });
    });
    return list;
  }, [customers, search, planFilter, sortKey, sortAsc]);

  const totalRevenue = customers.reduce((s, c) => s + c.total_spend, 0);
  const avgFreq      = customers.length ? (customers.reduce((s, c) => s + c.freq_per_week, 0) / customers.length).toFixed(1) : '0';
  const paidCount    = customers.filter(c => c.plan !== 'free').length;

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(p => !p);
    else { setSortKey(key); setSortAsc(false); }
  };

  const downloadCSV = () => { window.location.href = '/api/admin/export?type=customers'; };

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

  const SortTh = ({ k, label }: { k: SortKey; label: string }) => (
    <th
      onClick={() => handleSort(k)}
      className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-slate-700 select-none whitespace-nowrap"
    >
      <span className="flex items-center gap-1">
        {label}
        <span className={`text-[10px] ${sortKey === k ? 'text-sky-500' : 'text-slate-300'}`}>
          {sortKey === k ? (sortAsc ? '▲' : '▼') : '⇅'}
        </span>
      </span>
    </th>
  );

  return (
    <div className="p-6 space-y-6">

      {/* ヘッダー */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">顧客管理</h1>
          <p className="text-sm text-slate-500 mt-0.5">利用頻度・収益・行動パターンの詳細分析</p>
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

      {/* サマリカード */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: '総顧客数',     value: customers.length,              accent: 'bg-sky-50 text-sky-600' },
          { label: '累計収益',     value: `¥${totalRevenue.toLocaleString()}`, accent: 'bg-emerald-50 text-emerald-600' },
          { label: '有料会員',     value: paidCount,                      accent: 'bg-violet-50 text-violet-600' },
          { label: '平均週間頻度', value: `${avgFreq} 回/週`,             accent: 'bg-amber-50 text-amber-600' },
        ].map(({ label, value, accent }) => (
          <div key={label} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</p>
            <p className={`text-2xl font-bold mt-1 tabular-nums ${accent}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* フィルター */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text"
            placeholder="名前で検索..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-sky-400 w-52"
          />
        </div>
        <select
          value={planFilter}
          onChange={e => setPlan(e.target.value)}
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-sky-400"
        >
          <option value="all">すべてのプラン</option>
          <option value="free">Free</option>
          <option value="basic">Basic</option>
          <option value="pro">Pro</option>
        </select>
        <span className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded-full">{filtered.length} 件</span>
      </div>

      {/* テーブル */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">顧客</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">プラン</th>
                <SortTh k="total_spend"       label="累計収益" />
                <SortTh k="total_usage_count" label="累計利用" />
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Quick / Custom</th>
                <SortTh k="freq_per_week"     label="週頻度" />
                <SortTh k="last_active"       label="最終利用" />
                <SortTh k="created_at"        label="登録日" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(c => {
                const total    = c.quick_count + c.custom_count;
                const quickPct = total > 0 ? Math.round(c.quick_count / total * 100) : 0;
                const style    = PLAN_STYLES[c.plan] ?? PLAN_STYLES.free;
                return (
                  <tr key={c.id} className="hover:bg-slate-50/60 transition-colors">
                    {/* 顧客名 */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-sky-100 flex items-center justify-center shrink-0">
                          <span className="text-xs font-bold text-sky-600">
                            {(c.display_name ?? '?').charAt(0)}
                          </span>
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm font-medium text-slate-900 leading-tight">
                              {c.display_name ?? '（未設定）'}
                            </p>
                            {c.role === 'admin' && (
                              <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-amber-100 text-amber-700">ADMIN</span>
                            )}
                            {c.role === 'coach' && (
                              <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-cyan-100 text-cyan-700">COACH</span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400 leading-tight">{c.days_active} 日アクティブ</p>
                        </div>
                      </div>
                    </td>
                    {/* プラン */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${style.dot}`} />
                        <span className={`px-2 py-0.5 text-xs rounded-full font-semibold ${style.badge}`}>
                          {c.plan.charAt(0).toUpperCase() + c.plan.slice(1)}
                        </span>
                      </div>
                    </td>
                    {/* 累計収益 */}
                    <td className="px-4 py-3 text-sm font-semibold text-slate-800 tabular-nums">
                      {c.total_spend > 0 ? `¥${c.total_spend.toLocaleString()}` : <span className="text-slate-300">—</span>}
                    </td>
                    {/* 累計利用 */}
                    <td className="px-4 py-3">
                      <span className="text-sm font-bold text-slate-800 tabular-nums">{c.total_usage_count}</span>
                      <span className="text-xs text-slate-400 ml-1">回</span>
                    </td>
                    {/* Quick/Custom */}
                    <td className="px-4 py-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <div className="w-20 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-sky-400 rounded-full transition-all" style={{ width: `${quickPct}%` }} />
                          </div>
                          <span className="text-[11px] text-slate-500 tabular-nums whitespace-nowrap">{quickPct}%</span>
                        </div>
                        <p className="text-[11px] text-slate-400 tabular-nums">{c.quick_count}Q · {c.custom_count}C</p>
                      </div>
                    </td>
                    {/* 週頻度 */}
                    <td className="px-4 py-3 text-sm text-slate-600 tabular-nums whitespace-nowrap">
                      {c.freq_per_week > 0 ? `${c.freq_per_week}/週` : <span className="text-slate-300">—</span>}
                    </td>
                    {/* 最終利用 */}
                    <td className="px-4 py-3 text-sm text-slate-500 whitespace-nowrap">{fmtDate(c.last_active)}</td>
                    {/* 登録日 */}
                    <td className="px-4 py-3 text-sm text-slate-400 whitespace-nowrap">{fmtDateShort(c.created_at)}</td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-14 text-center">
                    <p className="text-sm text-slate-400">該当する顧客が見つかりません</p>
                    <p className="text-xs text-slate-300 mt-1">検索条件を変更してください</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
