'use client';

import { useMemo, useState, useEffect } from 'react';
import {
  SLOT_RULES,
  DAY_LABELS,
  ALL_SLOT_TIMES,
  slotKey,
  isoToSlotKey,
  fmtSlotTime,
} from '@/lib/counseling-slots';

type Status = 'pending' | 'confirmed' | 'completed' | 'cancelled';

interface CounselingRequest {
  id: string;
  user_id: string;
  plan_type: 'free' | 'athlete' | 'coach';
  preferred_datetime_1: string | null;
  preferred_datetime_2: string | null;
  preferred_datetime_3: string | null;
  message: string | null;
  status: Status;
  admin_note: string | null;
  created_at: string;
  profiles: { display_name: string | null } | null;
}

const PLAN_META: Record<string, { label: string; badge: string }> = {
  free:    { label: '無料',   badge: 'bg-slate-100 text-slate-600 border border-slate-200' },
  athlete: { label: '選手',   badge: 'bg-cyan-50 text-cyan-700 border border-cyan-200' },
  coach:   { label: 'コーチ', badge: 'bg-amber-50 text-amber-700 border border-amber-200' },
};

const STATUS_META: Record<Status, { label: string; badge: string; dot: string; calBg: string }> = {
  pending:   { label: '未対応',     badge: 'bg-red-50 text-red-600 border border-red-200',           dot: 'bg-red-400',     calBg: 'bg-red-100 text-red-700' },
  confirmed: { label: '日程確定',   badge: 'bg-blue-50 text-blue-600 border border-blue-200',         dot: 'bg-blue-400',    calBg: 'bg-blue-100 text-blue-700' },
  completed: { label: '完了',       badge: 'bg-emerald-50 text-emerald-700 border border-emerald-200', dot: 'bg-emerald-400', calBg: 'bg-emerald-100 text-emerald-700' },
  cancelled: { label: 'キャンセル', badge: 'bg-slate-100 text-slate-500 border border-slate-200',     dot: 'bg-slate-400',   calBg: 'bg-slate-100 text-slate-500' },
};

const fmtDatetime = (s: string) =>
  new Date(s).toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });

function getMonday(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  d.setDate(d.getDate() - ((day + 6) % 7));
  return d;
}

