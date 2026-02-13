'use client';

import { signIn } from 'next-auth/react';
import { isLikelyWebView, getOpenInBrowserUrl } from '@/lib/webview-signin';

type Props = {
  callbackUrl?: string;
  disabled?: boolean;
  className?: string;
  children?: React.ReactNode;
  variant?: 'primary' | 'secondary';
};

export function GoogleSignInButton({
  callbackUrl,
  disabled = false,
  className = '',
  children = 'Googleでログイン',
  variant = 'secondary',
}: Props) {
  const baseClass =
    variant === 'primary'
      ? 'px-4 py-3 bg-white border border-gray-300 rounded-md hover:bg-gray-50 text-gray-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed'
      : 'px-4 py-2 bg-white border border-gray-300 rounded-md font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed';

  if (typeof window !== 'undefined' && isLikelyWebView() && !disabled) {
    const url = getOpenInBrowserUrl('/login');
    return (
      <a href={url} className={`block text-center ${baseClass} ${className}`.trim()}>
        {children}
      </a>
    );
  }

  return (
    <button
      type="button"
      onClick={() => signIn('google', { callbackUrl: callbackUrl ?? (typeof window !== 'undefined' ? window.location.href : '/') })}
      disabled={disabled}
      className={`${baseClass} ${className}`.trim()}
    >
      {children}
    </button>
  );
}
