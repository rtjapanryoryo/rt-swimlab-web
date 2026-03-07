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

export function MenuLogSection() {
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

  return (
    <section className="dashboard-card overflow-hidden">
      <div className="px-6 py-5 border-b border-slate-100/80 flex items-center gap-2">
        <span className="w-1 h-5 rounded-full bg-teal-500/70" />
        <h2 className="text-sm font-semibold text-slate-800">メニューログ</h2>
      </div>
      <div className="p-6">
        {loading ? (
          <div className="py-8 text-center text-slate-500 text-sm animate-pulse">読み込み中...</div>
        ) : error ? (
          <div className="p-4 bg-amber-50/80 border border-amber-200/80 rounded-xl text-amber-800 text-sm">
            {error}
          </div>
        ) : menus.length === 0 ? (
          <div className="py-10 text-center">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 text-xl">
              ▸
            </div>
            <p className="text-slate-600 font-medium text-sm">保存されたメニューはありません</p>
            <p className="text-slate-400 text-xs mt-1">
              RT swim lab でメニューを作成し、「保存」でログに追加できます
            </p>
            <Link
              href="/mypage/menu"
              className="mt-4 inline-flex items-center px-4 py-2 bg-teal-600 text-white font-medium rounded-lg hover:bg-teal-700 transition-colors text-sm"
            >
              メニューを作成する
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div>
              <div className="flex flex-wrap gap-3 items-end mb-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">開始日</label>
                  <input
                    type="date"
                    value={from}
                    onChange={(e) => setFrom(e.target.value)}
                    className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">終了日</label>
                  <input
                    type="date"
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                    className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none"
                  />
                </div>
                {(from || to) && (
                  <button
                    type="button"
                    onClick={() => { setFrom(''); setTo(''); }}
                    className="px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900"
                  >
                    クリア
                  </button>
                )}
              </div>
              <div className="max-h-[320px] overflow-y-auto space-y-2">
                {menus.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setSelectedId(selectedId === m.id ? null : m.id)}
                    className={`w-full text-left p-3 rounded-xl border transition-all ${
                      selectedId === m.id
                        ? 'border-teal-200 bg-teal-50/80'
                        : 'border-slate-100 hover:bg-slate-50/80'
                    }`}
                  >
                    <p className="text-xs text-slate-400 tabular-nums">{formatDate(m.created_at)}</p>
                    <p className="text-sm font-medium text-slate-800">
                      {m.source === 'custom' ? 'カスタム作成' : 'クイック作成'}
                    </p>
                  </button>
                ))}
              </div>
            </div>
            <div className="min-h-[200px]">
              {selected ? (
                <div className="space-y-3">
                  <p className="text-xs text-slate-400">
                    {formatDate(selected.created_at)} · {selected.source === 'custom' ? 'カスタム' : 'クイック'}
                  </p>
                  {selected.result.rawText ? (
                    <pre className="whitespace-pre-wrap text-sm text-slate-800 bg-slate-50 rounded-xl p-4">
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
                <div className="py-12 text-center text-slate-500 text-sm">
                  左のリストから選択
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
