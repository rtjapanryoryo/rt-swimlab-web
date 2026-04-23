'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import type { Feedback, FeedbackCategory, FeedbackStatus } from '@/types/feedback';
import { CATEGORY_META, STATUS_META, DONE_STATUSES } from '@/types/feedback';

// ── 定数 ──────────────────────────────────────────────────────
const CAT_COLORS: Record<string, string> = {
  bug: '#ef4444', feature: '#3b82f6', ux: '#8b5cf6', content: '#14b8a6', other: '#94a3b8',
};
const STATUS_COLORS: Record<string, string> = {
  pending: '#f59e0b', in_progress: '#3b82f6', resolved: '#10b981', dismissed: '#94a3b8',
};
const ALL = 'all' as const;
type FilterStatus   = FeedbackStatus | typeof ALL;
type FilterCategory = FeedbackCategory | typeof ALL;

const tt = { fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' };

// ── 型 ────────────────────────────────────────────────────────
interface FeedbackWithProfile extends Feedback {
  profiles?: { display_name: string | null } | null;
}

interface Charts {
  catCounts:    { name: string; count: number }[];
  statusCounts: { name: string; count: number }[];
  trend:        { date: string; count: number }[];
}

interface ApiResponse {
  feedbacks: FeedbackWithProfile[];
  total:     number;
  charts:    Charts;
}

// ── ユーティリティ ─────────────────────────────────────────────
function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function fmtDateShort(s: string) {
  return new Date(s).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' });
}

// ── KPIカード ─────────────────────────────────────────────────
function KpiCard({ label, value, sub, color }: { label: string; value: number; sub?: string; color: string }) {
  return (
    <div className={`rounded-2xl border ${color} p-5 space-y-1`}>
      <p className="text-xs font-semibold text-slate-500">{label}</p>
      <p className="text-3xl font-black text-slate-800 tabular-nums">{value}</p>
      {sub && <p className="text-xs text-slate-400">{sub}</p>}
    </div>
  );
}

// ── ステータスバッジ ──────────────────────────────────────────
function StatusBadge({ status, onClick }: { status: FeedbackStatus; onClick?: () => void }) {
  const m = STATUS_META[status];
  return (
    <button
      onClick={onClick}
      title={onClick ? 'クリックしてステータス変更' : undefined}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${m.color} ${onClick ? 'hover:opacity-80 cursor-pointer' : 'cursor-default'} transition-opacity`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${m.dot}`} />
      {m.label}
    </button>
  );
}

