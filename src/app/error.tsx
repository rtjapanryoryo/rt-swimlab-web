'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-[40vh] flex flex-col items-center justify-center p-8">
      <h2 className="text-lg font-semibold text-gray-900 mb-2">問題が発生しました</h2>
      <p className="text-sm text-gray-600 mb-4 text-center max-w-md">
        申し訳ありません。エラーが発生したため、この画面を表示しています。
      </p>
      <button
        type="button"
        onClick={() => reset()}
        className="px-4 py-2 rounded-md bg-gray-900 text-white text-sm font-medium hover:bg-gray-800"
      >
        もう一度試す
      </button>
    </div>
  );
}
