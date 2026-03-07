'use client';

import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';

export function UserNav() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500">
        読み込み中...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center gap-3">
        <Link
          href="/signup"
          className="text-xs md:text-sm text-slate-600 hover:text-slate-900 underline underline-offset-2"
        >
          新規登録
        </Link>
        <Link
          href="/login"
          className="text-sm px-3 py-1.5 rounded-md border border-gray-300 bg-white hover:bg-gray-50 text-gray-700"
        >
          ログイン
        </Link>
      </div>
    );
  }

  const displayName = user.user_metadata?.full_name as string | undefined;
  const email = user.email ?? '';

  return (
    <div className="flex items-center gap-3">
      <Link
        href="/"
        className="text-xs md:text-sm text-slate-600 hover:text-slate-900 underline underline-offset-2"
      >
        練習メニュー
      </Link>
      <Link
        href="/mypage"
        className="text-xs md:text-sm text-slate-600 hover:text-slate-900 underline underline-offset-2"
      >
        マイページ
      </Link>
      <span className="text-xs md:text-sm text-gray-700 truncate max-w-[100px] md:max-w-[180px]">
        {displayName ?? email ?? 'ログイン中'}
      </span>
      <form action="/api/auth/logout" method="post">
        <button
          type="submit"
          className="text-sm px-3 py-1.5 rounded-md border border-gray-300 bg-white hover:bg-gray-50 text-gray-700"
        >
          ログアウト
        </button>
      </form>
    </div>
  );
}
