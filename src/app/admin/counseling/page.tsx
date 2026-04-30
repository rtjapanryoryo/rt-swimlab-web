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
  user_email: string | null;
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
  completed: { label: '対応完了',   badge: 'bg-emerald-50 text-emerald-700 border border-emerald-200', dot: 'bg-emerald-400', calBg: 'bg-emerald-100 text-emerald-700' },
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

type ScriptSection = {
  id: string;
  time: string;
  title: string;
  colorClass: string;
  titleColor: string;
  content: string;
};

const DEFAULT_SECTIONS: ScriptSection[] = [
  {
    id: 'opening',
    time: '0〜2分',
    title: '① オープニング・概要説明',
    colorClass: 'border-slate-300 bg-slate-50',
    titleColor: 'text-slate-700',
    content: `「本日はお時間いただきありがとうございます！15分という短い時間ですが、しっかりお伝えしたいことがあるので一緒に進めましょう。」
→ 初心者の方向けに：「RT swim labは、泳法・練習期・体調などを入力するだけで、あなた専用の練習メニューが自動で出てくるアプリです。今日はその使い方と、練習の方向性を一緒に確認していければと思います。」`,
  },
  {
    id: 'goalsheet',
    time: '2〜12分',
    title: '② 目標シートのヒアリング（メイン）',
    colorClass: 'border-cyan-200 bg-cyan-50/40',
    titleColor: 'text-cyan-800',
    content: `→ 「目標シートは書いていただけましたか？今の目標・練習頻度・課題などを一緒に確認していきましょう。」
→ 相手の疑問・質問に応答しながら、方向性を一緒に決めていく。
→ 方向性を伝える：「今の状況だと、まずは○○を重点的に練習するといいと思います。」
→ アプリが使えない場合は代わりに操作してあげる。「一緒に画面を見ながらやってみましょう。（画面共有）」`,
  },
  {
    id: 'supplement',
    time: '12〜14分',
    title: '③ 補足紹介（各30秒・必要に応じて）',
    colorClass: 'border-violet-200 bg-violet-50/40',
    titleColor: 'text-violet-800',
    content: `【遺伝子の紹介】自分の特性（持久系か瞬発系か等）が遺伝子レベルで分かる検査があります。一度やると練習の最適化に活かせます。
【コミュニティ】同じ目標を持つ仲間がいるコミュニティも近日公開予定です。
【ドリルの進め方】種目別のドリル動画もアプリ内にあるので、参考にしてみてください。
【アプリの使い方】分からないことがあればいつでも聞いてください。`,
  },
  {
    id: 'closing',
    time: '14〜15分',
    title: '④ クロージング・次のアクション',
    colorClass: 'border-amber-200 bg-amber-50/40',
    titleColor: 'text-amber-800',
    content: `「最後に、今日話した中でまず一つだけやってみてほしいことを決めましょう。」
→ 「目標シートを完成させる・メニュー生成を試す・遺伝子検査を申し込む、どれが一番やれそうですか？」
→ 「では○○をやってみてください。何かあればいつでも連絡してくださいね。今日はありがとうございました！」`,
  },
];

const DEFAULT_FAQ = `Q. 有料プランはいくらですか？
→ 今キャンペーン中です。選手プランは1回1,500円です。

Q. 遺伝子検査は怖くないですか？
→ 口の中を綿棒で拭うだけです。痛みなし・郵送でできます。

Q. アプリは難しくないですか？
→ 条件を選んでボタンを押すだけです。5分あれば使えます。

Q. コミュニティって何をするんですか？
→ 練習記録の共有・情報交換がメインです。強制参加ではありません。`;

const LS_KEY = 'rt_counseling_script';

