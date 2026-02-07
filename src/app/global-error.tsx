'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="ja">
      <body className="antialiased min-h-screen flex flex-col items-center justify-center p-8 bg-gray-50">
        <h1 className="text-xl font-bold text-gray-900 mb-2">RT swim lab</h1>
        <h2 className="text-lg font-semibold text-gray-800 mb-2">重大なエラーが発生しました</h2>
        <p className="text-sm text-gray-600 mb-4 text-center max-w-md">
          アプリの読み込みに失敗しました。ページを再読み込みするか、しばらくしてからお試しください。
        </p>
        <button
          type="button"
          onClick={() => reset()}
          className="px-4 py-2 rounded-md bg-gray-900 text-white text-sm font-medium hover:bg-gray-800"
        >
          再読み込み
        </button>
      </body>
    </html>
  );
}
