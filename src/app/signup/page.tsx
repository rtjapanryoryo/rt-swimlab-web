'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { WebViewOpenInBrowser } from '@/components/WebViewOpenInBrowser';

function SignupContent() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

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
        if (err.message.includes('already registered')) {
          setError('このメールアドレスは既に登録されています。ログインしてください。');
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
        setError('認証の設定ができていません。開発者に.env.aiの設定を確認してください。');
      } else {
        setError(msg);
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
              disabled={loading}
              className="w-full px-4 py-3 bg-slate-800 text-white rounded-md hover:bg-slate-900 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '登録中...' : '登録する'}
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
