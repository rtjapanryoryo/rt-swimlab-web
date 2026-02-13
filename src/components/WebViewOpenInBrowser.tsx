'use client';

import { useState, useEffect } from 'react';
import { isLikelyWebView, isLineWebView, getOpenInBrowserUrl } from '@/lib/webview-signin';

type Props = {
  path?: string;
  children: React.ReactNode;
};

/** WebView のときだけ案内を表示、それ以外は children */
export function WebViewOpenInBrowser({ path = '/login', children }: Props) {
  const [copied, setCopied] = useState(false);

  if (typeof window === 'undefined') return <>{children}</>;
  if (!isLikelyWebView()) return <>{children}</>;

  const needsRedirect = isLineWebView() && !window.location.search.includes('openExternalBrowser=1');
  useEffect(() => {
    if (needsRedirect) {
      window.location.replace(getOpenInBrowserUrl(path));
    }
  }, [needsRedirect, path]);

  if (needsRedirect) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><p className="text-slate-500">読み込み中...</p></div>;

  const url = getOpenInBrowserUrl(path);
  const rawUrl = `${window.location.origin}${path}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(rawUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6">
      <div className="max-w-sm w-full space-y-6 text-center">
        <p className="text-slate-700 font-medium">
          Googleログインにはブラウザが必要です
        </p>
        <div className="space-y-3">
          <p className="text-sm text-slate-600">
            右下の <span className="font-bold">⋮</span> をタップ →「ブラウザで開く」を選択
          </p>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full px-6 py-4 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700"
          >
            ブラウザで開く
          </a>
          <button
            type="button"
            onClick={handleCopy}
            className="block w-full px-4 py-2 text-sm text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50"
          >
            {copied ? 'コピーしました' : 'URLをコピー'}
          </button>
        </div>
      </div>
    </div>
  );
}
