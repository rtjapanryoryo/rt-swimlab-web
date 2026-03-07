'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { MenuSheet } from '@/components/MenuSheet';
import type { TrainingInput, TrainingResult } from '@/lib/rt/generator';

type MenuLog = {
  id: string;
  input: Record<string, unknown>;
  result: Record<string, unknown> & { rawText?: string };
  source: string;
  created_at: string;
};

export default function MyPageMenus() {
  const [menus, setMenus] = useState<MenuLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    setLoading(true);
    fetch(`/api/menus?${params}`, { credentials: 'include' })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.message ?? '取得に失敗しました');
        setMenus(data.menus ?? []);
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : 'エラーが発生しました');
        setMenus([]);
      })
      .finally(() => setLoading(false));
  }, [from, to]);

  const selected = menus.find((m) => m.id === selectedId);
  const formatDate = (s: string) => {
    const d = new Date(s);
    return d.toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="h-10 w-48 bg-slate-200 rounded-lg" />
        <div className="h-20 bg-slate-100 rounded-2xl" />
        <div className="h-96 bg-slate-100 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
          メニューログ
        </h1>
        <p className="text-slate-500 mt-1 text-sm">
          過去に作成した練習メニューを日時付きで確認できます
        </p>
      </header>

      {/* 期間フィルター */}
      <section className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-800">期間で絞り込み</h2>
        </div>
        <div className="p-6">
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">開始日</label>
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">終了日</label>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none transition-colors"
              />
            </div>
            {(from || to) && (
              <button
                type="button"
                onClick={() => { setFrom(''); setTo(''); }}
                className="px-4 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
              >
                クリア
              </button>
            )}
          </div>
        </div>
      </section>

      {error ? (
        <div className="p-6 bg-amber-50/80 border border-amber-200/80 rounded-2xl text-amber-800 text-sm">
          {error}
        </div>
      ) : menus.length === 0 ? (
        <section className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
          <div className="py-20 text-center">
            <div className="w-14 h-14 mx-auto mb-5 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 text-2xl">
              ▸
            </div>
            <p className="text-slate-600 font-medium">保存されたメニューはありません</p>
            <p className="text-slate-400 text-sm mt-1">
              トップでメニューを作成し、「保存」ボタンでログに追加できます
            </p>
            <Link
              href="/"
              className="mt-6 inline-flex items-center px-5 py-2.5 bg-teal-600 text-white font-medium rounded-xl hover:bg-teal-700 transition-colors text-sm"
            >
              メニューを作成する
            </Link>
          </div>
        </section>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {/* 一覧 */}
          <section className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-800">作成ログ一覧</h2>
              <span className="text-xs text-slate-400 tabular-nums">{menus.length} 件</span>
            </div>
            <div className="p-3 max-h-[480px] overflow-y-auto">
              <div className="space-y-2">
                {menus.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setSelectedId(selectedId === m.id ? null : m.id)}
                    className={`w-full text-left p-4 rounded-xl border transition-all ${
                      selectedId === m.id
                        ? 'border-teal-200 bg-teal-50/80 shadow-sm'
                        : 'border-slate-100 bg-white hover:bg-slate-50/80 hover:border-slate-200'
                    }`}
                  >
                    <p className="text-xs text-slate-400 tabular-nums mb-1">
                      {formatDate(m.created_at)}
                    </p>
                    <p className="text-sm font-medium text-slate-800">
                      {m.source === 'custom' ? 'カスタム作成' : 'クイック作成'}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* 詳細 */}
          <section className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100">
              <h2 className="text-sm font-semibold text-slate-800">メニュー詳細</h2>
            </div>
            <div className="p-6 max-h-[520px] overflow-y-auto">
              {selected ? (
                <div className="space-y-4">
                  <p className="text-xs text-slate-400">
                    {formatDate(selected.created_at)} · {selected.source === 'custom' ? 'カスタム' : 'クイック'}
                  </p>
                  {selected.result.rawText ? (
                    <pre className="whitespace-pre-wrap font-sans text-sm text-slate-800 leading-relaxed bg-slate-50 rounded-xl p-4">
                      {selected.result.rawText}
                    </pre>
                  ) : (
                    <div className="bg-slate-50/50 rounded-xl p-4">
                      <MenuSheet
                        input={(selected.input || {}) as unknown as TrainingInput}
                        result={(selected.result || {}) as unknown as TrainingResult}
                        source={selected.source as 'quick' | 'custom'}
                      />
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-20 text-center">
                  <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                    ◇
                  </div>
                  <p className="text-slate-500 text-sm">左のリストから選択してください</p>
                </div>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
