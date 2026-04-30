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
  const [view, setView]             = useState<'list' | 'calendar' | 'script'>('list');
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
        {(['list', 'calendar', 'script'] as const).map(v => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`px-4 py-2 text-sm font-semibold border-b-2 transition-all -mb-px ${
              view === v
                ? 'border-sky-500 text-sky-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {v === 'list' ? 'リスト' : v === 'calendar' ? 'カレンダー' : '話すカンペ'}
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
                              ✕ {booking.profiles?.display_name ?? '申込'}
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

      {/* ══════ 話すカンペ ══════ */}
      {view === 'script' && (
        <div className="space-y-4 max-w-2xl">

          <p className="text-xs text-slate-500">無料カウンセリング（15分）の進行カンペです。通話前に確認してください。</p>

          {[
            {
              time: '0〜2分',
              title: '① オープニング・現状確認',
              color: 'border-slate-300 bg-slate-50',
              titleColor: 'text-slate-700',
              lines: [
                '「本日はお時間いただきありがとうございます！15分という短い時間ですが、しっかりお伝えしたいことがあるので一緒に進めていきましょう。まず少し聞いてもいいですか？今どんな練習をされていますか？」',
                '→ 目標シートに繋げる：「アプリに目標シートという機能があるんですが、もう書いていただけましたか？（書いていれば）ぜひ今日の中で一緒に見ていきましょう。（書いていなければ）今日の後半で少し触れますね。」',
              ],
            },
            {
              time: '2〜6分',
              title: '② アプリ使い方デモ（画面共有）',
              color: 'border-cyan-200 bg-cyan-50/40',
              titleColor: 'text-cyan-800',
              lines: [
                '「では実際に使い方を見てもらった方が早いと思うので、画面を共有しますね。」',
                '→ メニュー生成を実演：「たとえば今日の状態をここに入れると…こんな感じで練習メニューが自動で出てきます。距離・強度・インターバルまで全部設計されているので、これを見て練習するだけでOKです。」',
                '→ 目標シートへ：「目標シートはここにあって、ここに目標を書いておくと練習の方向性がブレなくなります。今日の後でもいいので、ぜひ書いてみてください。」',
              ],
            },
            {
              time: '6〜10分',
              title: '③ 遺伝子検査の紹介',
              color: 'border-violet-200 bg-violet-50/40',
              titleColor: 'text-violet-800',
              lines: [
                '「ちょっと話が変わるんですが、RT swim labには遺伝子検査と連携した機能があるんです。知ってましたか？」',
                '→ 知らない場合：「自分が持って生まれた特性——持久系か瞬発系か、疲労回復のしやすさとか——が遺伝子レベルでわかるんです。それに合わせて練習を組み立てると、同じ練習量でも効果が全然変わってくる。今やっている練習が、実は特性に合っていない可能性もあるんですよね。」',
                '→ 購入誘導：「一度検査しておくとずっと使える情報なので、コスパはかなり高いと思っています。もし興味あれば今日の後でリンクをお送りしますね。」',
              ],
            },
            {
              time: '10〜13分',
              title: '④ コミュニティ紹介',
              color: 'border-emerald-200 bg-emerald-50/40',
              titleColor: 'text-emerald-800',
              lines: [
                '「今、RT swim labのコミュニティも作っていて、同じように水泳を頑張っている仲間がいるんです。練習記録を共有したり、お互いに刺激し合ったりできる場所です。」',
                '「一人でやっていると続かないことって多いと思うんですけど、仲間がいると全然違うんですよ。近日公開予定なので、ぜひ参加してみてください。」',
              ],
            },
            {
              time: '13〜15分',
              title: '⑤ クロージング・次のアクション',
              color: 'border-amber-200 bg-amber-50/40',
              titleColor: 'text-amber-800',
              lines: [
                '「残り少しですが、何か聞いておきたいことはありますか？」',
                '→ 必ず次のアクションを1つ決めて終わる：「今日話した中で、まず一つだけやってみてほしいことを決めましょう。目標シートを書く・遺伝子検査を申し込む・メニュー生成を試してみる、どれが一番やれそうですか？」',
                '→ 決まったら：「では○○をやってみてください。何かあればいつでも連絡してくださいね。今日はありがとうございました！」',
              ],
            },
          ].map(block => (
            <div key={block.title} className={`rounded-2xl border ${block.color} p-4 space-y-2`}>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold bg-white border border-slate-200 text-slate-500 px-2 py-0.5 rounded-full">{block.time}</span>
                <h3 className={`text-sm font-bold ${block.titleColor}`}>{block.title}</h3>
              </div>
              <ul className="space-y-2">
                {block.lines.map((line, i) => (
                  <li key={i} className="text-sm text-slate-700 leading-relaxed">
                    {line.startsWith('→') ? (
                      <span className="flex gap-1.5">
                        <span className="text-slate-400 shrink-0">→</span>
                        <span>{line.slice(1).trim()}</span>
                      </span>
                    ) : (
                      <span className="block bg-white/70 rounded-xl px-3 py-2 border border-white italic">
                        {line}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* よくある質問 */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
            <h3 className="text-sm font-bold text-slate-700">よく聞かれる質問</h3>
            {[
              { q: '有料プランはいくらですか？', a: '今キャンペーン中で通常より安くなっています。選手プランは1回1,500円です。' },
              { q: '遺伝子検査は怖くないですか？', a: '口の中を綿棒で拭うだけなので痛みは全くないです。郵送でできます。' },
              { q: 'アプリは難しくないですか？', a: '条件を選んでボタンを押すだけなので、5分あれば使えます。今日デモで見てもらった通りです。' },
              { q: 'コミュニティって何をするんですか？', a: '練習記録の共有・情報交換・仲間との交流がメインです。強制参加ではないので、気軽に覗くだけでもOKです。' },
            ].map(({ q, a }) => (
              <div key={q} className="border-l-2 border-slate-200 pl-3">
                <p className="text-xs font-bold text-slate-600">Q. {q}</p>
                <p className="text-xs text-slate-500 mt-0.5">→ {a}</p>
              </div>
            ))}
          </div>

        </div>
      )}
    </div>
  );
}
