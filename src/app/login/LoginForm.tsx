'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { AuthLayout } from '@/components/AuthLayout';
import { WebViewOpenInBrowser } from '@/components/WebViewOpenInBrowser';

const BYPASS_COOKIE = 'dev-bypass-user-id';
const BYPASS_COOKIE_MAX_AGE = 60 * 60 * 24; // 24h

function setBypassCookie(userId: string) {
  document.cookie = `${BYPASS_COOKIE}=${encodeURIComponent(userId)}; path=/; max-age=${BYPASS_COOKIE_MAX_AGE}; SameSite=Lax`;
}

function sanitizeRedirectPath(value: string | null) {
  if (!value) return '/mypage';
  if (!value.startsWith('/') || value.startsWith('//') || value.includes('\\')) {
    return '/mypage';
  }
  try {
    const parsed = new URL(value, 'http://localhost');

    // ログイン後に外部URLへ飛ばないよう、redirectはアプリ内パスだけ許可します。
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return '/mypage';
  }
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
  const redirect = sanitizeRedirectPath(searchParams.get('redirect'));

  function handleDevBypass() {
    const userId = process.env.NEXT_PUBLIC_DEV_BYPASS_USER_ID;
    if (!userId) return;
    setBypassCookie(userId);
    window.location.href = redirect;
  }

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
      // 即リダイレクトして体感ラグを軽減。admin判定は並行で行い、必要ならreplace
      const baseTarget = redirect;
      router.push(baseTarget);
      setLoading(false); // 遷移開始したらローディング解除
      try {
        const res = await fetch('/api/profile', { credentials: 'include' });
        const json = await res.json().catch(() => ({}));
        if (json.profile?.role === 'admin' && baseTarget !== '/admin') {
          router.replace('/admin');
        }
      } catch {
        /* profile 取得失敗時は baseTarget のまま */
      }
    } catch {
      setError('ログインに失敗しました。');
    } finally {
      setLoading(false);
    }
  }

  return (
    <WebViewOpenInBrowser path="/login">
      <AuthLayout activeTab="login">

          {/* Google ログイン - NEXT_PUBLIC_GOOGLE_AUTH_ENABLED=true のときのみ表示 */}
          {process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED === 'true' && (
            <>
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={oauthLoading}
                className="w-full flex items-center justify-center gap-3 px-4 py-3.5 border-2 border-slate-200 rounded-2xl bg-white hover:bg-cyan-50/50 hover:border-cyan-200 font-semibold text-slate-700 disabled:opacity-50 mb-4 transition-all"
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
                  <div className="w-full border-t-2 border-slate-200" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-3 bg-white text-slate-500 font-medium">または</span>
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
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-2xl focus:ring-2 focus:ring-cyan-400/30 focus:border-cyan-400 outline-none min-h-[44px] sm:min-h-0 transition-colors"
                placeholder="example@email.com"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                パスワード
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="w-full px-4 py-3 pr-10 border-2 border-slate-200 rounded-2xl focus:ring-2 focus:ring-cyan-400/30 focus:border-cyan-400 outline-none min-h-[44px] sm:min-h-0 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-gray-500 hover:text-gray-700 rounded"
                  aria-label={showPassword ? 'パスワードを隠す' : 'パスワードを表示'}
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                  )}
                </button>
              </div>
              <Link
                href="/forgot-password"
                className="block mt-1.5 text-xs text-slate-500 hover:text-slate-700 underline"
              >
                パスワードをお忘れですか？
              </Link>
            </div>
            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-3">
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-4 bg-gradient-to-r from-cyan-500 to-teal-500 text-white rounded-2xl hover:from-cyan-600 hover:to-teal-600 font-semibold disabled:opacity-50 disabled:cursor-not-allowed min-h-[48px] touch-manipulation shadow-lg shadow-cyan-500/25 transition-all"
            >
              {loading ? 'ログイン中...' : 'ログイン'}
            </button>
          </form>

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
      </AuthLayout>
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
