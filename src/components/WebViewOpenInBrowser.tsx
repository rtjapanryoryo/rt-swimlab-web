'use client';

import { isLikelyWebView, getOpenInBrowserUrl } from '@/lib/webview-signin';

type Props = {
  path?: string;
  children: React.ReactNode;
};

/** WebView のときだけ「ブラウザで開く」を表示、それ以外は children */
export function WebViewOpenInBrowser({ path = '/login', children }: Props) {
  if (typeof window === 'undefined') return <>{children}</>;
  if (!isLikelyWebView()) return <>{children}</>;

  const url = getOpenInBrowserUrl(path);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-100 p-6">
      <p className="text-slate-600 mb-6 text-center">アプリ内では開けません</p>
      <a
        href={url}
        className="px-8 py-4 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700"
      >
        ブラウザで開く
      </a>
    </div>
  );
}
