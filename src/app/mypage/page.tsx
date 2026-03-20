'use client';

import Link from 'next/link';
import { useProfile } from '@/contexts/ProfileContext';
import { ProfileSection } from '@/components/ProfileSection';
import { MenuLogSection } from '@/components/MenuLogSection';
import { TrainingStatsSection } from '@/components/TrainingStatsSection';
import { SwimLabIcon, GeneProfileIcon, CommunityIcon, AccountIcon } from '@/components/icons/MypageNavIcons';

const COMMUNITY_URL = process.env.NEXT_PUBLIC_COMMUNITY_URL || '';

const NAV_ITEMS = [
  {
    href: '/mypage/menu',
    label: 'RT swim lab',
    sub: 'AIメニュー生成',
    Icon: SwimLabIcon,
    gradient: 'from-cyan-500 to-teal-500',
    glow: 'shadow-cyan-500/20',
  },
  {
    href: '/mypage/genetic',
    label: 'GENE PROFILE',
    sub: '遺伝子検査結果',
    Icon: GeneProfileIcon,
    gradient: 'from-violet-500 to-purple-600',
    glow: 'shadow-violet-500/20',
  },
  {
    href: COMMUNITY_URL || '#',
    label: 'コミュニティ',
    sub: 'RT公式',
    Icon: CommunityIcon,
    gradient: 'from-orange-500 to-amber-500',
    glow: 'shadow-orange-500/20',
    external: true,
    disabled: !COMMUNITY_URL,
  },
  {
    href: '/mypage/settings',
    label: 'アカウント',
    sub: 'プロフィール設定',
    Icon: AccountIcon,
    gradient: 'from-sky-500 to-cyan-500',
    glow: 'shadow-sky-500/20',
  },
];

export default function MyPageDashboard() {
  const { profile } = useProfile();

  const name = profile?.display_name?.trim() || null;
  const goal = profile?.goal?.trim() || null;
  const totalCount = profile?.total_usage_count ?? 0;
  const quickCount = profile?.quick_count ?? 0;
  const customCount = profile?.custom_count ?? 0;

  return (
    <div className="space-y-6">

      {/* ════════ HERO ════════ */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-[#0d1a2e] to-slate-900 text-white shadow-2xl shadow-slate-900/40">
        {/* Ambient glows */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-cyan-500/10 blur-3xl" />
          <div className="absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-teal-500/10 blur-3xl" />
          <div
            className="absolute inset-0 opacity-[0.025]"
            style={{
              backgroundImage:
                'linear-gradient(rgba(6,182,212,1) 1px, transparent 1px), linear-gradient(90deg, rgba(6,182,212,1) 1px, transparent 1px)',
              backgroundSize: '40px 40px',
            }}
          />
        </div>

        <div className="relative px-7 pt-8 pb-7 sm:px-10 sm:pt-10">
          {/* Eyebrow */}
          <div className="flex items-center gap-2 mb-3">
            <span className="w-7 h-[2px] rounded-full bg-gradient-to-r from-cyan-400 to-teal-400" />
            <p className="text-cyan-400 text-[10px] font-bold uppercase tracking-[0.3em]">
              RT swim lab · Dashboard
            </p>
          </div>

          {/* Greeting */}
          <h1 className="text-2xl sm:text-3xl font-black leading-tight">
            {name ? (
              <>
                <span className="text-slate-300">{name}様、</span>
                <br className="sm:hidden" />
              </>
            ) : null}
            <span className="bg-gradient-to-r from-cyan-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
              {name ? 'おかえりなさい' : 'マイページへようこそ'}
            </span>
          </h1>

          {/* Goal */}
          {goal && (
            <div className="mt-3 flex items-center gap-2">
              <span className="text-[10px] font-bold text-cyan-500/80 uppercase tracking-wider">目標</span>
              <p className="text-sm text-slate-300 font-medium">{goal}</p>
            </div>
          )}

          {/* Stats row */}
          <div className="mt-6 flex flex-wrap gap-4">
            {[
              { label: '累計生成', value: totalCount, color: 'text-cyan-400' },
              { label: 'クイック', value: quickCount, color: 'text-teal-400' },
              { label: 'カスタム', value: customCount, color: 'text-violet-400' },
            ].map((s) => (
              <div key={s.label} className="flex items-baseline gap-1.5">
                <span className={`text-2xl font-black tabular-nums ${s.color}`}>{s.value}</span>
                <span className="text-xs text-slate-500 font-semibold">{s.label}</span>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/mypage/menu"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-500 to-teal-500 text-white font-bold rounded-2xl hover:from-cyan-400 hover:to-teal-400 transition-all shadow-xl shadow-cyan-500/30 hover:shadow-cyan-500/50 hover:-translate-y-0.5 text-sm"
            >
              <span>🏊</span>
              メニューを生成する
            </Link>
            <Link
              href="/mypage/settings"
              className="inline-flex items-center gap-2 px-5 py-3 text-slate-400 font-medium rounded-2xl border border-white/10 hover:border-white/20 hover:text-white hover:bg-white/5 transition-all text-sm"
            >
              設定
            </Link>
          </div>
        </div>
      </div>

      {/* ════════ メインコンテンツ ════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── 左: アクティビティ ── */}
        <div className="lg:col-span-2">
          <TrainingStatsSection />
        </div>

        {/* ── 右: サービス ── */}
        <div className="flex flex-col gap-3">
          {NAV_ITEMS.map((item) => {
            const IconComponent = item.Icon;
            const disabled = 'disabled' in item && item.disabled;

            const inner = (
              <div className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition-all group ${
                disabled
                  ? 'border-slate-100 bg-slate-50 opacity-50 cursor-default'
                  : 'border-slate-100 bg-white hover:border-cyan-200 hover:shadow-lg hover:shadow-cyan-500/10 hover:-translate-y-0.5'
              }`}>
                <span className={`flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-xl bg-gradient-to-br ${item.gradient} shadow-md ${item.glow} text-white [&_svg]:w-5 [&_svg]:h-5 ${disabled ? '' : 'group-hover:scale-105 transition-transform'}`}>
                  <IconComponent />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-800 group-hover:text-cyan-700 transition-colors">
                    {item.label}
                  </p>
                  <p className="text-[11px] text-slate-400 font-medium">{item.sub}</p>
                </div>
                {!disabled && (
                  <span className="ml-auto text-slate-300 group-hover:text-cyan-400 transition-colors text-sm flex-shrink-0">→</span>
                )}
              </div>
            );

            if (disabled) return <div key={item.label}>{inner}</div>;
            if ('external' in item && item.external) {
              return (
                <a key={item.label} href={item.href} target="_blank" rel="noopener noreferrer">
                  {inner}
                </a>
              );
            }
            return (
              <Link key={item.label} href={item.href}>
                {inner}
              </Link>
            );
          })}
        </div>
      </div>

      {/* ════════ 目標設定 ════════ */}
      <ProfileSection />

      {/* ════════ メニューログ ════════ */}
      <MenuLogSection />
    </div>
  );
}
