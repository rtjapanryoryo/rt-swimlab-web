'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { createClient } from '@/lib/supabase/client';
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
  const [identities, setIdentities] = useState<{ provider: string }[]>([]);
  const [linkLoading, setLinkLoading] = useState(false);

  useEffect(() => {
    if (status || !user) return;
    createClient()
      .auth.getUserIdentities()
      .then(({ data }) => setIdentities(data?.identities ?? []))
      .catch(() => setIdentities([]));
  }, [status, user]);

  async function handleLinkGoogle() {
    setLinkLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.linkIdentity({
        provider: 'google',
        options: {
          redirectTo: `${typeof window !== 'undefined' ? window.location.origin : ''}/auth/callback?next=/mypage`,
        },
      });
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
    } catch (e) {
      console.error('Link Google error:', e);
      setLinkLoading(false);
    }
  }

  useEffect(() => {
    if (status || !user) return;
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

        {/* アカウント連携 */}
        <div className="mb-6 p-4 bg-white rounded-xl shadow-sm border border-slate-200">
          <h2 className="text-sm font-semibold text-slate-700 mb-2">アカウント連携</h2>
          <p className="text-xs text-slate-600 mb-3">
            メールとGoogleを同じアカウントに紐付けると、どちらでもログインでき、メニューデータが共有されます。
          </p>
          <div className="flex flex-wrap gap-2">
            {identities.some((i) => i.provider === 'email') && (
              <span className="px-2 py-1 text-xs rounded bg-slate-100 text-slate-700">メール</span>
            )}
            {identities.some((i) => i.provider === 'google') && (
              <span className="px-2 py-1 text-xs rounded bg-slate-100 text-slate-700">Google</span>
            )}
            {!identities.some((i) => i.provider === 'google') && (
              <button
                type="button"
                onClick={handleLinkGoogle}
                disabled={linkLoading}
                className="flex items-center gap-2 px-3 py-1.5 text-sm border border-gray-300 rounded-md bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                {linkLoading ? '連携中...' : 'Google を連携'}
              </button>
            )}
          </div>
        </div>

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
