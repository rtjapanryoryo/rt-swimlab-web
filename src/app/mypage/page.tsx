'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { MenuSheet } from '@/components/MenuSheet';
import type { TrainingInput, TrainingResult } from '@/lib/rt/generator';

type MenuLog = {
  id: string;
  input: Record<string, unknown>;
  result: Record<string, unknown> & { rawText?: string };
  source: string;
  created_at: string;
};

export default function MyPage() {
  const { user, loading: status } = useAuth();
  const [menus, setMenus] = useState<MenuLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (status !== 'authenticated') return;
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
  }, [status, user, from, to]);

  if (status) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-slate-600">読み込み中...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6">
        <p className="text-slate-600">マイページを利用するにはログインしてください。</p>
        <Link
          href="/"
          className="px-4 py-2 rounded-xl bg-slate-800 text-white hover:bg-slate-900 font-medium"
        >
          トップへ
        </Link>
      </div>
    );
  }

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
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-slate-50/95 to-slate-100 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">マイページ</h1>
          <p className="text-slate-600">作成したメニューのログを確認できます。</p>
          <Link
            href="/"
            className="mt-3 inline-block text-sm text-slate-500 hover:text-slate-700 underline"
          >
            ← トップへ戻る
          </Link>
        </header>

        {/* 日付フィルター */}
        <div className="mb-6 p-4 bg-white rounded-xl shadow-sm border border-slate-200">
          <h2 className="text-sm font-semibold text-slate-700 mb-3">期間で絞り込み</h2>
          <div className="flex flex-wrap gap-3 items-center">
            <label className="flex items-center gap-2">
              <span className="text-sm text-slate-600">from</span>
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm"
              />
            </label>
            <label className="flex items-center gap-2">
              <span className="text-sm text-slate-600">to</span>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm"
              />
            </label>
            {(from || to) && (
              <button
                type="button"
                onClick={() => {
                  setFrom('');
                  setTo('');
                }}
                className="text-sm text-slate-500 hover:text-slate-700 underline"
              >
                クリア
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <p className="text-slate-600">読み込み中...</p>
        ) : error ? (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800">
            {error}
          </div>
        ) : menus.length === 0 ? (
          <div className="p-8 bg-white rounded-xl shadow-sm border border-slate-200 text-center text-slate-600">
            保存されたメニューはありません。
            <br />
            トップでメニューを作成し、「保存」ボタンでログに追加できます。
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 一覧 */}
            <div className="space-y-2">
              <h2 className="text-sm font-semibold text-slate-700">作成ログ</h2>
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {menus.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setSelectedId(selectedId === m.id ? null : m.id)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      selectedId === m.id
                        ? 'border-slate-400 bg-slate-100'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <span className="text-xs text-slate-500 block">{formatDate(m.created_at)}</span>
                    <span className="text-sm font-medium text-slate-800">
                      {m.source === 'custom' ? 'カスタム' : 'クイック'}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* 詳細 */}
            <div className="space-y-2">
              <h2 className="text-sm font-semibold text-slate-700">メニュー詳細</h2>
              {selected ? (
                <div className="p-4 bg-white rounded-xl shadow-sm border border-slate-200 max-h-[500px] overflow-y-auto">
                  <p className="text-xs text-slate-500 mb-2">
                    {formatDate(selected.created_at)} · {selected.source === 'custom' ? 'カスタム' : 'クイック'}
                  </p>
                  {selected.result.rawText ? (
                    <pre className="whitespace-pre-wrap font-sans text-sm text-gray-800">
                      {selected.result.rawText}
                    </pre>
                  ) : (
                    <MenuSheet
                      input={(selected.input || {}) as unknown as TrainingInput}
                      result={(selected.result || {}) as unknown as TrainingResult}
                      source={selected.source as 'quick' | 'custom'}
                    />
                  )}
                </div>
              ) : (
                <div className="p-8 bg-white rounded-xl border border-slate-200 border-dashed text-center text-slate-400 text-sm">
                  左のリストから選択してください
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
