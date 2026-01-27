'use client';

import { useEffect, useState } from 'react';

export function SplashScreen({
  visible,
  durationMs = 3200, // ←全体の長さ
}: {
  visible: boolean;
  durationMs?: number;
}) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    if (!visible) {
      setImageLoaded(false);
      setImageError(false);
      return;
    }

    // 画像の読み込みを確認
    const img = new Image();
    img.src = '/RT-japan_Logo.svg';
    img.onload = () => {
      setImageLoaded(true);
      setImageError(false);
    };
    img.onerror = () => {
      setImageLoaded(false);
      setImageError(true);
    };
  }, [visible]);

  if (!visible) return null;

  // アニメ時間（軽量：opacity + transform だけ）
  const fadeInMs = 600;
  const fadeOutMs = 800;
  const holdMs = Math.max(durationMs - fadeInMs - fadeOutMs, 0);

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-white"
      style={{
        willChange: 'opacity, transform',
        animation: `
          splashFadeIn ${fadeInMs}ms cubic-bezier(.2,.8,.2,1) 0ms forwards,
          splashFadeOut ${fadeOutMs}ms cubic-bezier(.2,.8,.2,1) ${fadeInMs + holdMs}ms forwards
        `,
      }}
    >
      {/* ロゴ画像 */}
      {!imageError && (
        <img
          src="/RT-japan_Logo.svg"
          alt="RT-japan"
          width={420}
          height={420}
          style={{
            width: 260,
            height: 'auto',
            willChange: 'opacity, transform',
            opacity: imageLoaded ? 1 : 0,
            transition: 'opacity 200ms ease',
            animation: imageLoaded
              ? `
                logoIn ${fadeInMs}ms cubic-bezier(.2,.8,.2,1) 0ms forwards,
                logoOut ${fadeOutMs}ms cubic-bezier(.2,.8,.2,1) ${fadeInMs + holdMs}ms forwards
              `
              : 'none',
          }}
          onLoad={() => setImageLoaded(true)}
          onError={() => {
            setImageError(true);
            setImageLoaded(false);
          }}
        />
      )}

      {/* フォールバック（画像読み込みエラー時） */}
      {imageError && (
        <div className="text-2xl font-bold text-gray-900">RT-japan</div>
      )}

      <style jsx>{`
        @keyframes splashFadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes splashFadeOut {
          to {
            opacity: 0;
          }
        }

        @keyframes logoIn {
          from {
            opacity: 0;
            transform: translateY(8px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0px) scale(1);
          }
        }

        @keyframes logoOut {
          to {
            opacity: 0;
            transform: translateY(-6px) scale(0.99);
          }
        }
      `}</style>
    </div>
  );
}

export function SplashScreenProvider({
  children,
  storageKey = 'rt-splash-shown',
  durationMs = 3200,
}: {
  children: React.ReactNode;
  storageKey?: string;
  durationMs?: number;
}) {
  const [show, setShow] = useState(true);

  useEffect(() => {
    try {
      const already = window.sessionStorage.getItem(storageKey);
      if (already === '1') {
        setShow(false);
        return;
      }
      window.sessionStorage.setItem(storageKey, '1');
    } catch {}

    const t = window.setTimeout(() => setShow(false), durationMs);
    return () => window.clearTimeout(t);
  }, [storageKey, durationMs]);

  return (
    <>
      <SplashScreen visible={show} durationMs={durationMs} />
      <div
        className={`transition-opacity duration-700 ease-out ${
          show ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
      >
        {children}
      </div>
    </>
  );
}
