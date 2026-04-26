'use client';

import { useState, useEffect } from 'react';

type Status = 'pending' | 'confirmed' | 'completed' | 'cancelled';

interface CounselingRequest {
  id: string;
  user_id: string;
  plan_type: 'free' | 'athlete' | 'coach';
  preferred_datetime_1: string;
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

const STATUS_META: Record<Status, { label: string; badge: string; dot: string }> = {
  pending:   { label: '未対応',     badge: 'bg-red-50 text-red-600 border border-red-200',       dot: 'bg-red-400' },
  confirmed: { label: '日程確定',   badge: 'bg-blue-50 text-blue-600 border border-blue-200',     dot: 'bg-blue-400' },
  completed: { label: '完了',       badge: 'bg-emerald-50 text-emerald-700 border border-emerald-200', dot: 'bg-emerald-400' },
  cancelled: { label: 'キャンセル', badge: 'bg-slate-100 text-slate-500 border border-slate-200', dot: 'bg-slate-400' },
};

const fmtDate = (s: string) =>
  new Date(s).toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });

export default function AdminCounselingPage() {
  const [requests, setRequests]     = useState<CounselingRequest[]>([]);
  const [loading, setLoading]       = useState(true);
  const [statusFilter, setFilter]   = useState<Status | 'all'>('all');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [adminNote, setAdminNote]   = useState('');

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

  const filtered      = statusFilter === 'all' ? requests : requests.filter(r => r.status === statusFilter);
  const pendingCount  = requests.filter(r => r.status === 'pending').length;
  const confirmedCount = requests.filter(r => r.status === 'confirmed').length;
  const completedCount = requests.filter(r => r.status === 'completed').length;
  const freeCount     = requests.filter(r => r.plan_type === 'free').length;
  const athleteCount  = requests.filter(r => r.plan_type === 'athlete').length;
  const coachCount    = requests.filter(r => r.plan_type === 'coach').length;

  const freeUserIds     = new Set(requests.filter(r => r.plan_type === 'free').map(r => r.user_id));
  const convertedCount  = requests.filter(r => (r.plan_type === 'athlete' || r.plan_type === 'coach') && freeUserIds.has(r.user_id)).length;
  const conversionRate  = freeCount > 0 ? Math.round((convertedCount / freeCount) * 100) : 0;

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

      {/* 一覧 */}
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
                {/* 行ヘッダー */}
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
                    <span className="text-xs text-slate-400 ml-auto shrink-0">{fmtDate(r.created_at)}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1.5 truncate">
                    第1希望：{r.preferred_datetime_1}
                  </p>
                </button>

                {/* 展開エリア */}
                {isExpanded && (
                  <div className="border-t border-slate-100 px-5 py-4 space-y-4 bg-slate-50/60">

                    {/* 希望日時 */}
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">希望日時</p>
                      {[r.preferred_datetime_1, r.preferred_datetime_2, r.preferred_datetime_3]
                        .filter(Boolean)
                        .map((dt, i) => (
                          <p key={i} className="text-sm text-slate-700">
                            <span className="text-slate-400 text-xs mr-2">第{i + 1}希望</span>{dt}
                          </p>
                        ))}
                    </div>

                    {/* 相談内容 */}
                    {r.message && (
                      <div className="bg-white border border-slate-200 rounded-xl p-3">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">相談内容</p>
                        <p className="text-sm text-slate-700 leading-relaxed">{r.message}</p>
                      </div>
                    )}

                    {/* 管理者メモ */}
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

                    {/* ステータス変更 */}
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
  );
}
