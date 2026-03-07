'use client';

import { useEffect } from 'react';
import { isLikelyWebView, isLineWebView, getOpenInBrowserUrl } from '@/lib/webview-signin';

type Props = {
  path?: string;
  children: React.ReactNode;
};

/**
 * WebView（LINE等）では Google OAuth が 403 になるため案内を表示。
 * フォームは常に表示し、WebView 時は上部にバナーのみ追加。
 */
export function WebViewOpenInBrowser({ path = '/login', children }: Props) {
  if (typeof window === 'undefined') return <>{children}</>;
  if (!isLikelyWebView()) return <>{children}</>;

  const needsRedirect = isLineWebView() && !window.location.search.includes('openExternalBrowser=1');
  useEffect(() => {
    if (needsRedirect) {
      window.location.replace(getOpenInBrowserUrl(path));
    }
  }, [needsRedirect, path]);

  if (needsRedirect) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50"><p className="text-slate-500">読み込み中...</p></div>;
  }

  const url = getOpenInBrowserUrl(path);

  return (
    <div className="min-h-screen flex flex-col">
      <div className="bg-amber-50 border-b border-amber-200 px-4 py-3 text-center text-sm text-amber-800">
        Googleでログインするには{' '}
        <a href={url} target="_blank" rel="noopener noreferrer" className="font-medium text-blue-600 underline">
          ブラウザで開く
        </a>
        が必要です。
      </div>
      {children}
    </div>
  );
}
