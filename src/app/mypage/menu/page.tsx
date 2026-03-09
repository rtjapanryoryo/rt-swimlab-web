'use client';

import MenuGeneratorPanel from '@/components/MenuGeneratorPanel';

/**
 * RT swim lab - 練習メニュー専用ページ
 * このページのみ表示される形でメニュー生成に集中できる
 */
export default function RTSwimLabMenuPage() {
  return (
    <div className="min-h-[calc(100vh-120px)]">
      <header className="mb-8">
        <div className="flex items-center gap-3">
          <span className="text-4xl">🏊</span>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              RT swim lab
            </h1>
            <p className="text-cyan-600 mt-0.5 text-sm font-medium">
              練習メニューを生成
            </p>
          </div>
        </div>
      </header>
      <MenuGeneratorPanel embedded />
    </div>
  );
}
