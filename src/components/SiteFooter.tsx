'use client';

import Link from 'next/link';
import { ExternalLinks } from './ExternalLinks';

export function SiteFooter() {
  return (
    <footer className="no-print mt-16 pb-8 pt-6 border-t border-slate-200/80">
      <div className="max-w-4xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-500">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-slate-600 hover:text-slate-900 font-medium transition-colors">
            練習メニュー
          </Link>
          <Link href="/mypage" className="text-slate-600 hover:text-slate-900 font-medium transition-colors">
            マイページ
          </Link>
        </div>
        <ExternalLinks variant="compact" />
      </div>
    </footer>
  );
}
