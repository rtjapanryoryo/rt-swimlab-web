'use client';

/**
 * メインコンテンツエリア。
 */
export function MainContent({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex-1 w-full min-w-0 pt-2 pr-2">
      {children}
    </div>
  );
}
