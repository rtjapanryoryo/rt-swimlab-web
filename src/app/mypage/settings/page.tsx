'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { createClient } from '@/lib/supabase/client';

export default function SettingsPage() {
  const { user } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/profile', { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => {
        setDisplayName(d.profile?.display_name ?? '');
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleSaveName(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ display_name: displayName }),
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? '失敗しました');
      setMessage('表示名を更新しました');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : '更新に失敗しました');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-slate-600">読み込み中...</p>;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">設定</h1>
        <p className="text-slate-600 mt-1">パスワードや表示名を変更できます。</p>
      </header>

      {/* 表示名変更 */}
      <div className="p-6 bg-white rounded-xl shadow-sm border border-slate-200">
        <h2 className="text-sm font-semibold text-slate-700 mb-4">表示名</h2>
        <form onSubmit={handleSaveName} className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px]">
            <label htmlFor="display_name" className="block text-xs text-slate-500 mb-1">
              表示名
            </label>
            <input
              id="display_name"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg"
              placeholder="お名前"
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-slate-800 text-white rounded-lg font-medium hover:bg-slate-900 disabled:opacity-50"
          >
            {saving ? '保存中...' : '保存'}
          </button>
        </form>
        {message && (
          <p className="mt-3 text-sm text-slate-600">{message}</p>
        )}
      </div>

      {/* パスワード変更 */}
      <div className="p-6 bg-white rounded-xl shadow-sm border border-slate-200">
        <h2 className="text-sm font-semibold text-slate-700 mb-4">パスワード</h2>
        <p className="text-sm text-slate-600 mb-3">
          パスワードを忘れた場合や変更したい場合は、以下のリンクからリセットできます。
        </p>
        <Link
          href="/forgot-password"
          className="inline-block px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          パスワードをリセットする
        </Link>
      </div>

      {/* アカウント連携 */}
      <div className="p-6 bg-white rounded-xl shadow-sm border border-slate-200">
        <h2 className="text-sm font-semibold text-slate-700 mb-2">アカウント連携</h2>
        <p className="text-xs text-slate-600">
          メールとGoogleを同じアカウントに紐付けると、どちらでもログインできます。
        </p>
        <Link
          href="/mypage"
          className="mt-3 inline-block text-sm text-slate-500 hover:text-slate-700 underline"
        >
          ← マイページへ戻る
        </Link>
      </div>
    </div>
  );
}
