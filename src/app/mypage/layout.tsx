'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';

const LINE_URL = process.env.NEXT_PUBLIC_LINE_URL || '';
const COMMUNITY_URL = process.env.NEXT_PUBLIC_COMMUNITY_URL || '';

const navItems = [
  { href: '/mypage', label: 'ダッシュボード', icon: '◉' },
  { href: '/mypage/menus', label: 'メニューログ', icon: '▸' },
  { href: '/mypage/genetic', label: '遺伝子情報PDF', icon: '◇' },
  { href: '/mypage/subscription', label: '有料プラン', icon: '◆' },
  ...(LINE_URL ? [{ href: LINE_URL, label: 'RT公式LINE', icon: '●', external: true }] : []),
  ...(COMMUNITY_URL ? [{ href: COMMUNITY_URL, label: 'コミュニティ', icon: '○', external: true }] : []),
  { href: '/mypage/settings', label: '設定', icon: '⚙' },
];

export default function MyPageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { user, loading } = useAuth();

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
        {loading ? (
          <div className="flex flex-col items-center gap-4">
            <div className="w-8 h-8 border-2 border-teal-500/30 border-t-teal-600 rounded-full animate-spin" />
            <p className="text-sm text-slate-500">読み込み中...</p>
          </div>
        ) : (
          <div className="text-center space-y-6 px-6">
            <p className="text-slate-600">マイページを利用するにはログインしてください。</p>
            <Link
              href="/login?redirect=/mypage"
              className="inline-block px-6 py-3 rounded-xl bg-teal-600 text-white font-medium hover:bg-teal-700 transition-colors shadow-sm"
            >
              ログイン
            </Link>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <div className="max-w-6xl mx-auto flex flex-col lg:flex-row gap-8 py-8 px-4 sm:px-6">
        {/* サイドナビ */}
        <aside className="lg:w-56 flex-shrink-0">
          <nav className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden sticky top-8">
            <div className="px-5 py-4 border-b border-slate-100">
              <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">
                My Page
              </p>
              <p className="text-sm font-semibold text-slate-800 mt-0.5">マイページ</p>
            </div>
            <ul className="py-2">
              {navItems.map((item) => {
                const isActive =
                  'external' in item
                    ? false
                    : pathname === item.href || (item.href !== '/mypage' && pathname.startsWith(item.href));
                const baseClass =
                  'flex items-center gap-3 w-full px-5 py-3 text-left text-sm font-medium transition-colors';
                const activeClass = isActive
                  ? 'bg-teal-50 text-teal-800 border-l-2 border-teal-500'
                  : 'text-slate-600 hover:bg-slate-50/80 hover:text-slate-900';
                const content = (
                  <>
                    <span className={`text-xs opacity-70 ${isActive ? 'text-teal-600' : ''}`}>{item.icon}</span>
                    {item.label}
                  </>
                );
                if ('external' in item && item.external) {
                  return (
                    <li key={item.href}>
                      <a
                        href={item.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`${baseClass} ${activeClass}`}
                      >
                        {content}
                      </a>
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
              <Link
                href="/"
                className="flex items-center gap-2 text-xs text-slate-500 hover:text-slate-700 transition-colors"
              >
                ← トップへ戻る
              </Link>
            </div>
          </nav>
        </aside>

        {/* メインコンテンツ */}
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}
