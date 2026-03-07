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
      <div className="flex items-center gap-2 sm:gap-3">
        <Link
          href="/signup"
          className="text-sm font-medium text-slate-600 hover:text-teal-700 transition-all duration-200 py-2.5 px-4 rounded-xl border border-slate-200/70 hover:border-teal-200/80 hover:bg-teal-50/50"
        >
          新規登録
        </Link>
        <Link
          href="/login"
          className="text-sm font-medium px-5 py-2.5 rounded-xl bg-teal-600 text-white hover:bg-teal-700 transition-all duration-200 shadow-[0_2px_8px_rgba(13,148,136,0.2)] hover:shadow-[0_4px_12px_rgba(13,148,136,0.25)]"
        >
          ログイン
        </Link>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-5">
      <Link
        href="/mypage/menu"
        className="text-sm font-medium text-slate-800/90 hover:text-slate-900 transition-colors py-2 px-3 rounded-lg hover:bg-slate-100/80"
      >
        練習メニュー
      </Link>
      <Link
        href="/mypage"
        className="text-sm font-medium text-slate-800/90 hover:text-slate-900 transition-colors py-2 px-3 rounded-lg hover:bg-slate-100/80"
      >
        マイページ
      </Link>
      <form action="/api/auth/logout" method="post">
        <button
          type="submit"
          className="text-sm px-3 py-1.5 rounded-lg border border-slate-200/80 bg-white/80 hover:bg-slate-50 text-slate-600 hover:text-slate-800 transition-colors backdrop-blur-sm"
        >
          ログアウト
        </button>
      </form>
    </div>
  );
}
