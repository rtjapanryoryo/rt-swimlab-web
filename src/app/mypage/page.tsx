'use client';

import Link from 'next/link';
import { ProfileSection } from '@/components/ProfileSection';
import { MenuLogSection } from '@/components/MenuLogSection';
import { SwimLabIcon, GeneProfileIcon, CommunityIcon, AccountIcon } from '@/components/icons/MypageNavIcons';

const COMMUNITY_URL = process.env.NEXT_PUBLIC_COMMUNITY_URL || '';

const menuItems: Array<{
  href: string;
  label: string;
  description: string;
  Icon: React.ComponentType;
  gradient: string;
  external?: boolean;
  disabled?: boolean;
}> = [
  { href: '/mypage/menu', label: 'RT swim lab', description: '練習メニューをクイック作成・カスタム作成で生成', Icon: SwimLabIcon, gradient: 'from-cyan-400 to-teal-500' },
  { href: '/mypage/genetic', label: 'RT GENE PROFILE', description: '遺伝子検査結果PDFを確認・アップロード', Icon: GeneProfileIcon, gradient: 'from-violet-400 to-purple-500' },
  { href: COMMUNITY_URL || '#', label: 'RTコミュニティ', description: 'RT公式コミュニティに参加', Icon: CommunityIcon, gradient: 'from-orange-400 to-amber-500', external: true, disabled: !COMMUNITY_URL },
  { href: '/mypage/settings', label: 'アカウント情報', description: '表示名・パスワード・有料プラン・アカウント連携を変更', Icon: AccountIcon, gradient: 'from-sky-400 to-cyan-500' },
];

export default function MyPageDashboard() {
  return (
    <div className="space-y-8">
      {/* プロフィール（表示名・あなたの目標） */}
      <ProfileSection />

      {/* カテゴリー一覧（ジム風・ビジュアルカード） */}
      <section className="dashboard-card overflow-hidden">
        <div className="px-6 py-5 border-b border-cyan-100/80 flex items-center gap-2">
          <span className="w-2 h-6 rounded-full bg-gradient-to-b from-cyan-400 to-teal-500" />
          <h2 className="text-sm font-bold text-slate-800 tracking-wide">カテゴリー</h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {menuItems.map((item) => {
              const cardClass = `group block p-5 rounded-2xl border-2 border-slate-100 bg-white hover:border-cyan-200 hover:shadow-lg hover:shadow-cyan-500/10 hover:-translate-y-0.5 transition-all duration-200`;
              const disabledClass = 'block p-5 rounded-2xl border-2 border-slate-100 bg-slate-50/70 opacity-75 cursor-default';
              const IconComponent = item.Icon;
              const content = (
                <>
                  <span className={`inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br ${item.gradient} text-white shadow-lg mb-4 [&_svg]:w-6 [&_svg]:h-6`}>
                    <IconComponent />
                  </span>
                  <p className="font-bold text-slate-800 text-lg group-hover:text-cyan-700 transition-colors">{item.label}</p>
                  <p className="text-sm text-slate-500 mt-1 group-hover:text-slate-600">{item.description}</p>
                  {!('disabled' in item && item.disabled) && (
                    <span className="inline-block mt-3 text-sm font-medium text-cyan-600 group-hover:text-cyan-700">
                      開く →
                    </span>
                  )}
                </>
              );
              if ('disabled' in item && item.disabled) {
                const DisabledIcon = item.Icon;
                return (
                  <div key={item.label} className={disabledClass}>
                    <span className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-slate-200 text-slate-400 mb-4 [&_svg]:w-6 [&_svg]:h-6">
                      <DisabledIcon />
                    </span>
                    <p className="font-bold text-slate-600">{item.label}</p>
                    <p className="text-xs text-slate-400 mt-1">（アカウント情報でURLを有効にすると利用可能）</p>
                  </div>
                );
              }
              if ('external' in item && item.external) {
                return (
                  <a key={item.label} href={item.href} target="_blank" rel="noopener noreferrer" className={cardClass}>
                    {content}
                  </a>
                );
              }
              return (
                <Link key={item.label} href={item.href} className={cardClass}>
                  {content}
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
