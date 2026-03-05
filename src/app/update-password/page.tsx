'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { WebViewOpenInBrowser } from '@/components/WebViewOpenInBrowser';

export default function UpdatePasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError('パスワードは6文字以上で入力してください。');
      return;
    }
    if (password !== confirm) {
      setError('パスワードが一致しません。');
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();
      const { error: err } = await supabase.auth.updateUser({ password });
      if (err) {
        setError(err.message);
        return;
      }
      setDone(true);
      setTimeout(() => {
        router.push('/');
        router.refresh();
      }, 2000);
    } catch {
      setError('パスワードの更新に失敗しました。リンクの有効期限が切れている可能性があります。');
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <WebViewOpenInBrowser path="/update-password">
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full">
            <h1 className="text-xl font-bold text-gray-900 mb-4 text-green-700">パスワードを更新しました</h1>
            <p className="text-sm text-gray-600 mb-6">
              新しいパスワードでログインできるようになりました。トップページへ移動します。
            </p>
            <Link
              href="/"
              className="block w-full text-center px-4 py-3 bg-slate-800 text-white rounded-md hover:bg-slate-900 font-medium"
            >
              トップへ
            </Link>
          </div>
        </div>
      </WebViewOpenInBrowser>
    );
  }

  return (
    <WebViewOpenInBrowser path="/update-password">
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full">
          <h1 className="text-xl font-bold text-gray-900 mb-2">新しいパスワードを設定</h1>
          <p className="text-sm text-gray-600 mb-6">
            メール内のリンクからアクセスしました。新しいパスワードを入力してください。
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                新しいパスワード <span className="text-red-500">*</span>
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-slate-500 focus:border-slate-500"
                placeholder="6文字以上"
              />
            </div>
            <div>
              <label htmlFor="confirm" className="block text-sm font-medium text-gray-700 mb-1">
                パスワード（確認） <span className="text-red-500">*</span>
              </label>
              <input
                id="confirm"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-slate-500 focus:border-slate-500"
                placeholder="もう一度入力"
              />
            </div>
            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-3">
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-3 bg-slate-800 text-white rounded-md hover:bg-slate-900 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '更新中...' : 'パスワードを更新'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-600">
            <Link href="/login" className="text-slate-700 font-medium underline underline-offset-2 hover:text-slate-900">
              ← ログインへ戻る
            </Link>
          </p>
        </div>
      </div>
    </WebViewOpenInBrowser>
  );
}
