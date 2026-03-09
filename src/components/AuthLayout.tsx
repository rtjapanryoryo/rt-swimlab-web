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
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-gradient-to-br from-cyan-50 via-teal-50 to-sky-100 py-6 sm:py-8 px-4 sm:px-6">
      {/* ヘッダー: ロゴ + タイトル + サブタイトル */}
      <div className="text-center mb-8">
        <div className="flex justify-center mb-4">
          <div className="inline-flex items-center justify-center p-5 rounded-3xl border-2 border-cyan-200/80 bg-white shadow-xl shadow-cyan-500/10">
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
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900">RTjapan</h1>
        <p className="text-sm text-slate-600 mt-1">
          立石諒・高城直基監修の指導哲学に基づく練習メニュー
        </p>
      </div>

      {/* カード + タブ（ジム風ポップ） */}
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl shadow-cyan-500/15 border-2 border-cyan-100/80 overflow-hidden">
        {/* タブ */}
        <div className="flex bg-slate-50/80 p-1.5 gap-1">
          <Link
            href="/login"
            className={`flex-1 py-3.5 text-center text-sm font-semibold rounded-2xl transition-all ${
              activeTab === 'login'
                ? 'bg-gradient-to-r from-cyan-500 to-teal-500 text-white shadow-lg shadow-cyan-500/25'
                : 'text-slate-600 hover:bg-white hover:text-slate-900'
            }`}
          >
            ログイン
          </Link>
          <Link
            href="/signup"
            className={`flex-1 py-3.5 text-center text-sm font-semibold rounded-2xl transition-all ${
              activeTab === 'signup'
                ? 'bg-gradient-to-r from-cyan-500 to-teal-500 text-white shadow-lg shadow-cyan-500/25'
                : 'text-slate-600 hover:bg-white hover:text-slate-900'
            }`}
          >
            新規登録
          </Link>
        </div>

        {/* フォームエリア（モバイル: 余白控えめ） */}
        <div className="p-6 sm:p-8">{children}</div>
      </div>

      {/* 著作権 */}
      <p className="mt-10 text-xs text-slate-500 tracking-wide font-medium">© 2026 RT-japan.</p>
    </div>
  );
}
