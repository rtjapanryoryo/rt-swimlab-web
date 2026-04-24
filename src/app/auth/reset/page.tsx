'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

// implicit flow のパスワードリセットメールリンクはトークンをハッシュで返す。
// ハッシュはサーバーに届かないため、このクライアント専用ページで処理する。
export default function AuthResetPage() {
  const router = useRouter();

  useEffect(() => {
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    const accessToken  = params.get('access_token');
    const refreshToken = params.get('refresh_token');
    const type         = params.get('type');

    if (accessToken && refreshToken && type === 'recovery') {
      const supabase = createClient();
      supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
        .then(({ error }) => {
          router.push(error ? '/forgot-password?error=expired' : '/update-password');
        });
    } else {
      router.push('/forgot-password?error=expired');
    }
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center space-y-3">
        <div className="w-8 h-8 border-2 border-slate-400 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm text-gray-500">認証中...</p>
      </div>
    </div>
  );
}
