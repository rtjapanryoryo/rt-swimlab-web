'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/components/AuthProvider';
import { ExternalLinks } from '@/components/ExternalLinks';

export default function SettingsPage() {
  const { user } = useAuth();
  const accountEmail = user?.email ?? null;
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // パスワード変更
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);

  // あなたの目標
  const [goal, setGoal] = useState('');
  const [showGoal, setShowGoal] = useState(true);
  const [goalSaving, setGoalSaving] = useState(false);
  const [goalMessage, setGoalMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/profile', { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => {
        setDisplayName(d.profile?.display_name ?? '');
        setGoal(d.profile?.goal ?? '');
        setShowGoal(d.profile?.show_goal !== false);
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
      // auth.user_metadata も同期（プロフィール表示を即反映）
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
          アカウント情報
        </h1>
        <p className="text-slate-500 mt-1 text-sm">
          表示名・パスワード・有料プランを管理できます
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
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-colors"
                placeholder="お名前"
              />
            </div>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
              {saving ? '保存中...' : '保存'}
            </button>
          </form>
          {message && (
            <p className={`mt-4 text-sm ${message.includes('失敗') ? 'text-amber-600' : 'text-blue-600'}`}>
              {message}
            </p>
          )}
        </div>
      </section>

      {/* 目標（表示名様の目標） */}
      <section className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-800">
            {displayName?.trim() ? `${displayName.trim()}様の目標` : 'あなたの目標'}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">ダッシュボードに表示する目標を一文で入力できます。表示のオン・オフも切り替え可能です</p>
        </div>
        <div className="p-6 space-y-6">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setGoalSaving(true);
              setGoalMessage(null);
              try {
                const res = await fetch('/api/profile', {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ goal: goal.trim() || null }),
                  credentials: 'include',
                });
                if (!res.ok) throw new Error('保存に失敗しました');
                setGoalMessage('目標を保存しました');
                window.dispatchEvent(new Event('profile-updated'));
              } catch {
                setGoalMessage('保存に失敗しました');
              } finally {
                setGoalSaving(false);
              }
            }}
            className="space-y-4"
          >
            <div>
              <label htmlFor="goal" className="block text-xs font-medium text-slate-500 mb-1.5">
                目標（一文）
              </label>
              <input
                id="goal"
                type="text"
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-colors"
                placeholder="例：100m自由形で1分を切る"
              />
            </div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={showGoal}
                onChange={async (e) => {
                  const v = e.target.checked;
                  setShowGoal(v);
                  try {
                    await fetch('/api/profile', {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ show_goal: v }),
                      credentials: 'include',
                    });
                    window.dispatchEvent(new Event('profile-updated'));
                  } catch {
                    setShowGoal(!v);
                  }
                }}
                className="h-4 w-4 rounded border-gray-300 text-slate-700 focus:ring-slate-500"
              />
              <span className="text-sm text-slate-700">ダッシュボードに目標を表示する</span>
            </label>
            <button
              type="submit"
              disabled={goalSaving}
              className="px-6 py-2.5 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
              {goalSaving ? '保存中...' : '目標を保存'}
            </button>
            {goalMessage && (
              <p className={`text-sm ${goalMessage.includes('失敗') ? 'text-amber-600' : 'text-blue-600'}`}>
                {goalMessage}
              </p>
            )}
          </form>
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
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
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
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                  placeholder="もう一度入力"
                />
              </div>
              <button
                type="submit"
                disabled={passwordSaving}
                className="px-6 py-2.5 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
              >
                {passwordSaving ? '変更中...' : 'パスワードを変更'}
              </button>
            </div>
            {passwordMessage && (
              <p className={`text-sm ${passwordMessage.includes('失敗') || passwordMessage.includes('一致') ? 'text-amber-600' : 'text-blue-600'}`}>
                {passwordMessage}
              </p>
            )}
          </form>
          <div className="pt-2 border-t border-slate-100">
            {accountEmail && (
              <p className="text-xs text-slate-500 mb-1">登録メール: {accountEmail}</p>
            )}
            <p className="text-xs text-slate-500 mb-2">パスワードを忘れた場合は、登録メール宛にリセットリンクを送信できます。</p>
            <Link
              href={accountEmail ? `/forgot-password?email=${encodeURIComponent(accountEmail)}` : '/forgot-password'}
              className="inline-flex items-center px-5 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors"
            >
              パスワードをリセットする（メール送信）
            </Link>
          </div>
        </div>
      </section>

      {/* 有料プラン */}
      <section className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-800">有料プラン</h2>
          <p className="text-xs text-slate-500 mt-0.5">プレミアム機能の利用状況とプラン変更</p>
        </div>
        <div className="py-12 px-6 text-center">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 text-xl">◆</div>
          <p className="text-slate-600 font-medium">準備中</p>
          <p className="text-slate-400 text-sm mt-1">Stripe との連携は準備中です。しばらくお待ちください</p>
          <div className="mt-6 pt-6 border-t border-slate-100">
            <p className="text-xs text-slate-500 mb-3">お問い合わせ・最新情報はこちら</p>
            <ExternalLinks variant="buttons" />
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
              className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
            >
              ← マイページへ戻る
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}
