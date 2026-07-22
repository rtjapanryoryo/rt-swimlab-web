import type { Metadata } from 'next';
import Link from 'next/link';
import MenuTermsTabs from './MenuTermsTabs';

export const metadata: Metadata = {
  title: '水泳メニュー用語集 | RT swim lab',
  description: 'RT swim labの練習メニューで使用する水泳用語と強度表記の説明です。',
};

export default function MenuTermsPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
          <Link href="/mypage/menu" className="text-sm font-semibold text-cyan-700 hover:text-cyan-900">
            ← メニュー生成へ戻る
          </Link>
          <span className="text-sm text-slate-500">RT swim lab</span>
        </div>

        <header className="border-b border-slate-300 pb-7">
          <p className="mb-2 text-sm font-bold text-cyan-700">SWIMMING MENU GUIDE</p>
          <h1 className="text-3xl font-bold text-slate-950 sm:text-4xl">水泳メニュー用語集</h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
            練習メニューに表示される略語や強度の意味を、実際に泳ぐときの考え方とあわせて確認できます。
          </p>
        </header>

        <MenuTermsTabs />

        <div className="pt-8">
          <Link href="/mypage/menu" className="inline-flex items-center justify-center bg-cyan-600 px-5 py-3 text-sm font-bold text-white hover:bg-cyan-700">
            メニュー生成へ戻る
          </Link>
        </div>
      </div>
    </main>
  );
}
