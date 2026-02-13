'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { GoogleSignInButton } from '@/components/GoogleSignInButton';
import { WebViewOpenInBrowser } from '@/components/WebViewOpenInBrowser';

function LoginContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');
  const [configOk, setConfigOk] = useState<boolean | null>(null);

  useEffect(() => {
    fetch('/api/oauth-config')
      .then(async (r) => {
        const text = await r.text();
        try {
          const d = JSON.parse(text) as { configured?: boolean };
          return d.configured === true;
        } catch {
          return false;
        }
      })
      .then(setConfigOk)
      .catch(() => setConfigOk(false));
  }, []);

  const showSetupHint = configOk === false;
  const showOAuthError = error && configOk !== false;

  const callbackUri = typeof window !== 'undefined' ? `${window.location.origin}/api/auth/callback/google` : '';

  return (
    <WebViewOpenInBrowser path="/login">
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full text-center">
        <h1 className="text-xl font-bold text-gray-900 mb-2">RT swim lab</h1>
        <p className="text-sm text-gray-600 mb-2">
          立石諒・高城直基監修の指導哲学に基づく練習メニューを、あなた用に作成します。
        </p>
        <p className="text-xs text-gray-500 mb-6">
          まずは下のボタンでGoogleアカウントにログインしてください。入力内容はあなたのアカウントごとに保存されます。
        </p>
        {showSetupHint && (
          <div className="text-left text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-md p-4 mb-4">
            <p className="font-semibold mb-2">OAuth が未設定です</p>
            <p className="mb-2">
              .env.local に以下を設定してください：
            </p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>GOOGLE_CLIENT_ID（Google Cloud Console で作成）</li>
              <li>GOOGLE_CLIENT_SECRET</li>
              <li>承認済みリダイレクトURI: <code className="bg-amber-100 px-1 rounded">{callbackUri || 'http://localhost:3000/api/auth/callback/google'}</code></li>
            </ul>
            <p className="mt-2 text-xs">設定後、開発サーバーを再起動してください。</p>
          </div>
        )}
        {showOAuthError && (
          <div className="text-left text-sm text-red-800 bg-red-50 border border-red-200 rounded-md p-4 mb-4">
            <p className="font-semibold mb-2">ログインに失敗しました（invalid_client）</p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>Google Cloud Console のクライアントIDが正しいか</li>
              <li>「承認済みのリダイレクトURI」に <code className="bg-red-100 px-1 rounded break-all">{callbackUri || 'https://あなたのドメイン/api/auth/callback/google'}</code> が登録されているか</li>
              <li>アプリケーションの種類が「ウェブアプリケーション」か</li>
            </ul>
          </div>
        )}
        <GoogleSignInButton
          callbackUrl="/"
          disabled={showSetupHint}
          variant="primary"
          className="w-full"
        >
          {showSetupHint ? 'OAuth設定後に有効になります' : 'Googleでログイン'}
        </GoogleSignInButton>
      </div>
    </div>
    </WebViewOpenInBrowser>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">読み込み中...</div>}>
      <LoginContent />
    </Suspense>
  );
}
