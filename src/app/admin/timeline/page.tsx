'use client';

import { useState, useEffect } from 'react';

const CATEGORIES = ['マーケ', 'インフラ', 'リリース', '開発', 'その他'] as const;
type Category = typeof CATEGORIES[number];
type Status = 'todo' | 'in_progress' | 'done';

type WBSItem = {
  id: string;
  date: string;
  title: string;
  category: Category;
  status: Status;
  note: string;
};

const STORAGE_KEY = 'admin_timeline_v1';

const INITIAL_ITEMS: WBSItem[] = [
  { id: '1', date: '2026-05-01', title: 'PRタイムズ投稿', category: 'マーケ', status: 'todo', note: '' },
  { id: '2', date: '2026-05-07', title: 'Stripe連携完了', category: 'インフラ', status: 'todo', note: '' },
  { id: '3', date: '2026-05-07', title: 'DNS設定完了', category: 'インフラ', status: 'todo', note: '' },
  { id: '4', date: '2026-05-14', title: 'デモ期間終了（無料練習メニュー生成）', category: 'リリース', status: 'todo', note: '' },
];

const STATUS: Record<Status, { label: string; dot: string; badge: string; next: Status }> = {
  todo:        { label: '未着手', dot: 'bg-slate-300',        badge: 'bg-slate-100 text-slate-500',         next: 'in_progress' },
  in_progress: { label: '進行中', dot: 'bg-sky-400',          badge: 'bg-sky-100 text-sky-700',             next: 'done' },
  done:        { label: '完了',   dot: 'bg-emerald-400',      badge: 'bg-emerald-100 text-emerald-700',     next: 'todo' },
};

const CAT_COLOR: Record<Category, string> = {
  'マーケ':   'bg-amber-100 text-amber-700',
  'インフラ': 'bg-violet-100 text-violet-700',
  'リリース': 'bg-rose-100 text-rose-700',
  '開発':     'bg-cyan-100 text-cyan-700',
  'その他':   'bg-slate-100 text-slate-500',
};

function fmtDate(d: string): { date: string; weekday: string } {
  const dt = new Date(d + 'T00:00:00');
  return {
    date:    dt.toLocaleDateString('ja-JP', { month: 'long', day: 'numeric' }),
    weekday: dt.toLocaleDateString('ja-JP', { weekday: 'short' }),
  };
}

function isPast(d: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(d + 'T00:00:00') < today;
}

const EMPTY: Omit<WBSItem, 'id'> = { date: '', title: '', category: 'その他', status: 'todo', note: '' };

