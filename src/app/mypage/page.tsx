'use client';

import Link from 'next/link';
import { ProfileSection } from '@/components/ProfileSection';
import { MenuLogSection } from '@/components/MenuLogSection';

const COMMUNITY_URL = process.env.NEXT_PUBLIC_COMMUNITY_URL || '';

const menuItems: Array<{
  href: string;
  label: string;
  description: string;
  external?: boolean;
  disabled?: boolean;
}> = [
  { href: '/mypage/menu', label: 'RT swim lab', description: '練習メニューをクイック作成・カスタム作成で生成' },
  { href: '/mypage/genetic', label: 'RT GENE PROFILE', description: '遺伝子検査結果PDFを確認・アップロード' },
  { href: COMMUNITY_URL || '#', label: 'RTコミュニティ', description: 'RT公式コミュニティに参加', external: true, disabled: !COMMUNITY_URL },
  { href: '/mypage/settings', label: 'アカウント情報', description: '表示名・パスワード・有料プラン・アカウント連携を変更' },
];

export default function MyPageDashboard() {
  return (
    <div className="space-y-8">
      {/* プロフィール（表示名・あなたの目標） */}
      <ProfileSection />

      {/* カテゴリー一覧（モバイルでカルーセルに気づかない人向け。PC2列・モバイル1列） */}
      <section className="dashboard-card overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100/80 flex items-center gap-2">
          <span className="w-1 h-5 rounded-full bg-blue-500/70" />
          <h2 className="text-sm font-semibold text-slate-800">カテゴリー</h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {menuItems.map((item) => {
              const cardClass = 'block p-4 rounded-xl border border-slate-200/80 bg-white hover:border-blue-200 hover:bg-blue-50/50 transition-colors';
              const disabledClass = 'block p-4 rounded-xl border border-slate-200/60 bg-slate-50/50 opacity-75 cursor-default';
              if ('disabled' in item && item.disabled) {
                return (
                  <div key={item.label} className={disabledClass}>
                    <p className="font-medium text-slate-600">{item.label}</p>
                    <p className="text-xs text-slate-400 mt-1">{item.description}（アカウント情報でURLを有効にすると利用可能）</p>
                  </div>
                );
              }
              if ('external' in item && item.external) {
                return (
                  <a
                    key={item.label}
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cardClass}
                  >
                    <p className="font-medium text-slate-800">{item.label}</p>
                    <p className="text-xs text-slate-500 mt-1">{item.description}</p>
                  </a>
                );
              }
              return (
                <Link key={item.label} href={item.href} className={cardClass}>
                  <p className="font-medium text-slate-800">{item.label}</p>
                  <p className="text-xs text-slate-500 mt-1">{item.description}</p>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* メニューログ（ダッシュボード内） */}
      <MenuLogSection />
    </div>
  );
}
