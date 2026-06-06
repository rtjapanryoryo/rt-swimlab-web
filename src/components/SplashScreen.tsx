'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

const FADE_IN_MS = 600;
const FADE_OUT_MS = 800;
const AUTH_PATHS = ['/login', '/signup', '/forgot-password', '/update-password'];

function SplashContent({ durationMs }: { durationMs: number }) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const holdMs = Math.max(durationMs - FADE_IN_MS - FADE_OUT_MS, 0);

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-gradient-to-b from-[#f8fafc] via-white to-[#e0f2fe]"
      style={{
        willChange: 'opacity, transform',
        animation: `splashFadeIn ${FADE_IN_MS}ms cubic-bezier(.2,.8,.2,1) 0ms forwards, splashFadeOut ${FADE_OUT_MS}ms cubic-bezier(.2,.8,.2,1) ${FADE_IN_MS + holdMs}ms forwards`,
      }}
    >
      {!imageError && (
        <img
          src="/RT-japan_Logo.svg"
          alt="RT-japan"
          width={420}
          height={420}
          className="h-auto w-[260px]"
          style={{
            willChange: 'opacity, transform',
            opacity: imageLoaded ? 1 : 0,
            transition: 'opacity 200ms ease',
            animation: imageLoaded
              ? `splashLogoIn ${FADE_IN_MS}ms cubic-bezier(.2,.8,.2,1) 0ms forwards, splashLogoOut ${FADE_OUT_MS}ms cubic-bezier(.2,.8,.2,1) ${FADE_IN_MS + holdMs}ms forwards`
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
  const pathname = usePathname();
  const skipSplash = AUTH_PATHS.includes(pathname);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (skipSplash) return;

    let cancelled = false;
    try {
      const alreadyShown = window.sessionStorage.getItem(storageKey) === '1';
      if (alreadyShown) {
        return;
      }
    } catch {
      /* ignore */
    }

    setShow(true);

    try {
      window.sessionStorage.setItem(storageKey, '1');
    } catch {
      /* ignore */
    }

    const t = window.setTimeout(() => {
      if (!cancelled) setShow(false);
    }, durationMs);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [storageKey, durationMs, skipSplash]);

  return (
    <>
      <SplashScreen visible={show} durationMs={durationMs} />
      {children}
    </>
  );
}
