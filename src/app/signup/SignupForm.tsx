'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { AuthLayout } from '@/components/AuthLayout';
import { WebViewOpenInBrowser } from '@/components/WebViewOpenInBrowser';

export function SignupForm({ authConfigured }: { authConfigured: boolean }) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);

  async function handleGoogleSignup() {
    setOauthLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data, error: err } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${typeof window !== 'undefined' ? window.location.origin : ''}/auth/callback?next=/`,
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
      setError(msg.includes('NEXT_PUBLIC_SUPABASE') ? '認証の設定が完了していません。管理者にお問い合わせください。' : 'Google 登録に失敗しました。');
    } finally {
      setOauthLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    if (!authConfigured) {
      setError('認証サービスが設定されていません。管理者にお問い合わせください。');
      setLoading(false);
      return;
    }
    if (!agreedToTerms) {
      setError('規約およびプライバシーポリシーに同意してください。');
      setLoading(false);
      return;
    }
    try {
      const supabase = createClient();
      const { error: err } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name.trim() || undefined,
          },
        },
      });
      if (err) {
        if (err.message.includes('already registered') || err.message.includes('User already registered')) {
          setError('このメールアドレスは既に登録されています。ログインしてください。');
        } else if (err.message.includes('Password should be')) {
          setError('パスワードは6文字以上で入力してください。');
        } else if (err.message.includes('Invalid email')) {
          setError('有効なメールアドレスを入力してください。');
        } else if (err.message === 'Failed to fetch' || err.message.includes('fetch')) {
          setError('認証サービスに接続できません。設定を確認するか、しばらくしてから再度お試しください。');
        } else {
          setError(err.message);
        }
        return;
      }
      router.push('/');
      router.refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : '';
      console.error('Signup error:', e);
      if (msg.includes('NEXT_PUBLIC_SUPABASE')) {
        setError('認証サービスが設定されていません。管理者にお問い合わせください。');
      } else if (msg.includes('Failed to fetch') || msg.includes('fetch failed')) {
        setError('認証サービスに接続できません。ネットワークを確認するか、しばらくしてから再度お試しください。');
      } else {
        setError(msg || '登録に失敗しました。しばらくしてから再度お試しください。');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <WebViewOpenInBrowser path="/signup">
      <AuthLayout activeTab="signup">
          {/* Google 登録 - NEXT_PUBLIC_GOOGLE_AUTH_ENABLED=true のときのみ表示 */}
          {process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED === 'true' && (
            <>
              <button
                type="button"
                onClick={handleGoogleSignup}
                disabled={oauthLoading}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-300 rounded-md bg-white hover:bg-gray-50 font-medium text-gray-700 disabled:opacity-50 mb-4"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                {oauthLoading ? '接続中...' : 'Google で登録'}
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

          {!authConfigured && (
            <div className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-md p-4 mb-4">
              <p className="font-semibold mb-1">認証サービスが未設定です</p>
              <p className="text-xs mt-1">
                認証用の環境変数を設定してください。
              </p>
              <p className="text-xs mt-2 text-amber-700">
                {typeof window !== 'undefined' && window.location.hostname === 'localhost'
                  ? 'ローカル: .env.ai に追記し、npm run dev を再起動'
                  : '本番: Vercel ダッシュボード → Settings → Environment Variables で設定後、Redeploy'}
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                表示名（任意・匿名OK）
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                className="w-full px-3 py-2.5 sm:py-2 border border-gray-300 rounded-md focus:ring-slate-500 focus:border-slate-500 min-h-[44px] sm:min-h-0"
                placeholder="例: 匿名スイマー、またはお名前"
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                メールアドレス <span className="text-red-500">*</span>
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full px-3 py-2.5 sm:py-2 border border-gray-300 rounded-md focus:ring-slate-500 focus:border-slate-500 min-h-[44px] sm:min-h-0"
                placeholder="example@email.com"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                パスワード <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete="new-password"
                  className="w-full px-3 py-2.5 sm:py-2 pr-10 border border-gray-300 rounded-md focus:ring-slate-500 focus:border-slate-500 min-h-[44px] sm:min-h-0"
                  placeholder="6文字以上"
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
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-slate-700 focus:ring-slate-500"
                />
                <span className="text-sm text-slate-700">
                  <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-slate-600 hover:text-slate-800 underline" onClick={(e) => e.stopPropagation()}>利用規約</a>
                  および
                  <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-slate-600 hover:text-slate-800 underline" onClick={(e) => e.stopPropagation()}>プライバシーポリシー</a>
                  に同意する
                </span>
              </label>
            </div>
            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-3">
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={loading || !authConfigured || !agreedToTerms}
              className="w-full px-4 py-3.5 sm:py-3 bg-slate-800 text-white rounded-md hover:bg-slate-900 font-medium disabled:opacity-50 disabled:cursor-not-allowed min-h-[48px] touch-manipulation"
            >
              {loading ? '登録中...' : !authConfigured ? '認証サービス未設定' : '登録する'}
            </button>
          </form>
      </AuthLayout>
    </WebViewOpenInBrowser>
  );
}
