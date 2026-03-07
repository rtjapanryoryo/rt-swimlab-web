'use client';

import Link from 'next/link';
import { ExternalLinks } from './ExternalLinks';

const HAS_EXTERNAL_LINKS = !!(process.env.NEXT_PUBLIC_LINE_URL || process.env.NEXT_PUBLIC_COMMUNITY_URL);

export function SiteFooter() {
  return (
    <footer className="no-print mt-16 pb-10 pt-8 border-t border-slate-200/80 bg-slate-50/30">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-5 text-sm">
        <p className="text-xs text-slate-400 tracking-wide order-2 sm:order-1">© 2026 RT-japan.</p>
        <div className="flex flex-wrap items-center justify-center sm:justify-end gap-x-5 gap-y-2 order-1 sm:order-2">
          <Link href="/" className="text-slate-600 hover:text-teal-700 font-medium transition-colors">
            練習メニュー
          </Link>
          <Link href="/mypage" className="text-slate-600 hover:text-teal-700 font-medium transition-colors">
            マイページ
          </Link>
          {HAS_EXTERNAL_LINKS && (
            <>
              <span className="text-slate-300 hidden sm:inline" aria-hidden>|</span>
              <ExternalLinks variant="compact" />
            </>
          )}
        </div>
      </div>
    </footer>
  );
}
