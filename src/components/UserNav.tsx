'use client';

import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';

const LINE_URL = process.env.NEXT_PUBLIC_LINE_URL || '';

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
        {LINE_URL && (
          <a
            href={LINE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs md:text-sm text-slate-600 hover:text-slate-900 underline underline-offset-2"
          >
            お問い合わせ
          </a>
        )}
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
      {LINE_URL && (
        <a
          href={LINE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-medium text-slate-800/90 hover:text-slate-900 transition-colors py-2 px-3 rounded-lg hover:bg-slate-100/80"
        >
          お問い合わせ
        </a>
      )}
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
