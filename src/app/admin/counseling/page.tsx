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

  const pendingCount   = requests.filter(r => r.status === 'pending').length;
  const confirmedCount = requests.filter(r => r.status === 'confirmed').length;
  const completedCount = requests.filter(r => r.status === 'completed').length;

  const freeCount    = requests.filter(r => r.plan_type === 'free').length;
  const athleteCount = requests.filter(r => r.plan_type === 'athlete').length;
  const coachCount   = requests.filter(r => r.plan_type === 'coach').length;

  // 無料→有料への転換数（無料申し込み後に選手/コーチ申し込みしたuser_idの数）
  const freeUserIds = new Set(requests.filter(r => r.plan_type === 'free').map(r => r.user_id));
  const convertedCount = requests.filter(
    r => (r.plan_type === 'athlete' || r.plan_type === 'coach') && freeUserIds.has(r.user_id)
  ).length;
  const conversionRate = freeCount > 0 ? Math.round((convertedCount / freeCount) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">カウンセリング管理</h1>
          <p className="text-sm text-slate-400 mt-0.5">申し込み一覧・ステータス管理・分析</p>
        </div>
        {pendingCount > 0 && (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-red-500/20 text-red-400 border border-red-500/30">
            未対応 {pendingCount}件
          </span>
        )}
      </div>

      {/* 分析カード */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: '総申し込み',   value: requests.length,  color: 'text-white',       sub: '件' },
          { label: '未対応',       value: pendingCount,      color: 'text-red-400',     sub: '件' },
          { label: '対応中',       value: confirmedCount,    color: 'text-blue-400',    sub: '件' },
          { label: '完了',         value: completedCount,    color: 'text-emerald-400', sub: '件' },
        ].map(s => (
          <div key={s.label} className="bg-slate-800/60 border border-slate-700 rounded-2xl px-4 py-3">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{s.label}</p>
            <p className={`text-2xl font-black mt-1 ${s.color}`}>{s.value}<span className="text-sm font-medium ml-0.5">{s.sub}</span></p>
          </div>
        ))}
      </div>

      {/* プラン内訳・転換率 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="bg-slate-800/60 border border-slate-700 rounded-2xl px-4 py-4 space-y-2">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">プラン別内訳</p>
          {[
            { label: '無料カウンセリング', count: freeCount,    color: 'bg-slate-500' },
            { label: '選手プラン',         count: athleteCount, color: 'bg-cyan-500' },
            { label: 'コーチプラン',       count: coachCount,   color: 'bg-amber-500' },
          ].map(p => (
            <div key={p.label} className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full shrink-0 ${p.color}`} />
              <span className="text-xs text-slate-300 flex-1">{p.label}</span>
              <span className="text-xs font-bold text-white">{p.count}件</span>
              {requests.length > 0 && (
                <div className="w-16 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${p.color}`}
                    style={{ width: `${Math.round((p.count / requests.length) * 100)}%` }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="bg-slate-800/60 border border-slate-700 rounded-2xl px-4 py-4 space-y-3">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">無料→有料 転換率</p>
          <div className="flex items-end gap-2">
            <p className="text-3xl font-black text-cyan-400">{conversionRate}<span className="text-lg">%</span></p>
            <p className="text-xs text-slate-400 pb-1">{freeCount}件中 {convertedCount}件が有料申し込み</p>
          </div>
          <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-cyan-500 to-teal-500 rounded-full" style={{ width: `${conversionRate}%` }} />
          </div>
        </div>
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
