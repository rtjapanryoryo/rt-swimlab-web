'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

export default function SettingsPage() {
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // パスワード変更
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);

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
      // auth.user_metadata も同期（UserNav 等で表示名を即反映）
      try {
        const supabase = createClient();
        await supabase.auth.updateUser({ data: { full_name: displayName.trim() || undefined } });
      } catch {
        /* 非致命的：profiles は更新済み */
      }
      setMessage('表示名を更新しました');
      window.dispatchEvent(new Event('profile-updated'));
    } catch (e) {
      setMessage(e instanceof Error ? e.message : '更新に失敗しました');
    } finally {
      setSaving(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordMessage(null);
    if (newPassword.length < 6) {
      setPasswordMessage('パスワードは6文字以上で入力してください');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMessage('パスワードが一致しません');
      return;
    }
    setPasswordSaving(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        setPasswordMessage(error.message);
        return;
      }
      setPasswordMessage('パスワードを変更しました');
      setNewPassword('');
      setConfirmPassword('');
      window.dispatchEvent(new Event('profile-updated'));
    } catch {
      setPasswordMessage('パスワードの変更に失敗しました');
    } finally {
      setPasswordSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="h-10 w-48 bg-slate-200 rounded-lg" />
        <div className="h-40 bg-slate-100 rounded-2xl" />
        <div className="h-32 bg-slate-100 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
          設定
        </h1>
        <p className="text-slate-500 mt-1 text-sm">
          表示名やパスワードを管理できます
        </p>
      </header>

      {/* 表示名 */}
      <section className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-800">表示名</h2>
          <p className="text-xs text-slate-500 mt-0.5">マイページやメニューに表示されます</p>
        </div>
        <div className="p-6">
          <form onSubmit={handleSaveName} className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
            <div className="flex-1 w-full sm:max-w-xs">
              <label htmlFor="display_name" className="block text-xs font-medium text-slate-500 mb-1.5">
                表示名
              </label>
              <input
                id="display_name"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none transition-colors"
                placeholder="お名前"
              />
            </div>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-teal-600 text-white font-medium rounded-xl hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
              {saving ? '保存中...' : '保存'}
            </button>
          </form>
          {message && (
            <p className={`mt-4 text-sm ${message.includes('失敗') ? 'text-amber-600' : 'text-teal-600'}`}>
              {message}
            </p>
          )}
        </div>
      </section>

      {/* パスワード */}
      <section className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-800">パスワード</h2>
          <p className="text-xs text-slate-500 mt-0.5">ログイン中に変更するか、忘れた場合はメールでリセット</p>
        </div>
        <div className="p-6 space-y-6">
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end flex-wrap">
              <div className="flex-1 min-w-[200px]">
                <label htmlFor="new_password" className="block text-xs font-medium text-slate-500 mb-1.5">
                  新しいパスワード
                </label>
                <input
                  id="new_password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  minLength={6}
                  autoComplete="new-password"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none"
                  placeholder="6文字以上"
                />
              </div>
              <div className="flex-1 min-w-[200px]">
                <label htmlFor="confirm_password" className="block text-xs font-medium text-slate-500 mb-1.5">
                  確認
                </label>
                <input
                  id="confirm_password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  minLength={6}
                  autoComplete="new-password"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none"
                  placeholder="もう一度入力"
                />
              </div>
              <button
                type="submit"
                disabled={passwordSaving}
                className="px-6 py-2.5 bg-teal-600 text-white font-medium rounded-xl hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
              >
                {passwordSaving ? '変更中...' : 'パスワードを変更'}
              </button>
            </div>
            {passwordMessage && (
              <p className={`text-sm ${passwordMessage.includes('失敗') || passwordMessage.includes('一致') ? 'text-amber-600' : 'text-teal-600'}`}>
                {passwordMessage}
              </p>
            )}
          </form>
          <div className="pt-2 border-t border-slate-100">
            <p className="text-xs text-slate-500 mb-2">パスワードを忘れた場合は、登録メール宛にリセットリンクを送信できます。</p>
            <Link
              href="/forgot-password"
              className="inline-flex items-center px-5 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors"
            >
              パスワードをリセットする（メール送信）
            </Link>
          </div>
        </div>
      </section>

      {/* アカウント連携（一旦非表示） */}
      {false && (
        <section className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-800">アカウント連携</h2>
            <p className="text-xs text-slate-500 mt-0.5">メールとGoogleを紐付けるとどちらでもログインできます</p>
          </div>
          <div className="p-6">
            <Link
              href="/mypage"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-teal-600 hover:text-teal-700 transition-colors"
            >
              ← マイページへ戻る
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}
