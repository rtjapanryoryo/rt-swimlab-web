'use client';

import { useEffect, useRef, useState } from 'react';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';

// Worker: 同一バージョンの CDN を使用（pdfjs-dist 4.x）
if (typeof window !== 'undefined') {
  GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs`;
}

type MobilePdfViewerProps = {
  /** /api/gene-profiles/[id]/pdf のような同一オリジン URL */
  pdfUrl: string;
  className?: string;
  onError?: (msg: string) => void;
};

/**
 * モバイル向け PDF ビューア（PDF.js で各ページを canvas に描画し、縦スクロール可能に）
 * iframe 内のネイティブビューアはモバイルでタッチスクロールが不安定なため、この方式で安定させる
 * 認証必須のAPI対応: fetch で credentials を付与して取得し、ArrayBuffer を渡す
 */
export function MobilePdfViewer({ pdfUrl, className = '', onError }: MobilePdfViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [pageCount, setPageCount] = useState(0);
  const [scale, setScale] = useState(1.5);

  useEffect(() => {
    let cancelled = false;
    const container = containerRef.current;
    if (!container || !pdfUrl) return;

    void Promise.resolve().then(() => {
      if (!cancelled) setLoading(true);
    });
    container.innerHTML = '';

    // モバイルで cookie 認証を確実に送るため、fetch で credentials 付き取得
    fetch(pdfUrl, { credentials: 'include' })
      .then((res) => {
        if (!res.ok) {
          if (res.status === 401) throw new Error('ログインが必要です');
          if (res.status >= 500) throw new Error('PDFの取得に失敗しました。しばらく経ってからお試しください。');
          throw new Error('PDFの取得に失敗しました。');
        }
        return res.arrayBuffer();
      })
      .then((arrayBuffer) => {
        if (cancelled) throw new Error('Abort');
        return getDocument({ data: arrayBuffer }).promise;
      })
      .then(async (pdf) => {
        if (cancelled) return;
        const numPages = pdf.numPages;
        setPageCount(numPages);

        // ビューポート幅に合わせて scale を調整
        const firstPage = await pdf.getPage(1);
        const viewport = firstPage.getViewport({ scale: 1 });
        const containerWidth = container.clientWidth || window.innerWidth - 32;
        const newScale = Math.min(2, (containerWidth - 24) / viewport.width);
        setScale(newScale);

        for (let i = 1; i <= numPages; i++) {
          if (cancelled) break;
          const page = await pdf.getPage(i);
          const vp = page.getViewport({ scale: newScale });
          const canvas = document.createElement('canvas');
          canvas.width = vp.width;
          canvas.height = vp.height;
          canvas.style.width = '100%';
          canvas.style.height = 'auto';
          canvas.style.display = 'block';
          canvas.style.marginBottom = '8px';
          canvas.style.borderRadius = '4px';
          canvas.style.boxShadow = '0 1px 3px rgba(0,0,0,0.08)';
          const ctx = canvas.getContext('2d');
          if (ctx) {
            await page.render({ canvasContext: ctx, viewport: vp }).promise;
          }
          container.appendChild(canvas);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          const msg = e instanceof Error ? e.message : 'PDFの読み込みに失敗しました。ログイン状態を確認してください。';
          onError?.(msg);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [pdfUrl, onError]);

  return (
    <div className={`relative ${className}`}>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-50/80 text-slate-500 text-sm z-10 rounded-lg">
          読み込み中...
        </div>
      )}
      <div
        ref={containerRef}
        className={`overflow-y-auto overflow-x-hidden overscroll-contain h-full min-h-[200px] ${className}`}
        style={{
          WebkitOverflowScrolling: 'touch',
          touchAction: 'pan-y',
        }}
      />
    </div>
  );
}
