'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { ProfileProvider, useProfile } from '@/contexts/ProfileContext';
import {
  AccountIcon,
  AdminIcon,
  CoachIcon,
  CommunityIcon,
  CounselingIcon,
  DashboardIcon,
  FeedbackIcon,
  GeneProfileIcon,
  GoalSheetIcon,
  LogoutIcon,
  SwimLabIcon,
} from '@/components/icons/MypageNavIcons';

const LINE_URL = process.env.NEXT_PUBLIC_LINE_URL || '';
const COMMUNITY_URL = process.env.NEXT_PUBLIC_COMMUNITY_URL || '';

const navItems = [
  { href: '/mypage', label: 'ダッシュボード', Icon: DashboardIcon },
  { href: '/mypage/menu', label: 'RT swim lab', Icon: SwimLabIcon, footerLabel: 'swim lab' },
  { href: '/mypage/goal-sheet', label: '目標シート', Icon: GoalSheetIcon, footerLabel: '目標' },
  { href: '/mypage/counseling', label: 'カウンセリング', Icon: CounselingIcon, footerLabel: 'カウンセリング' },
  { href: '/mypage/genetic', label: 'RT GENE PROFILE', Icon: GeneProfileIcon, hideInFooter: true },
  { href: COMMUNITY_URL || '#', label: 'RTコミュニティ', Icon: CommunityIcon, external: true, disabled: !COMMUNITY_URL, footerLabel: 'コミュニティ' },
  { href: '/mypage/feedback', label: 'フィードバック', Icon: FeedbackIcon, footerLabel: 'フィードバック' },
  { href: '/mypage/settings', label: 'アカウント情報', Icon: AccountIcon },
];

