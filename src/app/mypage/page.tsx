'use client';

import Link from 'next/link';
import { useProfile } from '@/contexts/ProfileContext';
import { ProfileSection } from '@/components/ProfileSection';
import { MenuLogSection } from '@/components/MenuLogSection';
import { SwimLabIcon, GeneProfileIcon, CommunityIcon, AccountIcon } from '@/components/icons/MypageNavIcons';

const COMMUNITY_URL = process.env.NEXT_PUBLIC_COMMUNITY_URL || '';

const menuItems: Array<{
  href: string;
  label: string;
  description: string;
  sub?: string;
  Icon: React.ComponentType;
  gradient: string;
  glowColor: string;
  external?: boolean;
  disabled?: boolean;
}> = [
  {
    href: '/mypage/menu',
    label: 'RT swim lab',
    description: '練習メニューをAIで自動生成',
    sub: 'クイック生成 / カスタム生成',
    Icon: SwimLabIcon,
    gradient: 'from-cyan-500 to-teal-500',
    glowColor: 'shadow-cyan-500/25',
  },
  {
    href: '/mypage/genetic',
    label: 'RT GENE PROFILE',
    description: '遺伝子検査結果を確認',
    sub: 'PDFアップロード・閲覧',
    Icon: GeneProfileIcon,
    gradient: 'from-violet-500 to-purple-600',
    glowColor: 'shadow-violet-500/25',
  },
  {
    href: COMMUNITY_URL || '#',
    label: 'RTコミュニティ',
    description: 'RT公式コミュニティへ',
    sub: 'コーチ・アスリートとつながる',
    Icon: CommunityIcon,
    gradient: 'from-orange-500 to-amber-500',
    glowColor: 'shadow-orange-500/25',
    external: true,
    disabled: !COMMUNITY_URL,
  },
  {
    href: '/mypage/settings',
    label: 'アカウント情報',
    description: 'プロフィール・プラン設定',
    sub: '表示名 / パスワード / 連携',
    Icon: AccountIcon,
    gradient: 'from-sky-500 to-cyan-500',
    glowColor: 'shadow-sky-500/25',
  },
];

