'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { isLikelyWebView, getGoogleSignInUrl } from '@/lib/webview-signin';

type Props = {
  callbackUrl?: string;
  disabled?: boolean;
  className?: string;
  children?: React.ReactNode;
  /** ボタンスタイル: 'primary' | 'secondary' */
  variant?: 'primary' | 'secondary';
};

export function GoogleSignInButton({
  callbackUrl,
  disabled = false,
  className = '',
  children = 'Googleでログイン',
  variant = 'secondary',
}: Props) {
  const [showWebViewModal, setShowWebViewModal] = useState(false);
  const [copied, setCopied] = useState(false);

  const url = typeof window !== 'undefined' ? getGoogleSignInUrl(callbackUrl ?? window.location.href) : '';

  const handleClick = () => {
    if (disabled) return;
    if (isLikelyWebView()) {
      setShowWebViewModal(true);
    } else {
      signIn('google', { callbackUrl: callbackUrl ?? (typeof window !== 'undefined' ? window.location.href : '/') });
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  const baseClass =
    variant === 'primary'
      ? 'px-4 py-3 bg-white border border-gray-300 rounded-md hover:bg-gray-50 text-gray-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed'
      : 'px-4 py-2 bg-white border border-gray-300 rounded-md font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed';

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled}
        className={`${baseClass} ${className}`.trim()}
      >
        {children}
      </button>

      {/* WebView 検出時モーダル */}
      {showWebViewModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 space-y-4">
            <h3 className="font-semibold text-gray-900">ブラウザで開いてください</h3>
            <p className="text-sm text-gray-600">
              アプリ内ブラウザではGoogleログインできません。ChromeやSafariで以下のリンクを開いてください。
            </p>
            <div className="space-y-2">
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full px-4 py-3 bg-blue-600 text-white text-center rounded-lg font-medium hover:bg-blue-700"
              >
                ブラウザで開く
              </a>
              <button
                type="button"
                onClick={handleCopy}
                className="block w-full px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
              >
                {copied ? 'コピーしました' : 'URLをコピー'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowWebViewModal(false);
                  signIn('google', { callbackUrl: callbackUrl ?? (typeof window !== 'undefined' ? window.location.href : '/') });
                }}
                className="block w-full px-4 py-2 text-sm text-gray-500 hover:text-gray-700"
              >
                このページで試す
              </button>
              <button
                type="button"
                onClick={() => setShowWebViewModal(false)}
                className="block w-full px-4 py-2 text-sm text-gray-400 hover:text-gray-600"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
