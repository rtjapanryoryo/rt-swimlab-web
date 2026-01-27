'use client';

import { useEffect, useState } from 'react';

const FADE_IN_MS = 600;
const FADE_OUT_MS = 800;

function SplashContent({ durationMs }: { durationMs: number }) {
  const [imageLoaded, setImageLoaded] = useState(() => false);
  const [imageError, setImageError] = useState(() => false);
  const holdMs = Math.max(durationMs - FADE_IN_MS - FADE_OUT_MS, 0);

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-white"
      style={{
        willChange: 'opacity, transform',
        animation: `
          splashFadeIn ${FADE_IN_MS}ms cubic-bezier(.2,.8,.2,1) 0ms forwards,
          splashFadeOut ${FADE_OUT_MS}ms cubic-bezier(.2,.8,.2,1) ${FADE_IN_MS + holdMs}ms forwards
        `,
      }}
    >
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
                logoIn ${FADE_IN_MS}ms cubic-bezier(.2,.8,.2,1) 0ms forwards,
                logoOut ${FADE_OUT_MS}ms cubic-bezier(.2,.8,.2,1) ${FADE_IN_MS + holdMs}ms forwards
              `
              : 'none',
          }}
          onLoad={() => {
            setImageLoaded(true);
            setImageError(false);
          }}
          onError={() => {
            setImageError(true);
            setImageLoaded(false);
          }}
        />
      )}
      {imageError && (
        <div className="text-2xl font-bold text-gray-900">RT-japan</div>
      )}

      <style jsx>{`
        @keyframes splashFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes splashFadeOut {
          to { opacity: 0; }
        }
        @keyframes logoIn {
          from { opacity: 0; transform: translateY(8px) scale(0.98); }
          to { opacity: 1; transform: translateY(0px) scale(1); }
        }
        @keyframes logoOut {
          to { opacity: 0; transform: translateY(-6px) scale(0.99); }
        }
      `}</style>
    </div>
  );
}

export function SplashScreen({
  visible,
  durationMs = 3200,
}: {
  visible: boolean;
  durationMs?: number;
}) {
  if (!visible) return null;
  return <SplashContent durationMs={durationMs} />;
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
  // 初期状態を計算: sessionStorageをチェックして既に表示済みならfalse
  const [show, setShow] = useState(() => {
    if (typeof window === 'undefined') return true;
    try {
      return window.sessionStorage.getItem(storageKey) !== '1';
    } catch {
      return true;
    }
  });

  useEffect(() => {
    // 既に表示済みの場合は何もしない（初期状態でfalseになっている）
    if (!show) return;

    // sessionStorageに記録
    try {
      window.sessionStorage.setItem(storageKey, '1');
    } catch {
      /* ignore */
    }

    // タイマーで非表示にする（コールバック内でのsetStateは問題なし）
    const t = window.setTimeout(() => {
      setShow(false);
    }, durationMs);
    return () => window.clearTimeout(t);
  }, [show, storageKey, durationMs]);

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