export default function TimelinePage() {
  const [items, setItems] = useState<WBSItem[]>([]);
  const [modal, setModal] = useState<'closed' | 'add' | 'edit'>('closed');
  const [form, setForm] = useState<Omit<WBSItem, 'id'>>(EMPTY);
  const [editId, setEditId] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      setItems(saved ? JSON.parse(saved) : INITIAL_ITEMS);
    } catch {
      setItems(INITIAL_ITEMS);
    }
  }, []);

  function save(next: WBSItem[]) {
    setItems(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  function cycleStatus(id: string) {
    save(items.map(it => it.id === id ? { ...it, status: STATUS[it.status].next } : it));
  }

  function openAdd() {
    setForm({ ...EMPTY, date: new Date().toISOString().split('T')[0] });
    setEditId(null);
    setModal('add');
  }

  function openEdit(item: WBSItem) {
    setForm({ date: item.date, title: item.title, category: item.category, status: item.status, note: item.note });
    setEditId(item.id);
    setModal('edit');
  }

  function handleSubmit() {
    if (!form.date || !form.title.trim()) return;
    if (modal === 'add') {
      save([...items, { ...form, id: Date.now().toString() }]);
    } else if (editId) {
      save(items.map(it => it.id === editId ? { ...it, ...form } : it));
    }
    setModal('closed');
  }

  function handleDelete(id: string) {
    if (confirm('このタスクを削除しますか？')) save(items.filter(it => it.id !== id));
  }

  // 日付でソート＆グループ化
  const sorted = [...items].sort((a, b) => a.date.localeCompare(b.date));
  const groups = sorted.reduce<Record<string, WBSItem[]>>((acc, it) => {
    (acc[it.date] ??= []).push(it);
    return acc;
  }, {});
  const dates = Object.keys(groups);

  const doneCount = items.filter(it => it.status === 'done').length;
  const progress = items.length ? Math.round((doneCount / items.length) * 100) : 0;

  return (
    <div className="p-8 max-w-3xl mx-auto">

      {/* ヘッダー */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="text-[10px] font-bold text-sky-400 uppercase tracking-widest mb-1">Project</p>
          <h1 className="text-2xl font-black text-slate-900">タイムライン</h1>
          <p className="text-sm text-slate-500 mt-0.5">ローンチまでのマイルストーンを管理します</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2.5 bg-sky-500 hover:bg-sky-400 text-white text-sm font-bold rounded-xl shadow-lg shadow-sky-500/20 transition-all"
        >
          <span className="text-base leading-none">+</span>
          タスクを追加
        </button>
      </div>

      {/* 進捗バー */}
      <div className="mb-8 bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-bold text-slate-600">全体進捗</p>
          <p className="text-xs font-black text-slate-900">{doneCount} / {items.length} 完了</p>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-sky-400 to-emerald-400 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-[10px] text-slate-400 mt-1.5 text-right">{progress}%</p>
      </div>

      {/* タイムライン */}
      {dates.length === 0 ? (
        <div className="text-center py-20 text-slate-400 text-sm">
          タスクがありません。「タスクを追加」から登録してください。
        </div>
      ) : (
        <div className="relative">
          {/* 縦ライン */}
          <div className="absolute left-[5.5rem] top-0 bottom-0 w-px bg-slate-200" />

          <div className="space-y-8">
            {dates.map((date, di) => {
              const past = isPast(date);
              const allDone = groups[date].every(it => it.status === 'done');
              return (
                <div key={date} className="relative flex gap-6">
                  {/* 日付ラベル */}
                  <div className="w-[5.5rem] shrink-0 text-right pt-0.5">
                    <p className={`text-[11px] font-black leading-tight ${past && !allDone ? 'text-red-500' : 'text-slate-700'}`}>
                      {fmtDate(date).date}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {fmtDate(date).weekday}
                    </p>
                    {past && !allDone && (
                      <span className="text-[9px] font-bold text-red-500">期限超過</span>
                    )}
                  </div>

                  {/* ドット */}
                  <div className="relative shrink-0 flex flex-col items-center" style={{ marginLeft: '-0.5px' }}>
                    <div className={`mt-1 w-3 h-3 rounded-full border-2 border-white shadow ring-1 z-10 ${
                      allDone ? 'bg-emerald-400 ring-emerald-300' : past ? 'bg-red-400 ring-red-200' : di === 0 ? 'bg-sky-400 ring-sky-200' : 'bg-slate-300 ring-slate-200'
                    }`} />
                  </div>

                  {/* カード群 */}
                  <div className="flex-1 space-y-2 pb-2">
                    {groups[date].map(item => (
                      <div
                        key={item.id}
                        className={`bg-white rounded-xl border shadow-sm p-3.5 transition-all ${
                          item.status === 'done' ? 'border-slate-100 opacity-60' : 'border-slate-200'
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${CAT_COLOR[item.category]}`}>
                                {item.category}
                              </span>
                            </div>
                            <p className={`text-sm font-bold text-slate-800 ${item.status === 'done' ? 'line-through text-slate-400' : ''}`}>
                              {item.title}
                            </p>
                            {item.note && (
                              <p className="text-xs text-slate-500 mt-1 leading-relaxed">{item.note}</p>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {/* ステータスバッジ（クリックで切替） */}
                            <button
                              onClick={() => cycleStatus(item.id)}
                              className={`flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full transition-all hover:opacity-80 ${STATUS[item.status].badge}`}
                              title="クリックでステータス変更"
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${STATUS[item.status].dot}`} />
                              {STATUS[item.status].label}
                            </button>

                            {/* 編集 */}
                            <button
                              onClick={() => openEdit(item)}
                              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-all"
                              title="編集"
                            >
                              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                              </svg>
                            </button>

                            {/* 削除 */}
                            <button
                              onClick={() => handleDelete(item.id)}
                              className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                              title="削除"
                            >
                              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6m4-6v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 追加・編集モーダル */}
      {modal !== 'closed' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="bg-white rounded-3xl shadow-2xl p-7 max-w-sm w-full space-y-4">
            <h3 className="text-base font-black text-slate-900">
              {modal === 'add' ? 'タスクを追加' : 'タスクを編集'}
            </h3>

            {/* 日付 */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500">日付 <span className="text-red-400">*</span></label>
              <input
                type="date"
                value={form.date}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
              />
            </div>

            {/* タイトル */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500">タイトル <span className="text-red-400">*</span></label>
              <input
                type="text"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="例：Stripe連携完了"
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
              />
            </div>

            {/* カテゴリ */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500">カテゴリ</label>
              <div className="flex flex-wrap gap-1.5">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, category: cat }))}
                    className={`text-xs font-bold px-3 py-1.5 rounded-full transition-all ${
                      form.category === cat ? CAT_COLOR[cat] + ' ring-1 ring-current' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* ステータス */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500">ステータス</label>
              <div className="flex gap-1.5">
                {(Object.keys(STATUS) as Status[]).map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, status: s }))}
                    className={`flex-1 flex items-center justify-center gap-1 text-[11px] font-bold py-2 rounded-xl transition-all ${
                      form.status === s ? STATUS[s].badge + ' ring-1 ring-current' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${STATUS[s].dot}`} />
                    {STATUS[s].label}
                  </button>
                ))}
              </div>
            </div>

            {/* メモ */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500">メモ <span className="text-slate-300 font-normal">（任意）</span></label>
              <textarea
                rows={2}
                value={form.note}
                onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                placeholder="補足・詳細など"
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-sky-300"
              />
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setModal('closed')}
                className="flex-1 py-2.5 rounded-xl border-2 border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-all"
              >
                キャンセル
              </button>
              <button
                onClick={handleSubmit}
                disabled={!form.date || !form.title.trim()}
                className="flex-1 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-sm font-bold disabled:opacity-40 transition-all"
              >
                {modal === 'add' ? '追加する' : '保存する'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