export default function AdminCounselingPage() {
  const [requests, setRequests]     = useState<CounselingRequest[]>([]);
  const [loading, setLoading]       = useState(true);
  const [statusFilter, setFilter]   = useState<Status | 'all'>('all');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [adminNote, setAdminNote]   = useState('');
  const [view, setView]             = useState<'list' | 'calendar' | 'script' | 'guide'>('list');
  const [weekStart, setWeekStart]   = useState(() => getMonday(new Date()));

  // カンペ編集
  const [scriptSections, setScriptSections] = useState<ScriptSection[]>(DEFAULT_SECTIONS);
  const [scriptFaq, setScriptFaq]           = useState(DEFAULT_FAQ);
  const [scriptEditMode, setScriptEditMode] = useState(false);
  const [draftSections, setDraftSections]   = useState<ScriptSection[]>(DEFAULT_SECTIONS);
  const [draftFaq, setDraftFaq]             = useState(DEFAULT_FAQ);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(LS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.sections) { setScriptSections(parsed.sections); setDraftSections(parsed.sections); }
        if (parsed.faq)      { setScriptFaq(parsed.faq);           setDraftFaq(parsed.faq); }
      }
    } catch {}
  }, []);

  const saveScript = () => {
    setScriptSections(draftSections);
    setScriptFaq(draftFaq);
    localStorage.setItem(LS_KEY, JSON.stringify({ sections: draftSections, faq: draftFaq }));
    setScriptEditMode(false);
  };

  const cancelScript = () => {
    setDraftSections(scriptSections);
    setDraftFaq(scriptFaq);
    setScriptEditMode(false);
  };

  const resetScript = () => {
    if (!confirm('カンペをデフォルトに戻しますか？')) return;
    setDraftSections(DEFAULT_SECTIONS);
    setDraftFaq(DEFAULT_FAQ);
  };

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
      <div className="flex gap-2 border-b border-slate-200 pb-0 overflow-x-auto">
        {(['list', 'calendar', 'script', 'guide'] as const).map(v => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`whitespace-nowrap px-4 py-2 text-sm font-semibold border-b-2 transition-all -mb-px ${
              view === v
                ? 'border-sky-500 text-sky-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {v === 'list' ? 'リスト' : v === 'calendar' ? 'カレンダー' : v === 'script' ? '話すカンペ' : '操作ガイド'}
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
                        <div className="flex flex-wrap gap-2">
                          {r.preferred_datetime_1 && (
                            <div className="bg-sky-50 border border-sky-200 rounded-xl px-4 py-2.5 flex-1 min-w-[180px]">
                              <p className="text-[10px] font-bold text-sky-500 uppercase tracking-wider mb-0.5">希望日時</p>
                              <p className="text-sm font-semibold text-sky-800">{isoToSlotKey(r.preferred_datetime_1)}</p>
                            </div>
                          )}
                          {r.user_email && (
                            <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 flex-1 min-w-[200px]">
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">メールアドレス</p>
                              <p className="text-sm font-semibold text-slate-800 break-all">{r.user_email}</p>
                            </div>
                          )}
                        </div>
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
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">返信テンプレ</p>
                          <div className="flex gap-2 flex-wrap">
                            {([
                              { label: '日程確定メール', key: 'confirmed' },
                              { label: 'キャンセルメール', key: 'cancelled' },
                            ] as const).map(({ label, key }) => (
                              <button
                                key={key}
                                onClick={() => {
                                  const name = r.profiles?.display_name ?? 'ご利用者';
                                  const dt = r.preferred_datetime_1 ? isoToSlotKey(r.preferred_datetime_1) : '（日時未定）';
                                  const plan = PLAN_META[r.plan_type].label;
                                  const text = key === 'confirmed'
                                    ? `${name}様\n\nこの度はRT swim labのカウンセリングにお申し込みいただきありがとうございます。\n\n下記の通り日程を確定いたしました。\n\n■ 日時：${dt}\n■ プラン：${plan}\n■ 形式：オンライン（Google Meet / Zoom）\n\n当日のミーティングリンクは、開始30分前までにメールにてお送りします。\n\n何かご不明点がありましたら、お気軽にご連絡ください。\nよろしくお願いいたします。\n\nRT swim lab`
                                    : `${name}様\n\nこの度はRT swim labのカウンセリングにお申し込みいただきありがとうございます。\n\n大変恐縮ですが、諸事情によりご予約をキャンセルさせていただきたくご連絡いたしました。\n\nご迷惑をおかけして大変申し訳ございません。\n改めてご希望の日程をお知らせいただければ、再度調整いたします。\n\nどうぞよろしくお願いいたします。\n\nRT swim lab`;
                                  navigator.clipboard.writeText(text).then(() => alert('クリップボードにコピーしました'));
                                }}
                                className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100 transition-all"
                              >
                                {label}をコピー
                              </button>
                            ))}
                          </div>
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
                              <span className="w-4 h-4 rounded-full border-2 border-slate-400 bg-white" />
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

          <p className="text-[10px] text-slate-500 font-medium">
            ○ = 空き枠　✕色付き = 申し込みあり（ホバーで詳細）　無色 = 受付時間外
          </p>
        </div>
      )}

      {/* ══════ 話すカンペ ══════ */}
      {view === 'script' && (
        <div className="space-y-4 max-w-2xl">

          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500">無料カウンセリング（15分）の進行カンペです。通話前に確認してください。</p>
            <div className="flex items-center gap-2">
              {scriptEditMode ? (
                <>
                  <button onClick={resetScript} className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 text-slate-500 hover:bg-slate-50 transition-all">リセット</button>
                  <button onClick={cancelScript} className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all">キャンセル</button>
                  <button onClick={saveScript} className="px-4 py-1.5 rounded-lg text-xs font-bold bg-sky-600 text-white hover:bg-sky-700 transition-all">保存</button>
                </>
              ) : (
                <button onClick={() => { setDraftSections(scriptSections); setDraftFaq(scriptFaq); setScriptEditMode(true); }} className="px-4 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all">編集</button>
              )}
            </div>
          </div>

          {(scriptEditMode ? draftSections : scriptSections).map((section, idx) => (
            <div key={section.id} className={`rounded-2xl border ${section.colorClass} p-4 space-y-2`}>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold bg-white border border-slate-200 text-slate-500 px-2 py-0.5 rounded-full">{section.time}</span>
                <h3 className={`text-sm font-bold ${section.titleColor}`}>{section.title}</h3>
              </div>
              {scriptEditMode ? (
                <textarea
                  value={draftSections[idx].content}
                  onChange={e => setDraftSections(prev => prev.map((s, i) => i === idx ? { ...s, content: e.target.value } : s))}
                  rows={section.content.split('\n').length + 1}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-400 resize-y"
                />
              ) : (
                <div className="space-y-1.5">
                  {section.content.split('\n').filter(l => l.trim()).map((line, i) => {
                    if (line.startsWith('→')) return (
                      <div key={i} className="flex gap-1.5 text-sm text-slate-700 leading-relaxed">
                        <span className="text-slate-400 shrink-0 mt-0.5">→</span>
                        <span>{line.slice(1).trim()}</span>
                      </div>
                    );
                    if (line.startsWith('【')) return (
                      <div key={i} className="text-sm font-bold text-slate-700 leading-relaxed">{line}</div>
                    );
                    return (
                      <div key={i} className="bg-white/80 rounded-xl px-3 py-2 border border-white/60 text-sm text-slate-700 italic leading-relaxed">{line}</div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}

          {/* よくある質問 */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
            <h3 className="text-sm font-bold text-slate-700">よくある質問</h3>
            {scriptEditMode ? (
              <textarea
                value={draftFaq}
                onChange={e => setDraftFaq(e.target.value)}
                rows={10}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-400 resize-y"
                placeholder={'Q. 質問\n→ 回答\n\nQ. 質問\n→ 回答'}
              />
            ) : (
              <div className="space-y-3">
                {scriptFaq.split('\n\n').filter(b => b.trim()).map((block, i) => {
                  const lines = block.split('\n').filter(l => l.trim());
                  return (
                    <div key={i} className="border-l-2 border-slate-200 pl-3 space-y-0.5">
                      {lines.map((line, j) => line.startsWith('→') ? (
                        <p key={j} className="text-xs text-slate-500">→ {line.slice(1).trim()}</p>
                      ) : (
                        <p key={j} className="text-xs font-bold text-slate-600">{line}</p>
                      ))}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      )}

      {/* ══════ 操作ガイド ══════ */}
      {view === 'guide' && (
        <div className="space-y-5 max-w-2xl">

          {/* 対応フロー */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
            <h2 className="text-sm font-bold text-slate-800">カウンセリング対応フロー</h2>
            <ol className="space-y-3">
              {[
                {
                  step: '① 申し込み受信',
                  badge: 'bg-red-50 text-red-600 border-red-200',
                  desc: '管理者メール（06ra.ra06@gmail.com）に通知が届く。管理画面で内容を確認する。',
                },
                {
                  step: '② メールで返信・日程確定',
                  badge: 'bg-blue-50 text-blue-600 border-blue-200',
                  desc: '申し込み者のメールに「日程確定メール」テンプレートを送信。管理画面でステータスを「日程確定」に変更する。',
                },
                {
                  step: '③ ミーティングリンク送付',
                  badge: 'bg-violet-50 text-violet-600 border-violet-200',
                  desc: '当日30分前までに Google Meet または Zoom リンクをメールで送る。（リンクはカウンセリングごとに発行すること）',
                },
                {
                  step: '④ カウンセリング実施',
                  badge: 'bg-amber-50 text-amber-600 border-amber-200',
                  desc: '「話すカンペ」タブを参考に進行。目標シートのヒアリングがメイン（10分）。',
                },
                {
                  step: '⑤ 対応完了',
                  badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                  desc: '終了後、管理画面でステータスを「対応完了」に変更。メモ欄に気付いた点を残しておく。',
                },
              ].map(({ step, badge, desc }) => (
                <li key={step} className="flex gap-3">
                  <span className={`shrink-0 mt-0.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${badge}`}>
                    {step}
                  </span>
                  <p className="text-sm text-slate-600 leading-relaxed">{desc}</p>
                </li>
              ))}
            </ol>
          </div>

          {/* メール返信テンプレート */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
            <h2 className="text-sm font-bold text-slate-800">メール返信テンプレート</h2>
            <p className="text-xs text-slate-500">各リストの申し込みカードを開くと「返信テンプレ」ボタンから名前・日時を自動入力したテキストをコピーできます。</p>

            {[
              {
                title: '① 日程確定メール',
                subject: '【RT swim lab】カウンセリング日程のご確認',
                body: `[お名前]様\n\nこの度はRT swim labのカウンセリングにお申し込みいただきありがとうございます。\n\n下記の通り日程を確定いたしました。\n\n■ 日時：[YYYY-MM-DD HH:mm]\n■ プラン：[プラン名]\n■ 形式：オンライン（Google Meet / Zoom）\n\n当日のミーティングリンクは、開始30分前までにメールにてお送りします。\n\n何かご不明点がありましたら、お気軽にご連絡ください。\nよろしくお願いいたします。\n\nRT swim lab`,
              },
              {
                title: '② ミーティングリンク送付メール',
                subject: '【RT swim lab】本日のカウンセリング ミーティングリンク',
                body: `[お名前]様\n\n本日はよろしくお願いいたします。\n\n下記のリンクからご参加ください。\n\n■ 日時：[YYYY-MM-DD HH:mm]\n■ リンク：[Google Meet / Zoom URL]\n\nご不明点があればご連絡ください。\nお会いできるのを楽しみにしております。\n\nRT swim lab`,
              },
              {
                title: '③ フォローアップメール（任意）',
                subject: '【RT swim lab】カウンセリングのフォローアップ',
                body: `[お名前]様\n\n先日はカウンセリングにご参加いただきありがとうございました。\n\nお話しした通り、まずは [アクション] から始めてみてください。\n\nアプリに関してご不明点がありましたら、いつでもご連絡ください。\n引き続きサポートいたします！\n\nRT swim lab`,
              },
            ].map(({ title, subject, body }) => (
              <div key={title} className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-b border-slate-200">
                  <span className="text-xs font-bold text-slate-700">{title}</span>
                  <button
                    onClick={() => navigator.clipboard.writeText(`件名：${subject}\n\n${body}`).then(() => alert('コピーしました'))}
                    className="px-3 py-1 rounded-lg text-[10px] font-semibold border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 transition-all"
                  >
                    コピー
                  </button>
                </div>
                <div className="px-4 py-3">
                  <p className="text-[10px] text-slate-400 mb-1">件名：{subject}</p>
                  <pre className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed font-sans">{body}</pre>
                </div>
              </div>
            ))}
          </div>

          {/* 注意事項 */}
          <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 space-y-2">
            <h3 className="text-xs font-bold text-amber-800">運用上の注意</h3>
            <ul className="text-xs text-amber-700 space-y-1 list-disc pl-4">
              <li>カウンセリングは1枠ずつの対応です。同じ時間帯に複数の予約が入らないよう、日程確定後すぐにステータスを更新してください。</li>
              <li>無料カウンセリングは1アカウント1回のみです（システムで制限済み）。</li>
              <li>Google Meet のリンクは毎回新しく発行してください。前回のリンクを使い回すと第三者が入室できる場合があります。</li>
              <li>申し込み者のメールアドレスは各カードを開くと確認できます（ユーザー登録時のメール）。</li>
            </ul>
          </div>

        </div>
      )}
    </div>
  );
}