export default function AdminCounselingPage() {
  const [requests, setRequests]     = useState<CounselingRequest[]>([]);
  const [loading, setLoading]       = useState(true);
  const [statusFilter, setFilter]   = useState<Status | 'all'>('all');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [adminNote, setAdminNote]   = useState('');
  const [view, setView]             = useState<'list' | 'calendar'>('list');
  const [weekStart, setWeekStart]   = useState(() => getMonday(new Date()));

  const fetchRequests = () => {
    setLoading(true);
    fetch('/api/counseling?admin=1', { credentials: 'include' })
      .then(r => r.json())
      .then(d => setRequests(d.requests ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchRequests(); }, []);

  const handleStatusUpdate = async (id: string, status: Status) => {
    setUpdatingId(id);
    try {
      await fetch('/api/counseling', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status, admin_note: adminNote }),
      });
      fetchRequests();
      setExpandedId(null);
    } finally {
      setUpdatingId(null);
    }
  };

  // カレンダー用：週の7日
  const weekDays = useMemo(() =>
    Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      return d;
    }), [weekStart]);

  // カレンダー用：スロットキー → 申し込みのマップ
  const requestsBySlot = useMemo(() => {
    const map = new Map<string, CounselingRequest>();
    for (const r of requests) {
      if (r.preferred_datetime_1) {
        const key = isoToSlotKey(r.preferred_datetime_1);
        if (key) map.set(key, r);
      }
    }
    return map;
  }, [requests]);

  const filtered      = statusFilter === 'all' ? requests : requests.filter(r => r.status === statusFilter);
  const pendingCount  = requests.filter(r => r.status === 'pending').length;
  const confirmedCount = requests.filter(r => r.status === 'confirmed').length;
  const completedCount = requests.filter(r => r.status === 'completed').length;
  const freeCount     = requests.filter(r => r.plan_type === 'free').length;
  const athleteCount  = requests.filter(r => r.plan_type === 'athlete').length;
  const coachCount    = requests.filter(r => r.plan_type === 'coach').length;
  const freeUserIds   = new Set(requests.filter(r => r.plan_type === 'free').map(r => r.user_id));
  const convertedCount = requests.filter(r => (r.plan_type === 'athlete' || r.plan_type === 'coach') && freeUserIds.has(r.user_id)).length;
  const conversionRate = freeCount > 0 ? Math.round((convertedCount / freeCount) * 100) : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center flex-1 p-6">
        <div className="w-8 h-8 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 min-w-0">

      {/* ヘッダー */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">カウンセリング管理</h1>
          <p className="text-sm text-slate-500 mt-0.5">申し込み一覧・ステータス管理・分析</p>
        </div>
        {pendingCount > 0 && (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-red-50 text-red-600 border border-red-200">
            未対応 {pendingCount}件
          </span>
        )}
      </div>

      {/* 分析カード */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: '総申し込み', value: requests.length,  valueColor: 'text-slate-900' },
          { label: '未対応',     value: pendingCount,      valueColor: 'text-red-500' },
          { label: '日程確定',   value: confirmedCount,    valueColor: 'text-blue-500' },
          { label: '完了',       value: completedCount,    valueColor: 'text-emerald-600' },
        ].map(s => (
          <div key={s.label} className="bg-white border border-slate-200 rounded-2xl px-4 py-3 shadow-sm">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{s.label}</p>
            <p className={`text-2xl font-black mt-1 ${s.valueColor}`}>
              {s.value}<span className="text-sm font-medium text-slate-400 ml-0.5">件</span>
            </p>
          </div>
        ))}
      </div>

      {/* プラン内訳・転換率 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="bg-white border border-slate-200 rounded-2xl px-5 py-4 shadow-sm space-y-3">
          <p className="text-xs font-bold text-slate-500">プラン別内訳</p>
          {[
            { label: '無料カウンセリング', count: freeCount,    dotColor: 'bg-slate-400' },
            { label: '選手プラン',         count: athleteCount, dotColor: 'bg-cyan-500' },
            { label: 'コーチプラン',       count: coachCount,   dotColor: 'bg-amber-500' },
          ].map(p => (
            <div key={p.label} className="flex items-center gap-2.5">
              <div className={`w-2 h-2 rounded-full shrink-0 ${p.dotColor}`} />
              <span className="text-sm text-slate-700 flex-1">{p.label}</span>
              <span className="text-sm font-bold text-slate-900 tabular-nums">{p.count}件</span>
              <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${p.dotColor}`}
                  style={{ width: requests.length > 0 ? `${Math.round((p.count / requests.length) * 100)}%` : '0%' }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl px-5 py-4 shadow-sm space-y-2">
          <p className="text-xs font-bold text-slate-500">無料 → 有料 転換率</p>
          <div className="flex items-end gap-2">
            <p className="text-3xl font-black text-sky-600">
              {conversionRate}<span className="text-lg font-bold">%</span>
            </p>
            <p className="text-xs text-slate-400 pb-1">{freeCount}件中 {convertedCount}件が有料申し込み</p>
          </div>
          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-sky-400 to-cyan-400 rounded-full transition-all"
              style={{ width: `${conversionRate}%` }}
            />
          </div>
        </div>
      </div>

      {/* タブ切り替え */}
      <div className="flex gap-2 border-b border-slate-200 pb-0">
        {(['list', 'calendar'] as const).map(v => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`px-4 py-2 text-sm font-semibold border-b-2 transition-all -mb-px ${
              view === v
                ? 'border-sky-500 text-sky-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {v === 'list' ? 'リスト' : 'カレンダー'}
          </button>
        ))}
      </div>

      {/* ══════ リストビュー ══════ */}
      {view === 'list' && (
        <div className="space-y-4">
          {/* フィルター */}
          <div className="flex gap-2 flex-wrap">
            {(['all', 'pending', 'confirmed', 'completed', 'cancelled'] as const).map(s => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                  statusFilter === s
                    ? 'bg-slate-800 text-white border-slate-800'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:text-slate-800'
                }`}
              >
                {s === 'all' ? 'すべて' : STATUS_META[s].label}
                {s === 'pending' && pendingCount > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-red-500 text-white text-[10px]">
                    {pendingCount}
                  </span>
                )}
              </button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-12 text-center">
              <p className="text-slate-400 text-sm">申し込みはありません</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map(r => {
                const plan       = PLAN_META[r.plan_type];
                const statusMeta = STATUS_META[r.status];
                const isExpanded = expandedId === r.id;

                return (
                  <div key={r.id} className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                    <button
                      className="w-full text-left px-5 py-4 hover:bg-slate-50 transition-colors"
                      onClick={() => {
                        setExpandedId(isExpanded ? null : r.id);
                        setAdminNote(r.admin_note ?? '');
                      }}
                    >
                      <div className="flex items-center gap-2 flex-wrap min-w-0">
                        <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold ${plan.badge}`}>
                          {plan.label}
                        </span>
                        <span className={`shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${statusMeta.badge}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${statusMeta.dot}`} />
                          {statusMeta.label}
                        </span>
                        <span className="text-sm font-semibold text-slate-900 truncate">
                          {r.profiles?.display_name ?? '（名前なし）'}
                        </span>
                        {r.preferred_datetime_1 && (
                          <span className="text-xs text-sky-600 font-semibold bg-sky-50 px-2 py-0.5 rounded-lg border border-sky-200">
                            {isoToSlotKey(r.preferred_datetime_1).replace('-', '/').replace('-', '/').replace('-', '/').replace(' ', ' ')}
                          </span>
                        )}
                        <span className="text-xs text-slate-400 ml-auto shrink-0">{fmtDatetime(r.created_at)}</span>
                      </div>
                      {r.message ? (
                        <p className="text-xs text-slate-500 mt-1.5 truncate">{r.message}</p>
                      ) : (
                        <p className="text-xs text-slate-400 mt-1.5">（相談内容なし）</p>
                      )}
                    </button>

                    {isExpanded && (
                      <div className="border-t border-slate-100 px-5 py-4 space-y-4 bg-slate-50/60">
                        {r.preferred_datetime_1 && (
                          <div className="bg-sky-50 border border-sky-200 rounded-xl px-4 py-2.5">
                            <p className="text-[10px] font-bold text-sky-500 uppercase tracking-wider mb-0.5">希望日時</p>
                            <p className="text-sm font-semibold text-sky-800">{isoToSlotKey(r.preferred_datetime_1).replace('T', ' ')}</p>
                          </div>
                        )}
                        <div className="bg-white border border-slate-200 rounded-xl p-3">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">相談内容</p>
                          <p className="text-sm text-slate-700 leading-relaxed">{r.message ?? '（記入なし）'}</p>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                            管理者メモ
                          </label>
                          <textarea
                            rows={2}
                            value={adminNote}
                            onChange={e => setAdminNote(e.target.value)}
                            placeholder="日程確定情報・対応履歴など"
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-400 resize-none"
                          />
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">ステータス変更</p>
                          <div className="flex gap-2 flex-wrap">
                            {(['pending', 'confirmed', 'completed', 'cancelled'] as Status[]).map(s => (
                              <button
                                key={s}
                                disabled={r.status === s || updatingId === r.id}
                                onClick={() => handleStatusUpdate(r.id, s)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all disabled:opacity-40 ${
                                  r.status === s
                                    ? 'bg-slate-800 text-white border-slate-800'
                                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400 hover:text-slate-800'
                                }`}
                              >
                                {STATUS_META[s].label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ══════ カレンダービュー ══════ */}
      {view === 'calendar' && (
        <div className="space-y-4">
          {/* 週ナビゲーション */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setWeekStart(d => { const n = new Date(d); n.setDate(d.getDate() - 7); return n; })}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm font-semibold transition-all"
            >
              ← 前週
            </button>
            <span className="text-sm font-bold text-slate-700">
              {weekStart.getFullYear()}年{weekStart.getMonth() + 1}月
              {weekStart.getDate()}日〜
              {weekDays[6].getMonth() + 1}月{weekDays[6].getDate()}日
            </span>
            <button
              onClick={() => setWeekStart(d => { const n = new Date(d); n.setDate(d.getDate() + 7); return n; })}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm font-semibold transition-all"
            >
              翌週 →
            </button>
          </div>

          {/* 凡例 */}
          <div className="flex flex-wrap gap-3 text-[10px]">
            {(Object.entries(STATUS_META) as [Status, typeof STATUS_META[Status]][]).map(([s, meta]) => (
              <span key={s} className={`flex items-center gap-1 px-2 py-1 rounded-lg font-bold ${meta.calBg}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />{meta.label}
              </span>
            ))}
          </div>

          {/* カレンダーグリッド */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-3 py-3 text-left font-semibold text-slate-400 w-14 border-r border-slate-200">
                    時間
                  </th>
                  {weekDays.map(d => {
                    const hasSlots = d.getDay() in SLOT_RULES;
                    const isToday = d.toDateString() === new Date().toDateString();
                    return (
                      <th
                        key={d.toISOString()}
                        className={`px-2 py-3 text-center font-semibold min-w-[80px] ${
                          hasSlots ? 'text-slate-800' : 'text-slate-400'
                        } ${isToday ? 'bg-cyan-50' : ''}`}
                      >
                        <div className={`font-bold ${isToday ? 'text-cyan-600' : ''}`}>
                          {DAY_LABELS[d.getDay()]}
                        </div>
                        <div className="text-[10px] font-normal text-slate-400">
                          {d.getMonth() + 1}/{d.getDate()}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {ALL_SLOT_TIMES.map(({ h, m, label }) => (
                  <tr key={label} className="border-t border-slate-100">
                    <td className="px-3 py-1.5 text-slate-400 font-mono border-r border-slate-200 whitespace-nowrap">
                      {label}
                    </td>
                    {weekDays.map(day => {
                      const rule = SLOT_RULES[day.getDay()];
                      const isAvailable = rule && h >= rule.start && h < rule.end;
                      const isToday = day.toDateString() === new Date().toDateString();

                      if (!isAvailable) {
                        return (
                          <td
                            key={day.toISOString()}
                            className={`px-2 py-1.5 ${isToday ? 'bg-cyan-50/30' : 'bg-slate-50/50'}`}
                          />
                        );
                      }

                      const cellDate = new Date(day);
                      cellDate.setHours(h, m, 0, 0);
                      const key = slotKey(cellDate);
                      const booking = requestsBySlot.get(key);

                      return (
                        <td
                          key={day.toISOString()}
                          className={`px-1.5 py-1 ${isToday ? 'bg-cyan-50/30' : ''}`}
                        >
                          {booking ? (
                            <span
                              title={`${booking.profiles?.display_name ?? '申込'} (${STATUS_META[booking.status].label})`}
                              className={`block px-2 py-1 rounded-lg text-[10px] font-bold truncate ${STATUS_META[booking.status].calBg}`}
                            >
                              {booking.profiles?.display_name ?? '申込'}
                            </span>
                          ) : (
                            <span className="flex justify-center">
                              <span className="w-3 h-3 rounded-full border border-slate-200" />
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-[10px] text-slate-400">
            ○ = 空き枠　色付き = 申し込みあり（ホバーで詳細）　灰色 = 受付時間外
          </p>
        </div>
      )}
    </div>
  );
}
