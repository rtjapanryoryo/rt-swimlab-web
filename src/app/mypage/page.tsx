'use client';

import Link from 'next/link';
import { useProfile } from '@/contexts/ProfileContext';
import { MenuLogSection } from '@/components/MenuLogSection';
import { TrainingStatsSection } from '@/components/TrainingStatsSection';
import { calcUsageStatus, IS_DEMO_PERIOD } from '@/lib/plan-limits';

const DRILL_PRACTICE_ENABLED = process.env.NEXT_PUBLIC_DRILL_PRACTICE_ENABLED === 'true';

export default function MyPageDashboard() {
  const { profile } = useProfile();

  const name = profile?.display_name?.trim() || null;
  const goal = profile?.goal?.trim() || null;
  const totalCount = profile?.total_usage_count ?? 0;
  const quickCount = profile?.quick_count ?? 0;
  const customCount = profile?.custom_count ?? 0;

  const usage = calcUsageStatus({
    planId: 'free',
    customCountTotal: customCount,
    customCountThisMonth: profile?.custom_count_this_month ?? 0,
  });

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
            <div className="mt-4 px-4 py-3 rounded-2xl bg-white/5 border border-white/10 flex items-start gap-3">
              <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider mt-0.5 flex-shrink-0">目標</span>
              <p className="text-base font-bold text-white leading-snug">{goal}</p>
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

          {/* カスタム生成 残り回数バッジ */}
          <div className="mt-4">
            {IS_DEMO_PERIOD ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-slate-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                デモ期間中 · カスタム生成 無制限
              </span>
            ) : usage.isLimitReached ? (
              <Link
                href="/mypage/subscription"
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/30 text-xs text-amber-300 hover:bg-amber-500/30 transition-all"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                カスタム生成の上限に達しました · プランを確認
              </Link>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-slate-400">
                <span className="w-1.5 h-1.5 rounded-full bg-violet-400" />
                カスタム生成 あと{usage.remaining}回
                {usage.planId === 'free' ? '（累計）' : '（今月）'}
              </span>
            )}
          </div>

          {/* CTA */}
          <div className="mt-5 flex flex-wrap gap-3">
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

      {/* ════════ デモ期間バナー ════════ */}
      <div className="rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 to-yellow-50 px-5 py-4 flex items-start gap-3">
        <span className="text-xl shrink-0">🎁</span>
        <div>
          <p className="text-sm font-bold text-amber-800">現在、3ヶ月間のデモ期間中です</p>
          <p className="text-xs text-amber-600 mt-0.5 leading-relaxed">
            すべての機能を無料でご利用いただけます。料金の請求はございません。
          </p>
        </div>
      </div>

      {/* ════════ カウンセリングCTA ════════ */}
      <div className="rounded-2xl border border-cyan-200 bg-gradient-to-r from-cyan-50 to-teal-50 px-5 py-4 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-slate-800">コーチに無料相談する</p>
          <p className="text-xs text-slate-500 mt-0.5">練習の方向性・目標の立て方を一緒に確認します（15分・1回限り）</p>
        </div>
        <Link
          href="/mypage/counseling"
          className="shrink-0 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 text-white text-xs font-bold shadow-lg shadow-cyan-500/20 hover:from-cyan-400 hover:to-teal-400 transition-all whitespace-nowrap"
        >
          無料相談
        </Link>
      </div>

      {/* ════════ ドリル練習CTA ════════ */}
      <div className="rounded-2xl border border-violet-200 bg-gradient-to-r from-violet-50 to-indigo-50 px-5 py-4 flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-sm font-bold text-slate-800">ドリル練習</p>
            {!DRILL_PRACTICE_ENABLED && (
              <span className="text-[9px] font-bold bg-cyan-50 text-cyan-500 border border-cyan-200 px-1.5 py-0.5 rounded-full leading-none">
                近日公開
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">YouTube動画付きのドリルで泳法を磨こう。種目ごとに分類されています。</p>
        </div>
        <Link
          href="/mypage/drill-practice"
          className="shrink-0 px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-indigo-500 text-white text-xs font-bold shadow-lg shadow-violet-500/20 hover:from-violet-400 hover:to-indigo-400 transition-all whitespace-nowrap"
        >
          ドリルへ
        </Link>
      </div>

      {/* ════════ アクティビティ ════════ */}
      <TrainingStatsSection />

      {/* ════════ メニューログ ════════ */}
      <MenuLogSection />
    </div>
  );
}
