'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';

function LogoutIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

const LINE_URL = process.env.NEXT_PUBLIC_LINE_URL || '';
const COMMUNITY_URL = process.env.NEXT_PUBLIC_COMMUNITY_URL || '';

const navItems = [
  { href: '/mypage', label: 'ダッシュボード', icon: '○' },
  { href: '/mypage/menu', label: 'RT swim lab', icon: '◆' },
  { href: '/mypage/genetic', label: 'RT GENE PROFILE', icon: '◇' },
  { href: '/mypage/subscription', label: '有料プラン', icon: '◇' },
  { href: COMMUNITY_URL || '#', label: 'RTコミュニティ', icon: '○', external: true, disabled: !COMMUNITY_URL },
  { href: '/mypage/settings', label: '設定', icon: '⚙' },
];

export default function MyPageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { user, loading } = useAuth();
  const [displayName, setDisplayName] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    fetch('/api/profile', { credentials: 'include' })
      .then((r) => r.json())
      .then((res) => setDisplayName(res.profile?.display_name ?? null))
      .catch(() => setDisplayName(null));
  }, [user]);

  useEffect(() => {
    const handler = () => {
      if (!user) return;
      fetch('/api/profile', { credentials: 'include' })
        .then((r) => r.json())
        .then((res) => setDisplayName(res.profile?.display_name ?? null))
        .catch(() => setDisplayName(null));
    };
    window.addEventListener('profile-updated', handler);
    return () => window.removeEventListener('profile-updated', handler);
  }, [user]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#f8fafc] via-[#f1f5f9] to-[#e0f2fe]">
        {loading ? (
          <div className="flex flex-col items-center gap-4">
            <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-600 rounded-full animate-spin" />
            <p className="text-sm text-slate-500">読み込み中...</p>
          </div>
        ) : (
          <div className="text-center space-y-6 px-6">
            <p className="text-slate-600">マイページを利用するにはログインしてください。</p>
            <Link
              href="/login?redirect=/mypage"
              className="inline-block px-6 py-3 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors shadow-sm"
            >
              ログイン
            </Link>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen rt-atmosphere">
      {/* モバイル用ヘッダーカルーセル（PCでは非表示。PCは添付イメージ通りサイドバーのみ） */}
      <header
        className="lg:hidden sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200/80 no-print"
        aria-label="マイページナビゲーション"
      >
        <div className="px-4 py-3">
          <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">My Page</p>
          <p className="text-base font-semibold text-slate-800 mt-0.5 truncate">
            {displayName ? `${displayName}様` : 'マイページ'}
          </p>
        </div>
        <nav className="overflow-x-auto scrollbar-hide scroll-smooth border-t border-slate-100">
          <div className="flex gap-1 px-4 py-2 min-w-max">
            {navItems.map((item) => {
              const isActive =
                'external' in item
                  ? false
                  : item.href === '/mypage'
                    ? pathname === '/mypage' || pathname === '/mypage/'
                    : item.href === pathname || pathname.startsWith(item.href + '/');
              const baseClass =
                'flex items-center gap-1.5 shrink-0 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors whitespace-nowrap';
              const activeClass = isActive
                ? 'bg-blue-100 text-blue-800'
                : 'text-slate-600 hover:bg-slate-100';
              const content = (
                <>
                  <span className="text-xs opacity-70">{item.icon}</span>
                  {item.label}
                </>
              );
              if ('external' in item && item.external) {
                const isDisabled = 'disabled' in item && item.disabled;
                return (
                  <span key={item.label}>
                    {isDisabled ? (
                      <span className={`${baseClass} text-slate-400 cursor-default`} title="NEXT_PUBLIC_COMMUNITY_URL を設定するとRTコミュニティへリンクします">
                        {content}
                      </span>
                    ) : (
                      <a
                        href={item.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`${baseClass} ${activeClass}`}
                      >
                        {content}
                      </a>
                    )}
                  </span>
                );
              }
              return (
                <Link key={item.href} href={item.href} className={`${baseClass} ${activeClass}`}>
                  {content}
                </Link>
              );
            })}
            <form action="/api/auth/logout" method="post" className="shrink-0">
              <button
                type="submit"
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors whitespace-nowrap"
              >
                <LogoutIcon />
                ログアウト
              </button>
            </form>
          </div>
        </nav>
      </header>

      <div className="flex flex-col lg:flex-row min-h-screen">
        {/* サイドナビ（PC: 左端固定。モバイルではヘッダーカルーセルで表示） */}
        <aside className="hidden lg:flex lg:fixed lg:inset-y-0 lg:left-0 lg:w-72 lg:z-40 lg:flex-shrink-0">
          <nav className="w-full h-full overflow-y-auto bg-gradient-to-b from-white via-[#fafbff] to-[#f8fafc] border-r border-slate-200/80 shadow-sm">
            <div className="px-5 py-4 border-b border-slate-100">
              <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">
                My Page
              </p>
              <p className="text-lg font-semibold text-slate-800 mt-0.5 truncate" title={displayName ? `${displayName}様` : undefined}>
                {displayName ? `${displayName}様` : 'マイページ'}
              </p>
            </div>
            <ul className="py-2">
              {navItems.map((item) => {
                const isActive =
                  'external' in item
                    ? false
                    : item.href === '/mypage'
                      ? pathname === '/mypage' || pathname === '/mypage/'
                      : pathname === item.href || pathname.startsWith(item.href + '/');
                const baseClass =
                  'flex items-center gap-3 w-full px-5 py-3 text-left text-base font-medium transition-colors';
                const activeClass = isActive
                  ? 'bg-blue-50 text-blue-800 border-l-2 border-blue-500'
                  : 'text-slate-600 hover:bg-slate-50/80 hover:text-slate-900';
                const content = (
                  <>
                    <span className={`text-xs opacity-70 ${isActive ? 'text-blue-600' : ''}`}>{item.icon}</span>
                    {item.label}
                  </>
                );
                if ('external' in item && item.external) {
                  const isDisabled = 'disabled' in item && item.disabled;
                  return (
                    <li key={item.label}>
                      {isDisabled ? (
                        <span className={`${baseClass} text-slate-400 cursor-default`} title="NEXT_PUBLIC_LINE_URL を設定するとRT公式LINEへリンクします">
                          {content}
                        </span>
                      ) : (
                        <a
                          href={item.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`${baseClass} ${activeClass}`}
                        >
                          {content}
                        </a>
                      )}
                    </li>
                  );
                }
                return (
                  <li key={item.href}>
                    <Link href={item.href} className={`${baseClass} ${activeClass}`}>
                      {content}
                    </Link>
                  </li>
                );
              })}
            </ul>
            <div className="px-5 py-3 border-t border-slate-100">
              <form action="/api/auth/logout" method="post">
                <button
                  type="submit"
                  className="flex items-center gap-2 w-full text-left text-base font-medium text-slate-600 hover:text-slate-900 transition-colors py-2 -ml-1"
                >
                  <LogoutIcon />
                  ログアウト
                </button>
              </form>
            </div>
          </nav>
        </aside>

        {/* メインコンテンツ（PC: サイドバー分の余白＋パディング。本面は広めに） */}
        <main className="flex-1 min-w-0 order-1 lg:order-2 py-6 sm:py-8 px-4 sm:px-6 lg:pl-[20rem] lg:pr-4 lg:py-8 lg:max-w-[calc(100%-20rem-1rem)]">
          {children}
        </main>
      </div>
    </div>
  );
}
