'use client';

import { signIn } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

function LoginContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');
  const [configOk, setConfigOk] = useState<boolean | null>(null);

  useEffect(() => {
    fetch('/api/oauth-config')
      .then((r) => r.json())
      .then((d) => setConfigOk(d.configured))
      .catch(() => setConfigOk(false));
  }, []);

  const showSetupHint = configOk === false;
  const showOAuthError = error && configOk !== false;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full text-center">
        <h1 className="text-xl font-bold text-gray-900 mb-2">RT swim lab</h1>
        <p className="text-sm text-gray-600 mb-6">
          ログインして練習メニューを作成
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
              <li>承認済みリダイレクトURI: <code className="bg-amber-100 px-1 rounded">http://localhost:3000/api/auth/callback/google</code></li>
            </ul>
            <p className="mt-2 text-xs">設定後、開発サーバーを再起動してください。</p>
          </div>
        )}
        {showOAuthError && (
          <div className="text-left text-sm text-red-800 bg-red-50 border border-red-200 rounded-md p-4 mb-4">
            <p className="font-semibold mb-2">ログインに失敗しました（invalid_client）</p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>Google Cloud Console のクライアントIDが正しいか</li>
              <li>「承認済みのリダイレクトURI」に <code className="bg-red-100 px-1 rounded">http://localhost:3000/api/auth/callback/google</code> が登録されているか</li>
              <li>アプリケーションの種類が「ウェブアプリケーション」か</li>
            </ul>
          </div>
        )}
        <button
          type="button"
          onClick={() => signIn('google', { callbackUrl: '/' })}
          disabled={showSetupHint}
          className="w-full px-4 py-3 bg-white border border-gray-300 rounded-md hover:bg-gray-50 text-gray-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {showSetupHint ? 'OAuth設定後に有効になります' : 'Googleでログイン'}
        </button>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">読み込み中...</div>}>
      <LoginContent />
    </Suspense>
  );
}
