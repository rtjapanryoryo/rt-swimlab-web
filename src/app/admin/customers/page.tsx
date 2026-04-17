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

const PLAN_COLORS: Record<string, string> = {
  free:  'bg-slate-100 text-slate-600',
  basic: 'bg-sky-100 text-sky-700',
  pro:   'bg-violet-100 text-violet-700',
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

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(p => !p);
    else { setSortKey(key); setSortAsc(false); }
  };

  const downloadCSV = () => {
    window.location.href = '/api/admin/export?type=customers';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const SortTh = ({ k, label }: { k: SortKey; label: string }) => (
    <th
      onClick={() => handleSort(k)}
      className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-slate-700 select-none whitespace-nowrap"
    >
      {label}{sortKey === k ? (sortAsc ? ' ↑' : ' ↓') : ''}
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
          { label: '総顧客数',     value: customers.length },
          { label: '累計収益',     value: `¥${totalRevenue.toLocaleString()}` },
          { label: '有料会員',     value: customers.filter(c => c.plan !== 'free').length },
          { label: '平均週間頻度', value: `${avgFreq} 回` },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</p>
            <p className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">{value}</p>
          </div>
        ))}
      </div>

      {/* フィルター */}
      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="名前で検索..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-sky-400 w-56"
        />
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
        <span className="text-sm text-slate-400 self-center">{filtered.length} 件</span>
      </div>

      {/* テーブル */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">顧客名</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">プラン</th>
                <SortTh k="total_spend"       label="累計収益" />
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">月額</th>
                <SortTh k="total_usage_count" label="累計利用" />
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Quick/Custom</th>
                <SortTh k="freq_per_week"     label="週間頻度" />
                <SortTh k="last_active"       label="最終利用" />
                <SortTh k="created_at"        label="登録日" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(c => {
                const total = c.quick_count + c.custom_count;
                const quickPct = total > 0 ? Math.round(c.quick_count / total * 100) : 0;
                return (
                  <tr key={c.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-sky-100 flex items-center justify-center shrink-0">
                          <span className="text-[11px] font-bold text-sky-600">
                            {(c.display_name ?? '?').charAt(0)}
                          </span>
                        </div>
                        <span className="text-sm font-medium text-slate-900">
                          {c.display_name ?? '（未設定）'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 text-xs rounded-full font-semibold ${PLAN_COLORS[c.plan] ?? PLAN_COLORS.free}`}>
                        {c.plan.charAt(0).toUpperCase() + c.plan.slice(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-slate-800 tabular-nums">
                      {c.total_spend > 0 ? `¥${c.total_spend.toLocaleString()}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600 tabular-nums">
                      {c.price_monthly > 0 ? `¥${c.price_monthly.toLocaleString()}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700 tabular-nums font-mono">
                      {c.total_usage_count}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                          <div className="h-full bg-sky-400 rounded-full" style={{ width: `${quickPct}%` }} />
                        </div>
                        <span className="text-[11px] text-slate-500 tabular-nums">
                          {c.quick_count}Q {c.custom_count}C
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600 tabular-nums">
                      {c.freq_per_week}/週
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-500">
                      {fmtDate(c.last_active)}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-400">
                      {fmtDateShort(c.created_at)}
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-sm text-slate-400">
                    該当する顧客がいません
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
