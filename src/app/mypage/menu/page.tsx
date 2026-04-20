'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import MenuGeneratorPanel from '@/components/MenuGeneratorPanel';
import type { TrainingInput } from '@/lib/rt/generator';

function MenuPageInner() {
  const searchParams = useSearchParams();
  const planId    = searchParams.get('plan_id') ?? undefined;
  const period    = searchParams.get('period') ?? undefined;
  const distance  = searchParams.get('distance') ?? undefined;
  const condition = searchParams.get('condition') ?? undefined;
  const stroke    = searchParams.get('stroke') ?? undefined;
  const distanceType = searchParams.get('distanceType') ?? undefined;

  const initialValues: Partial<TrainingInput> | undefined =
    period || distance || stroke
      ? { period, distance, condition, stroke, distanceType }
      : undefined;

  return <MenuGeneratorPanel embedded planId={planId} initialValues={initialValues} />;
}

/**
 * RT swim lab - 練習メニュー専用ページ
 */
export default function RTSwimLabMenuPage() {
  return (
    <div>
      {/* ─── プレミアムヘッダー ─── */}
      <header className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-[#0a1628] to-[#0d1f35] mb-8 p-7 sm:p-10 text-white shadow-2xl shadow-slate-900/40">
        {/* Ambient glows */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-16 -right-16 w-72 h-72 rounded-full bg-cyan-500/15 blur-3xl" />
          <div className="absolute -bottom-16 -left-16 w-56 h-56 rounded-full bg-teal-500/10 blur-3xl" />
          <div className="absolute top-0 left-1/2 w-32 h-32 rounded-full bg-sky-400/5 blur-2xl" />
          {/* Subtle grid */}
          <div
            className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage:
                'linear-gradient(rgba(6,182,212,1) 1px, transparent 1px), linear-gradient(90deg, rgba(6,182,212,1) 1px, transparent 1px)',
              backgroundSize: '32px 32px',
            }}
          />
        </div>

        <div className="relative">
          {/* Eyebrow */}
          <div className="flex items-center gap-2 mb-5">
            <span className="w-8 h-[2px] rounded-full bg-gradient-to-r from-cyan-400 to-teal-400" />
            <p className="text-cyan-400 text-[11px] font-bold uppercase tracking-[0.25em]">
              Powered by RT Japan Coaching Philosophy
            </p>
          </div>

          {/* Logo row */}
          <div className="flex items-center gap-4 mb-5">
            <div className="relative">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-400 to-teal-500 flex items-center justify-center text-3xl shadow-xl shadow-cyan-500/30">
                🏊
              </div>
              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center">
                <span className="text-[9px] text-white font-black">AI</span>
              </div>
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                RT swim lab
              </h1>
              <p className="text-cyan-400 text-sm font-semibold mt-0.5">
                練習メニュー生成
              </p>
            </div>
          </div>

          {/* Description */}
          <p className="text-slate-400 text-sm leading-relaxed max-w-md">
            距離・強度・インターバルを科学的に設計したメニューを即時生成します。
          </p>
        </div>
      </header>

      {/* ─── メニュー生成パネル ─── */}
      <Suspense fallback={<div className="flex justify-center py-10"><div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" /></div>}>
        <MenuPageInner />
      </Suspense>
    </div>
  );
}
