'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { WebViewOpenInBrowser } from '@/components/WebViewOpenInBrowser';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const supabase = createClient();
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
      const redirectTo = `${baseUrl}/auth/callback?next=/update-password`;
      const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo,
      });
      if (err) {
        setError(err.message);
        return;
      }
      setSent(true);
    } catch {
      setError('送信に失敗しました。');
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <WebViewOpenInBrowser path="/forgot-password">
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full">
            <h1 className="text-xl font-bold text-gray-900 mb-4">メールを送信しました</h1>
            <p className="text-sm text-gray-600 mb-6">
              {email} にパスワードリセット用のリンクを送りました。メール内のリンクをクリックし、新しいパスワードを設定してください。
            </p>
            <p className="text-xs text-gray-500 mb-6">
              メールが届かない場合は、迷惑メールフォルダをご確認ください。数分かかる場合があります。
            </p>
            <Link
              href="/login"
              className="block w-full text-center px-4 py-3 bg-slate-800 text-white rounded-md hover:bg-slate-900 font-medium"
            >
              ログインへ戻る
            </Link>
          </div>
        </div>
      </WebViewOpenInBrowser>
    );
  }

  return (
    <WebViewOpenInBrowser path="/forgot-password">
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full">
          <h1 className="text-xl font-bold text-gray-900 mb-2">パスワードをお忘れですか？</h1>
          <p className="text-sm text-gray-600 mb-6">
            登録したメールアドレスを入力すると、パスワードリセット用のリンクをお送りします。
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                メールアドレス
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-slate-500 focus:border-slate-500"
                placeholder="example@email.com"
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
              {loading ? '送信中...' : 'リセット用メールを送信'}
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
