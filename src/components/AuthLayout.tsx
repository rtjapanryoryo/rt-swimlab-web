'use client';

import Link from 'next/link';

type AuthLayoutProps = {
  activeTab: 'login' | 'signup';
  children: React.ReactNode;
};

/**
 * AZACLI風レイアウト: ロゴ・RTjapan・タブ・白カード・著作権
 */
export function AuthLayout({ activeTab, children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#f5f7fa] py-6 sm:py-8 px-4 sm:px-6">
      {/* ヘッダー: ロゴ + タイトル + サブタイトル */}
      <div className="text-center mb-8">
        <div className="flex justify-center mb-4">
          <div className="inline-flex items-center justify-center p-4 rounded-2xl border-2 border-slate-200/80 bg-white shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
            <img
              src="/RT-japan_Logo.svg"
              alt="RTjapan"
              className="h-20 sm:h-24 w-auto"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
                const fallback = (e.target as HTMLImageElement).nextElementSibling as HTMLElement;
                if (fallback) fallback.classList.remove('hidden');
              }}
            />
            <div className="hidden h-20 w-20 sm:h-24 sm:w-24 rounded-xl bg-slate-800 flex items-center justify-center text-white font-bold text-xl sm:text-2xl">
              RT
            </div>
          </div>
        </div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">RTjapan</h1>
        <p className="text-sm text-gray-600 mt-1">
          立石諒・高城直基監修の指導哲学に基づく練習メニュー
        </p>
      </div>

      {/* 白カード + タブ */}
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg border border-slate-200/80 overflow-hidden">
        {/* タブ */}
        <div className="flex border-b border-slate-200">
          <Link
            href="/login"
            className={`flex-1 py-4 text-center text-sm font-medium transition-colors ${
              activeTab === 'login'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            ログイン
          </Link>
          <Link
            href="/signup"
            className={`flex-1 py-4 text-center text-sm font-medium transition-colors ${
              activeTab === 'signup'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            新規登録
          </Link>
        </div>

        {/* フォームエリア（モバイル: 余白控えめ） */}
        <div className="p-6 sm:p-8">{children}</div>
      </div>

      {/* 著作権 */}
      <p className="mt-10 text-xs text-slate-400 tracking-wide">© 2026 RT-japan.</p>
    </div>
  );
}
