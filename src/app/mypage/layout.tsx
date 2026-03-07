'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';

const COMMUNITY_URL = process.env.NEXT_PUBLIC_COMMUNITY_URL || '';

const navItems = [
  { href: '/mypage', label: 'ダッシュボード', icon: '📊' },
  { href: '/mypage/menus', label: 'メニューログ', icon: '📋' },
  { href: '/mypage/genetic', label: '遺伝子情報PDF', icon: '🧬' },
  { href: '/mypage/subscription', label: '有料プラン', icon: '💳' },
  ...(COMMUNITY_URL ? [{ href: COMMUNITY_URL, label: 'コミュニティ', icon: '👥', external: true }] : []),
  { href: '/mypage/settings', label: '設定', icon: '⚙️' },
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
      <div className="min-h-screen flex items-center justify-center">
        {loading ? (
          <p className="text-slate-600">読み込み中...</p>
        ) : (
          <div className="text-center space-y-4">
            <p className="text-slate-600">マイページを利用するにはログインしてください。</p>
            <Link
              href="/login?redirect=/mypage"
              className="inline-block px-4 py-2 rounded-xl bg-slate-800 text-white hover:bg-slate-900 font-medium"
            >
              ログイン
            </Link>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-slate-50/95 to-slate-100">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-6 py-6 px-4">
        {/* サイドバー：大きなメニューバー */}
        <nav className="md:w-56 flex-shrink-0">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-2 sticky top-6">
            <h2 className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              マイページ
            </h2>
            <ul className="space-y-0.5">
              {navItems.map((item) => {
                const isActive =
                  'external' in item
                    ? false
                    : pathname === item.href || (item.href !== '/mypage' && pathname.startsWith(item.href));
                const className = `flex items-center gap-3 w-full px-3 py-3 rounded-lg text-left text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-slate-100 text-slate-900'
                    : 'text-slate-700 hover:bg-slate-50'
                }`;
                const content = (
                  <>
                    <span className="text-lg">{item.icon}</span>
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
                        className={className}
                      >
                        {content}
                      </a>
                    </li>
                  );
                }
                return (
                  <li key={item.href}>
                    <Link href={item.href} className={className}>
                      {content}
                    </Link>
                  </li>
                );
              })}
            </ul>
            <Link
              href="/"
              className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100 px-3 py-2 text-sm text-slate-500 hover:text-slate-700"
            >
              ← トップへ戻る
            </Link>
          </div>
        </nav>

        {/* メインコンテンツ */}
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}
