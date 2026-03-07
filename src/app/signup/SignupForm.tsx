'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { WebViewOpenInBrowser } from '@/components/WebViewOpenInBrowser';

export function SignupForm({ authConfigured }: { authConfigured: boolean }) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
          setError('Supabase に接続できません。プロジェクトが一時停止していないか、環境変数を確認してください。');
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
        setError('Supabase に接続できません。プロジェクトが一時停止していないか、ネットワークを確認してください。');
      } else {
        setError(msg || '登録に失敗しました。しばらくしてから再度お試しください。');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <WebViewOpenInBrowser path="/signup">
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full">
          <h1 className="text-xl font-bold text-gray-900 mb-2">新規登録</h1>
          <p className="text-sm text-gray-600 mb-6">
            名前は匿名でもOK。メールアドレスとパスワードでアカウントを作成し、マイページでメニューを管理できます。
          </p>

          {/* Google 登録 - 常に表示（env未設定時はクリックでエラー） */}
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

          {!authConfigured && (
            <div className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-md p-4 mb-4">
              <p className="font-semibold mb-1">認証サービスが未設定です</p>
              <p className="text-xs mt-1">
                <code className="bg-amber-100 px-1 rounded">NEXT_PUBLIC_SUPABASE_URL</code> と{' '}
                <code className="bg-amber-100 px-1 rounded">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> を設定してください。
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-slate-500 focus:border-slate-500"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-slate-500 focus:border-slate-500"
                placeholder="example@email.com"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                パスワード <span className="text-red-500">*</span>
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
            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-3">
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={loading || !authConfigured}
              className="w-full px-4 py-3 bg-slate-800 text-white rounded-md hover:bg-slate-900 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '登録中...' : !authConfigured ? '認証サービス未設定' : '登録する'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-600">
            すでにアカウントをお持ちの方は{' '}
            <Link href="/login" className="text-slate-700 font-medium underline underline-offset-2 hover:text-slate-900">
              ログイン
            </Link>
          </p>
        </div>
      </div>
    </WebViewOpenInBrowser>
  );
}
