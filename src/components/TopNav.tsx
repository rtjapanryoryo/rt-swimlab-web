'use client';

import { useAuth } from '@/components/AuthProvider';
import { UserNav } from '@/components/UserNav';

/**
 * ログイン時のみ右上にナビを表示。未ログイン時は非表示。
 */
export function TopNav() {
  const { user, loading } = useAuth();

  if (loading || !user) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 sm:left-auto sm:right-0 z-50 p-3 sm:p-4 md:p-5 no-print">
      <nav className="flex items-center justify-start sm:justify-end gap-2 sm:gap-4 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl bg-white/95 backdrop-blur-md border border-stone-200/60 shadow-[0_2px_16px_rgba(28,25,23,0.04),0_0_0_1px_rgba(120,113,108,0.04)]">
        <UserNav />
      </nav>
    </div>
  );
}
