'use client';

import MenuGeneratorPanel from '@/components/MenuGeneratorPanel';

/**
 * RT swim lab - 練習メニュー専用ページ
 * このページのみ表示される形でメニュー生成に集中できる
 */
export default function RTSwimLabMenuPage() {
  return (
    <div className="min-h-[calc(100vh-120px)]">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
          RT swim lab
        </h1>
        <p className="text-slate-500 mt-1 text-sm">
          練習メニューを生成
        </p>
      </header>
      <MenuGeneratorPanel embedded />
    </div>
  );
}