function MyPageLayoutInner({
  children,
  pathname,
}: {
  children: React.ReactNode;
  pathname: string;
}) {
  const { profile } = useProfile();
  const displayName = profile?.display_name ?? null;
  const isAdmin = profile?.role === 'admin';
  const isCoach = profile?.role === 'coach' || isAdmin;

  return (
    <div className="min-h-screen rt-atmosphere">
      <div className="flex flex-col lg:flex-row min-h-screen">
        {/* サイドナビ（PC: 左端固定。モバイルではフッターカルーセルで表示） */}
        <aside className="hidden lg:flex lg:fixed lg:inset-y-0 lg:left-0 lg:w-64 lg:z-40 lg:flex-shrink-0">
          <nav className="w-full h-full overflow-y-auto bg-gradient-to-b from-white via-[#f0fdfa] to-[#ecfeff] border-r border-cyan-200/50 shadow-lg shadow-cyan-500/5">
            <div className="px-5 py-4 border-b border-cyan-100/80">
              <p className="text-[10px] font-bold text-cyan-500 uppercase tracking-widest">
                My Page
              </p>
              <p className="text-lg font-bold text-slate-800 mt-0.5 truncate" title={displayName ? `${displayName}様` : undefined}>
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
                      : item.href === pathname || pathname.startsWith(item.href + '/');
                const baseClass =
                  'flex items-center gap-3 w-full px-5 py-3 text-left text-base font-medium transition-all rounded-r-xl mx-2';
                const activeClass = isActive
                  ? 'bg-gradient-to-r from-cyan-100 to-teal-50 text-cyan-800 border-l-4 border-cyan-500 font-semibold'
                  : 'text-slate-600 hover:bg-cyan-50/80 hover:text-slate-900';
                const IconComponent = item.Icon;
                const content = (
                  <>
                    <IconComponent />
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
            {isCoach && (
              <div className="px-3 pb-1">
                <Link
                  href="/mypage/coach"
                  className="flex items-center gap-3 w-full px-4 py-2.5 text-sm font-semibold text-cyan-700 bg-cyan-50 hover:bg-cyan-100 border border-cyan-200 rounded-xl transition-colors"
                >
                  <CoachIcon />
                  コーチダッシュボード
                </Link>
              </div>
            )}
            {isAdmin && (
              <div className="px-3 pb-2">
                <Link
                  href="/admin"
                  className="flex items-center gap-3 w-full px-4 py-2.5 text-sm font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl transition-colors"
                >
                  <AdminIcon />
                  管理者ダッシュボード
                </Link>
              </div>
            )}
            <div className="px-5 py-3 border-t border-cyan-100/80">
              <form action="/api/auth/logout" method="post">
                <button
                  type="submit"
                  className="flex items-center gap-2 w-full text-left text-base font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50/80 rounded-xl py-2 px-3 transition-colors"
                >
                  <LogoutIcon />
                  ログアウト
                </button>
              </form>
            </div>
          </nav>
        </aside>

        {/* メインコンテンツ（PC: サイドバー＋余白＋パディング。モバイル: フッター分の余白） */}
        <main className="flex-1 min-w-0 order-1 lg:order-2 py-6 sm:py-8 px-4 sm:px-6 lg:pl-72 lg:pr-8 xl:pr-12 lg:py-8 pb-24 lg:pb-8">
          {children}
        </main>
      </div>

      {/* モバイル用フッター（PCでは非表示。アイコン上・ラベル下） */}
      <footer
        className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-xl border-t-2 border-cyan-100/80 shadow-[0_-4px_20px_rgba(6,182,212,0.08)] no-print"
        aria-label="マイページナビゲーション"
      >
        <nav className="overflow-x-auto scrollbar-hide scroll-smooth">
          <div className="flex gap-0 min-w-max px-2 py-3">
            {navItems.filter((item) => !('hideInFooter' in item && item.hideInFooter)).map((item) => {
              const isActive =
                'external' in item
                  ? false
                  : item.href === '/mypage'
                    ? pathname === '/mypage' || pathname === '/mypage/'
                    : item.href === pathname || pathname.startsWith(item.href + '/');
              const baseClass =
                'flex flex-col items-center justify-center gap-0.5 shrink-0 min-w-[64px] py-2 px-2 rounded-2xl text-[10px] font-semibold transition-all';
              const activeClass = isActive
                ? 'text-cyan-600 bg-cyan-50'
                : 'text-slate-600 hover:text-slate-800 hover:bg-cyan-50/50';
              const IconComponent = item.Icon;
              const footerLabel = 'footerLabel' in item ? item.footerLabel : item.label;
              const content = (
                <>
                  <span className="flex justify-center [&>svg]:w-5 [&>svg]:h-5">
                    <IconComponent />
                  </span>
                  <span className="leading-tight text-center">{footerLabel}</span>
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
            {isCoach && (
              <Link
                href="/mypage/coach"
                className="flex flex-col items-center justify-center gap-0.5 shrink-0 min-w-[64px] py-2 px-2 rounded-2xl text-[10px] font-semibold text-cyan-600 hover:bg-cyan-50 transition-colors"
              >
                <span className="flex justify-center [&>svg]:w-5 [&>svg]:h-5">
                  <CoachIcon />
                </span>
                <span className="leading-tight">コーチ</span>
              </Link>
            )}
            {isAdmin && (
              <Link
                href="/admin"
                className="flex flex-col items-center justify-center gap-0.5 shrink-0 min-w-[64px] py-2 px-2 rounded-2xl text-[10px] font-semibold text-amber-600 hover:bg-amber-50 transition-colors"
              >
                <span className="flex justify-center [&>svg]:w-5 [&>svg]:h-5">
                  <AdminIcon />
                </span>
                <span className="leading-tight">管理者</span>
              </Link>
            )}
            <form action="/api/auth/logout" method="post" className="shrink-0">
              <button
                type="submit"
                className="flex flex-col items-center justify-center gap-0.5 shrink-0 min-w-[64px] py-2 px-2 rounded-2xl text-[10px] font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-50 transition-colors"
              >
                <span className="flex justify-center [&>svg]:w-5 [&>svg]:h-5">
                  <LogoutIcon />
                </span>
                <span className="leading-tight">ログアウト</span>
              </button>
            </form>
          </div>
        </nav>
      </footer>
    </div>
  );
}

export default function MyPageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { user, loading } = useAuth();

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-cyan-50 via-teal-50 to-sky-100">
        {loading ? (
          <div className="flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-2 border-cyan-200 border-t-cyan-500 rounded-full animate-spin" />
            <p className="text-sm text-slate-600 font-medium">読み込み中...</p>
          </div>
        ) : (
          <div className="text-center space-y-6 px-6">
            <p className="text-slate-600">マイページを利用するにはログインしてください。</p>
            <Link
              href="/login?redirect=/mypage"
              className="inline-block px-8 py-4 rounded-2xl bg-gradient-to-r from-cyan-500 to-teal-500 text-white font-semibold hover:from-cyan-600 hover:to-teal-600 shadow-lg shadow-cyan-500/25 transition-all"
            >
              ログイン
            </Link>
          </div>
        )}
      </div>
    );
  }

  return (
    <ProfileProvider>
      <MyPageLayoutInner pathname={pathname}>{children}</MyPageLayoutInner>
    </ProfileProvider>
  );
}