// ── カテゴリバッジ ────────────────────────────────────────────
function CategoryBadge({ category }: { category: FeedbackCategory }) {
  const m = CATEGORY_META[category];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${m.color}`}>
      {m.icon} {m.label}
    </span>
  );
}

// ── ステータス変更ドロップダウン ──────────────────────────────
function StatusMenu({ current, onSelect, onClose }: {
  current: FeedbackStatus;
  onSelect: (s: FeedbackStatus) => void;
  onClose: () => void;
}) {
  return (
    <div className="absolute top-full left-0 mt-1 z-50 bg-white rounded-xl border border-slate-200 shadow-xl shadow-slate-200/60 py-1 min-w-[140px]">
      {(Object.keys(STATUS_META) as FeedbackStatus[]).map(s => (
        <button
          key={s}
          onClick={() => { onSelect(s); onClose(); }}
          className={`w-full flex items-center gap-2 px-3 py-2 text-xs font-medium hover:bg-slate-50 transition-colors ${s === current ? 'text-sky-600 bg-sky-50/50' : 'text-slate-700'}`}
        >
          <span className={`w-2 h-2 rounded-full ${STATUS_META[s].dot}`} />
          {STATUS_META[s].label}
          {s === current && <span className="ml-auto text-sky-500">✓</span>}
        </button>
      ))}
    </div>
  );
}

// ── フィードバック行 ──────────────────────────────────────────
function FeedbackRow({
  fb, onStatusChange,
}: {
  fb: FeedbackWithProfile;
  onStatusChange: (id: string, status: FeedbackStatus) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [note, setNote]         = useState(fb.admin_note ?? '');
  const [saving, setSaving]     = useState(false);
  const isDone = DONE_STATUSES.includes(fb.status);

  const saveNote = async () => {
    setSaving(true);
    try {
      await fetch(`/api/admin/feedbacks/${fb.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ admin_note: note }),
      });
      setNoteOpen(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={`rounded-2xl border transition-all ${isDone ? 'border-slate-100 bg-slate-50/40 opacity-60 hover:opacity-80' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
      {/* 行ヘッダー */}
      <div
        className="flex items-start gap-3 p-4 cursor-pointer"
        onClick={() => setExpanded(e => !e)}
      >
        {/* 左: カテゴリ色ライン */}
        <div className={`w-1 self-stretch rounded-full shrink-0 ${
          fb.category === 'bug' ? 'bg-red-400' :
          fb.category === 'feature' ? 'bg-blue-400' :
          fb.category === 'ux' ? 'bg-purple-400' :
          fb.category === 'content' ? 'bg-teal-400' : 'bg-slate-300'
        }`} />

        {/* 中: メッセージ + バッジ */}
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium leading-snug line-clamp-2 ${isDone ? 'text-slate-400' : 'text-slate-800'}`}>
            {fb.message}
          </p>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <CategoryBadge category={fb.category} />
            {fb.rating && (
              <span className="text-xs text-amber-500 font-semibold">
                {'★'.repeat(fb.rating)}{'☆'.repeat(5 - fb.rating)}
              </span>
            )}
            <span className="text-xs text-slate-400">{fmtDate(fb.created_at)}</span>
            {fb.admin_note && (
              <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">メモあり</span>
            )}
          </div>
        </div>

        {/* 右: ステータス */}
        <div className="relative shrink-0" onClick={e => e.stopPropagation()}>
          <StatusBadge status={fb.status} onClick={() => setMenuOpen(o => !o)} />
          {menuOpen && (
            <StatusMenu
              current={fb.status}
              onSelect={s => { onStatusChange(fb.id, s); setMenuOpen(false); }}
              onClose={() => setMenuOpen(false)}
            />
          )}
        </div>
      </div>

      {/* 展開エリア */}
      {expanded && (
        <div className="px-5 pb-4 space-y-3 border-t border-slate-100 pt-3">
          <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{fb.message}</p>

          {/* 管理メモ */}
          {noteOpen ? (
            <div className="space-y-2">
              <textarea
                rows={3}
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="管理者メモ（ユーザーには表示されません）"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-300 resize-none"
              />
              <div className="flex gap-2">
                <button
                  onClick={saveNote}
                  disabled={saving}
                  className="px-4 py-1.5 bg-sky-500 text-white text-xs font-bold rounded-lg hover:bg-sky-400 disabled:opacity-50 transition-colors"
                >
                  {saving ? '保存中...' : '保存'}
                </button>
                <button onClick={() => setNoteOpen(false)} className="px-4 py-1.5 text-xs text-slate-500 hover:text-slate-700">キャンセル</button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              {fb.admin_note && (
                <p className="text-xs text-slate-500 bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 flex-1">
                  📋 {fb.admin_note}
                </p>
              )}
              <button
                onClick={() => setNoteOpen(true)}
                className="text-xs text-sky-600 hover:text-sky-500 font-medium shrink-0"
              >
                {fb.admin_note ? 'メモを編集' : '+ メモを追加'}
              </button>
            </div>
          )}

          {/* ステータス変更ボタン群 */}
          <div className="flex flex-wrap gap-2 pt-1">
            {(Object.keys(STATUS_META) as FeedbackStatus[]).filter(s => s !== fb.status).map(s => (
              <button
                key={s}
                onClick={() => onStatusChange(fb.id, s)}
                className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors font-medium"
              >
                → {STATUS_META[s].label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── メインページ ──────────────────────────────────────────────
export default function AdminFeedbackPage() {
  const [data,           setData]          = useState<ApiResponse | null>(null);
  const [loading,        setLoading]       = useState(true);
  const [statusFilter,   setStatusFilter]  = useState<FilterStatus>(ALL);
  const [categoryFilter, setCategoryFilter] = useState<FilterCategory>(ALL);
  const [search,         setSearch]        = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '200' });
      if (statusFilter   !== ALL) params.set('status',   statusFilter);
      if (categoryFilter !== ALL) params.set('category', categoryFilter);
      const res = await fetch(`/api/admin/feedbacks?${params}`, { credentials: 'include' });
      const json = await res.json();
      setData(json);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, categoryFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleStatusChange = async (id: string, status: FeedbackStatus) => {
    await fetch(`/api/admin/feedbacks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    setData(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        feedbacks: prev.feedbacks.map(f => f.id === id ? { ...f, status } : f),
      };
    });
  };

  const filtered = (data?.feedbacks ?? []).filter(f =>
    search === '' ||
    f.message.toLowerCase().includes(search.toLowerCase())
  );

  const kpi = {
    total:       data?.total ?? 0,
    pending:     (data?.feedbacks ?? []).filter(f => f.status === 'pending').length,
    resolved:    (data?.feedbacks ?? []).filter(f => f.status === 'resolved').length,
    dismissed:   (data?.feedbacks ?? []).filter(f => f.status === 'dismissed').length,
  };

  // カテゴリ別件数ラベル変換
  const catChartData = (data?.charts.catCounts ?? []).map(d => ({
    ...d,
    name: CATEGORY_META[d.name as FeedbackCategory]?.label ?? d.name,
    fill: CAT_COLORS[d.name] ?? '#94a3b8',
  }));

  const statusChartData = (data?.charts.statusCounts ?? []).map(d => ({
    ...d,
    name: STATUS_META[d.name as FeedbackStatus]?.label ?? d.name,
    fill: STATUS_COLORS[d.name] ?? '#94a3b8',
  }));

  const trendData = (data?.charts.trend ?? []).map(d => ({
    ...d,
    date: fmtDateShort(d.date),
  }));

  return (
    <div className="p-8 space-y-8">
      {/* ヘッダー */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">フィードバック管理</h1>
        <p className="text-sm text-slate-500 mt-0.5">ユーザーからのフィードバックを集計・管理します</p>
      </div>

      {/* KPIカード */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="総件数"     value={kpi.total}     color="border-slate-200 bg-white"         sub="全フィードバック" />
        <KpiCard label="受付済み"   value={kpi.pending}   color="border-amber-100 bg-amber-50/40"   sub="未対応" />
        <KpiCard label="対応済み"   value={kpi.resolved}  color="border-emerald-100 bg-emerald-50/40" sub="解決済み" />
        <KpiCard label="対応しない" value={kpi.dismissed} color="border-slate-100 bg-slate-50"       sub="クローズ" />
      </div>

      {/* グラフ 3列 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* カテゴリ別 棒グラフ */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <p className="text-sm font-bold text-slate-700 mb-4">カテゴリ別件数</p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={catChartData} barSize={24} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
              <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={90} />
              <Tooltip contentStyle={tt} formatter={(v) => [v, '件']} />
              <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                {catChartData.map((d, i) => <Cell key={i} fill={d.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* ステータス別 ドーナツ */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <p className="text-sm font-bold text-slate-700 mb-4">ステータス別</p>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie
                data={statusChartData}
                dataKey="count"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={70}
                paddingAngle={3}
              >
                {statusChartData.map((d, i) => <Cell key={i} fill={d.fill} />)}
              </Pie>
              <Tooltip contentStyle={tt} formatter={(v) => [v, '件']} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* 過去30日トレンド */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <p className="text-sm font-bold text-slate-700 mb-4">過去30日のトレンド</p>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} interval={6} />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip contentStyle={tt} formatter={(v) => [v, '件']} />
              <Line type="monotone" dataKey="count" stroke="#0ea5e9" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* フィルター */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
        <div className="flex flex-wrap gap-3 items-center">
          {/* テキスト検索 */}
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="キーワードで検索..."
            className="flex-1 min-w-[200px] rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-300 transition"
          />

          {/* ステータスフィルター */}
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as FilterStatus)}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-300 bg-white"
          >
            <option value={ALL}>すべてのステータス</option>
            {(Object.keys(STATUS_META) as FeedbackStatus[]).map(s => (
              <option key={s} value={s}>{STATUS_META[s].label}</option>
            ))}
          </select>

          {/* カテゴリフィルター */}
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value as FilterCategory)}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-300 bg-white"
          >
            <option value={ALL}>すべてのカテゴリ</option>
            {(Object.keys(CATEGORY_META) as FeedbackCategory[]).map(c => (
              <option key={c} value={c}>{CATEGORY_META[c].icon} {CATEGORY_META[c].label}</option>
            ))}
          </select>

          <span className="text-sm text-slate-400 ml-auto">{filtered.length} 件表示</span>
        </div>

        {/* カテゴリ別クイックフィルターバッジ */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setCategoryFilter(ALL)}
            className={`text-xs px-3 py-1.5 rounded-full border font-semibold transition-all ${categoryFilter === ALL ? 'bg-slate-800 text-white border-slate-800' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}
          >
            すべて ({data?.total ?? 0})
          </button>
          {(data?.charts.catCounts ?? []).map(d => (
            <button
              key={d.name}
              onClick={() => setCategoryFilter(d.name as FeedbackCategory)}
              className={`text-xs px-3 py-1.5 rounded-full border font-semibold transition-all ${
                categoryFilter === d.name
                  ? 'bg-slate-800 text-white border-slate-800'
                  : 'border-slate-200 text-slate-500 hover:border-slate-300'
              }`}
            >
              {CATEGORY_META[d.name as FeedbackCategory]?.icon} {CATEGORY_META[d.name as FeedbackCategory]?.label} ({d.count})
            </button>
          ))}
        </div>
      </div>

      {/* フィードバック一覧 */}
      <div className="space-y-3">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <p className="text-lg">💬</p>
            <p className="text-sm mt-2">該当するフィードバックがありません</p>
          </div>
        ) : (
          filtered.map(fb => (
            <FeedbackRow
              key={fb.id}
              fb={fb}
              onStatusChange={handleStatusChange}
            />
          ))
        )}
      </div>
    </div>
  );
}
