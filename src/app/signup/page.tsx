'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient, isAuthConfigured } from '@/lib/supabase/client';
import { WebViewOpenInBrowser } from '@/components/WebViewOpenInBrowser';

function SignupContent() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [authReady, setAuthReady] = useState<boolean | null>(null);

  useEffect(() => {
    fetch('/api/health')
      .then((r) => r.json())
      .then((d) => setAuthReady(d.authConfigured === true))
      .catch(() => setAuthReady(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!isAuthConfigured()) {
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
        } else {
          setError(err.message);
        }
        return;
      }
      router.push('/');
      router.refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : '登録に失敗しました。';
      console.error('Signup error:', e);
      if (msg.includes('NEXT_PUBLIC_SUPABASE')) {
        setError('認証サービスが設定されていません。管理者にお問い合わせください。');
      } else {
        setError('登録に失敗しました。しばらくしてから再度お試しください。');
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

          {authReady === false && (
            <div className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-md p-4 mb-4">
              <p className="font-semibold mb-1">認証サービスが未設定です</p>
              <p className="text-xs">
                Vercelの環境変数に <code className="bg-amber-100 px-1 rounded">NEXT_PUBLIC_SUPABASE_URL</code> と{' '}
                <code className="bg-amber-100 px-1 rounded">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> を設定してください。
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
              disabled={loading || authReady === false}
              className="w-full px-4 py-3 bg-slate-800 text-white rounded-md hover:bg-slate-900 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '登録中...' : authReady === false ? '認証サービス未設定' : '登録する'}
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

export default function SignupPage() {
  return <SignupContent />;
}
