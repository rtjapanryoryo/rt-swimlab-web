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

const PLAN_LABELS: Record<string, { label: string; badge: string }> = {
  free:    { label: '無料',   badge: 'bg-slate-100 text-slate-600' },
  athlete: { label: '選手',   badge: 'bg-cyan-100 text-cyan-700' },
  coach:   { label: 'コーチ', badge: 'bg-amber-100 text-amber-700' },
};

const STATUS_META: Record<Status, { label: string; badge: string }> = {
  pending:   { label: '未対応', badge: 'bg-red-100 text-red-700' },
  confirmed: { label: '確定',   badge: 'bg-blue-100 text-blue-700' },
  completed: { label: '完了',   badge: 'bg-emerald-100 text-emerald-700' },
  cancelled: { label: 'キャンセル', badge: 'bg-slate-100 text-slate-500' },
};

const fmtDate = (s: string) =>
  new Date(s).toLocaleDateString('ja-JP', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });

export default function AdminCounselingPage() {
  const [requests, setRequests] = useState<CounselingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<Status | 'all'>('all');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [adminNote, setAdminNote] = useState('');

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
      const req = requests.find(r => r.id === id);
      await fetch('/api/counseling', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status, admin_note: req?.admin_note ?? adminNote }),
      });
      fetchRequests();
      setExpandedId(null);
    } finally {
      setUpdatingId(null);
    }
  };

  const filtered = statusFilter === 'all'
    ? requests
    : requests.filter(r => r.status === statusFilter);

  const pendingCount = requests.filter(r => r.status === 'pending').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">カウンセリング管理</h1>
          <p className="text-sm text-slate-400 mt-0.5">申し込み一覧とステータス管理</p>
        </div>
        {pendingCount > 0 && (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-red-500/20 text-red-400 border border-red-500/30">
            未対応 {pendingCount}件
          </span>
        )}
      </div>

      {/* フィルター */}
      <div className="flex gap-2 flex-wrap">
        {(['all', 'pending', 'confirmed', 'completed', 'cancelled'] as const).map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              statusFilter === s
                ? 'bg-sky-500 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            {s === 'all' ? 'すべて' : STATUS_META[s].label}
            {s === 'pending' && pendingCount > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-red-500 text-white text-[10px]">
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* 一覧 */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-800/40 p-12 text-center">
          <p className="text-slate-500 text-sm">申し込みはありません</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(r => {
            const plan = PLAN_LABELS[r.plan_type];
            const statusMeta = STATUS_META[r.status];
            const isExpanded = expandedId === r.id;

            return (
              <div key={r.id} className="bg-slate-800/60 border border-slate-700 rounded-2xl overflow-hidden">
                <button
                  className="w-full text-left px-5 py-4"
                  onClick={() => {
                    setExpandedId(isExpanded ? null : r.id);
                    setAdminNote(r.admin_note ?? '');
                  }}
                >
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${plan.badge}`}>
                      {plan.label}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${statusMeta.badge}`}>
                      {statusMeta.label}
                    </span>
                    <span className="text-sm font-semibold text-white">
                      {r.profiles?.display_name ?? '（名前なし）'}
                    </span>
                    <span className="text-xs text-slate-400 ml-auto">{fmtDate(r.created_at)}</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1.5">
                    第1希望：{r.preferred_datetime_1}
                  </p>
                </button>

                {isExpanded && (
                  <div className="px-5 pb-5 border-t border-slate-700 pt-4 space-y-4">
                    <div className="space-y-1.5">
                      {[r.preferred_datetime_1, r.preferred_datetime_2, r.preferred_datetime_3]
                        .filter(Boolean)
                        .map((dt, i) => (
                          <p key={i} className="text-xs text-slate-300">
                            第{i + 1}希望：{dt}
                          </p>
                        ))}
                    </div>

                    {r.message && (
                      <div className="bg-slate-900/60 rounded-xl p-3">
                        <p className="text-[10px] font-bold text-slate-500 mb-1">相談内容</p>
                        <p className="text-xs text-slate-300 leading-relaxed">{r.message}</p>
                      </div>
                    )}

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1.5">管理者メモ</label>
                      <textarea
                        rows={2}
                        value={adminNote}
                        onChange={e => setAdminNote(e.target.value)}
                        placeholder="日程確定情報・対応履歴など"
                        className="w-full bg-slate-900/60 border border-slate-600 rounded-xl px-3 py-2 text-xs text-slate-300 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none"
                      />
                    </div>

                    <div className="flex gap-2 flex-wrap">
                      {(['pending', 'confirmed', 'completed', 'cancelled'] as Status[]).map(s => (
                        <button
                          key={s}
                          disabled={r.status === s || updatingId === r.id}
                          onClick={() => handleStatusUpdate(r.id, s)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-40 ${
                            r.status === s
                              ? 'bg-sky-500 text-white'
                              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                          }`}
                        >
                          {STATUS_META[s].label}に変更
                        </button>
                      ))}
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
