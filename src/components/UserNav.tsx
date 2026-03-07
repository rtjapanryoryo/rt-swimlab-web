'use client';

import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';

function LogoutIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

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
          className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg border border-slate-200/80 bg-white/80 hover:bg-slate-50 text-slate-600 hover:text-slate-800 transition-colors backdrop-blur-sm"
        >
          <LogoutIcon />
          ログアウト
        </button>
      </form>
    </div>
  );
}
