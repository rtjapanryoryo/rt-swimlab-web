'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { WebViewOpenInBrowser } from '@/components/WebViewOpenInBrowser';

const BYPASS_COOKIE = 'dev-bypass-user-id';
const BYPASS_COOKIE_MAX_AGE = 60 * 60 * 24; // 24h

function setBypassCookie(userId: string) {
  document.cookie = `${BYPASS_COOKIE}=${encodeURIComponent(userId)}; path=/; max-age=${BYPASS_COOKIE_MAX_AGE}; SameSite=Lax`;
}

function LoginFormInner({
  authConfigured,
  devBypassEnabled,
}: {
  authConfigured: boolean;
  devBypassEnabled?: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') ?? '/';

  function handleDevBypass() {
    const userId = process.env.NEXT_PUBLIC_DEV_BYPASS_USER_ID;
    if (!userId) return;
    setBypassCookie(userId);
    window.location.href = redirect || '/';
  }

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);

  async function handleGoogleLogin() {
    setOauthLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data, error: err } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${typeof window !== 'undefined' ? window.location.origin : ''}/auth/callback?next=${encodeURIComponent(redirect)}`,
        },
      });
      if (err) {
        setError(err.message);
        return;
      }
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : '';
      setError(msg.includes('NEXT_PUBLIC_SUPABASE') ? '認証の設定が完了していません。管理者にお問い合わせください。' : 'Google ログインに失敗しました。');
    } finally {
      setOauthLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const supabase = createClient();
      const { error: err } = await supabase.auth.signInWithPassword({ email, password });
      if (err) {
        setError(err.message === 'Invalid login credentials' ? 'メールアドレスまたはパスワードが正しくありません。' : err.message);
        return;
      }
      let target = redirect || '/';
      try {
        const res = await fetch('/api/profile', { credentials: 'include' });
        const json = await res.json().catch(() => ({}));
        if (json.profile?.role === 'admin') target = '/admin';
      } catch {
        /* profile 取得失敗時は /mypage へ */
      }
      router.push(target);
      router.refresh();
    } catch {
      setError('ログインに失敗しました。');
    } finally {
      setLoading(false);
    }
  }

  return (
    <WebViewOpenInBrowser path="/login">
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full">
          <h1 className="text-xl font-bold text-gray-900 mb-2">RT swim lab</h1>
          <p className="text-sm text-gray-600 mb-6">
            立石諒・高城直基監修の指導哲学に基づく練習メニューを、あなた用に作成します。
          </p>

          {/* Google ログイン - NEXT_PUBLIC_GOOGLE_AUTH_ENABLED=true のときのみ表示 */}
          {process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED === 'true' && (
            <>
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={oauthLoading}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-300 rounded-md bg-white hover:bg-gray-50 font-medium text-gray-700 disabled:opacity-50 mb-4"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                {oauthLoading ? '接続中...' : 'Google でログイン'}
              </button>
              <div className="relative mb-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">または</span>
                </div>
              </div>
            </>
          )}

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
            <div>
              <div className="flex justify-between items-center mb-1">
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  パスワード
                </label>
                <Link
                  href="/forgot-password"
                  className="text-xs text-slate-500 hover:text-slate-700 underline"
                >
                  パスワードをお忘れですか？
                </Link>
              </div>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-slate-500 focus:border-slate-500"
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
              {loading ? 'ログイン中...' : 'ログイン'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-600">
            アカウントをお持ちでない方は{' '}
            <Link href="/signup" className="text-slate-700 font-medium underline underline-offset-2 hover:text-slate-900">
              新規登録
            </Link>
          </p>

          {devBypassEnabled && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={handleDevBypass}
                className="w-full px-4 py-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md hover:bg-amber-100"
              >
                開発用で入る（フリーパス）
              </button>
            </div>
          )}
        </div>
      </div>
    </WebViewOpenInBrowser>
  );
}

export function LoginForm({
  authConfigured,
  devBypassEnabled,
}: {
  authConfigured: boolean;
  devBypassEnabled?: boolean;
}) {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">読み込み中...</div>}>
      <LoginFormInner authConfigured={authConfigured} devBypassEnabled={devBypassEnabled} />
    </Suspense>
  );
}