export default function MyPageDashboard() {
  const { profile } = useProfile();

  return (
    <div className="space-y-8">

      {/* ─── ヒーローバナー ─── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-[#0d1a2e] to-slate-900 p-7 sm:p-10 text-white shadow-2xl shadow-slate-900/40">
        {/* Ambient glows */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-20 -right-20 w-96 h-96 rounded-full bg-cyan-500/10 blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-72 h-72 rounded-full bg-teal-500/10 blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 rounded-full bg-violet-500/5 blur-2xl" />
          {/* Grid lines */}
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage:
                'linear-gradient(rgba(6,182,212,1) 1px, transparent 1px), linear-gradient(90deg, rgba(6,182,212,1) 1px, transparent 1px)',
              backgroundSize: '40px 40px',
            }}
          />
        </div>

        <div className="relative">
          {/* Eyebrow */}
          <div className="flex items-center gap-2 mb-4">
            <span className="w-8 h-[2px] rounded-full bg-gradient-to-r from-cyan-400 to-teal-400" />
            <p className="text-cyan-400 text-[11px] font-bold uppercase tracking-[0.25em]">
              RT swim lab · Dashboard
            </p>
          </div>

          {/* Greeting */}
          <h1 className="text-2xl sm:text-3xl font-black text-white leading-tight">
            {profile?.display_name
              ? <>{profile.display_name}<span className="text-slate-400">様、</span></>
              : null}
            <span className="bg-gradient-to-r from-cyan-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
              {profile?.display_name ? 'おかえりなさい' : 'マイページへようこそ'}
            </span>
          </h1>

          {/* Goal */}
          {profile?.goal ? (
            <div className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm">
              <span className="text-cyan-400 text-sm">🎯</span>
              <p className="text-slate-300 text-sm font-medium">{profile.goal}</p>
            </div>
          ) : (
            <p className="mt-3 text-slate-500 text-sm">
              目標を設定してトレーニングを最適化しましょう
            </p>
          )}

          {/* Stats */}
          <div className="mt-7 grid grid-cols-3 gap-3">
            {[
              { label: '累計生成', value: profile?.total_usage_count ?? 0, color: 'from-cyan-400 to-teal-400' },
              { label: 'クイック', value: profile?.quick_count ?? 0, color: 'from-teal-400 to-emerald-400' },
              { label: 'カスタム', value: profile?.custom_count ?? 0, color: 'from-violet-400 to-purple-400' },
            ].map((s) => (
              <div
                key={s.label}
                className="rounded-2xl bg-white/5 border border-white/10 px-3 py-4 text-center backdrop-blur-sm"
              >
                <div
                  className={`text-2xl sm:text-3xl font-black tabular-nums bg-gradient-to-br ${s.color} bg-clip-text text-transparent`}
                >
                  {s.value}
                </div>
                <div className="text-[10px] text-slate-400 mt-1 font-semibold uppercase tracking-wider">
                  {s.label}
                </div>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              href="/mypage/menu"
              className="inline-flex items-center gap-2.5 px-6 py-3 bg-gradient-to-r from-cyan-500 to-teal-500 text-white font-bold rounded-2xl hover:from-cyan-400 hover:to-teal-400 transition-all shadow-xl shadow-cyan-500/30 hover:shadow-cyan-500/50 hover:-translate-y-0.5 text-sm"
            >
              <span>🏊</span>
              メニューを生成する
              <span className="opacity-70">→</span>
            </Link>
            <Link
              href="/mypage/settings"
              className="inline-flex items-center gap-2 px-5 py-3 text-slate-300 font-medium rounded-2xl border border-white/10 hover:border-white/20 hover:text-white hover:bg-white/5 transition-all text-sm"
            >
              設定
            </Link>
          </div>
        </div>
      </div>

      {/* ─── 目標設定 ─── */}
      <ProfileSection />

      {/* ─── カテゴリー ─── */}
      <section className="dashboard-card overflow-hidden">
        <div className="px-6 py-5 border-b border-cyan-100/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-6 rounded-full bg-gradient-to-b from-cyan-400 to-teal-500" />
            <h2 className="text-sm font-bold text-slate-800 tracking-wide">サービス</h2>
          </div>
          <span className="text-xs text-slate-400 font-medium">{menuItems.length} 項目</span>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {menuItems.map((item) => {
              const IconComponent = item.Icon;

              if ('disabled' in item && item.disabled) {
                return (
                  <div
                    key={item.label}
                    className="group relative p-5 rounded-2xl border-2 border-slate-100 bg-slate-50/70 opacity-60 cursor-default overflow-hidden"
                  >
                    <span className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-slate-200 text-slate-400 mb-3 [&_svg]:w-6 [&_svg]:h-6">
                      <IconComponent />
                    </span>
                    <p className="font-bold text-slate-500">{item.label}</p>
                    <p className="text-xs text-slate-400 mt-0.5">（設定からURLを有効にすると利用可能）</p>
                  </div>
                );
              }

              const cardContent = (
                <>
                  {/* Icon with gradient */}
                  <div className="flex items-start justify-between mb-4">
                    <span
                      className={`inline-flex items-center justify-center w-13 h-13 w-12 h-12 rounded-2xl bg-gradient-to-br ${item.gradient} text-white shadow-lg ${item.glowColor} shadow-lg [&_svg]:w-6 [&_svg]:h-6 group-hover:scale-105 transition-transform`}
                    >
                      <IconComponent />
                    </span>
                    <span className="text-slate-300 group-hover:text-cyan-400 transition-colors text-lg leading-none mt-1">→</span>
                  </div>
                  {/* Text */}
                  <p className="font-bold text-slate-800 text-base group-hover:text-cyan-700 transition-colors">
                    {item.label}
                  </p>
                  <p className="text-sm text-slate-500 mt-0.5 group-hover:text-slate-600 transition-colors leading-snug">
                    {item.description}
                  </p>
                  {item.sub && (
                    <p className="text-[11px] text-slate-400 mt-1.5 font-medium">{item.sub}</p>
                  )}
                </>
              );

              const cardCls =
                'group relative p-5 rounded-2xl border-2 border-slate-100 bg-white hover:border-cyan-200 hover:shadow-xl hover:shadow-cyan-500/10 hover:-translate-y-0.5 transition-all duration-200 overflow-hidden';

              if ('external' in item && item.external) {
                return (
                  <a
                    key={item.label}
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cardCls}
                  >
                    {cardContent}
                  </a>
                );
              }
              return (
                <Link key={item.label} href={item.href} className={cardCls}>
                  {cardContent}
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── メニューログ ─── */}
      <MenuLogSection />
    </div>
  );
}
