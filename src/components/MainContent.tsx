'use client';

import { useAuth } from '@/components/AuthProvider';

/**
 * メインコンテンツエリア。ログイン時のみ右余白（TopNav用）を付与。
 * 未ログイン時は余白なしで中央寄せが正しく表示される。
 */
export function MainContent({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  const hasNav = !loading && !!user;
  const paddingClass = hasNav
    ? 'pt-14 sm:pt-2 pr-3 sm:pr-20 md:pr-40'
    : 'pt-2';

  return (
    <div className={`flex-1 w-full min-w-0 ${paddingClass}`}>
      {children}
    </div>
  );
}
