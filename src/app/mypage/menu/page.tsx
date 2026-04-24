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

export default function RTSwimLabMenuPage() {
  return (
    <div className="space-y-5">
      {/* ページヘッダー */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center text-xl shadow-lg shadow-cyan-500/25 shrink-0">
          🏊
        </div>
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900">RT swim lab</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            距離・強度・インターバルを科学的に設計したメニューを即時生成
          </p>
        </div>
      </div>

      {/* メニュー生成パネル */}
      <Suspense fallback={
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
        </div>
      }>
        <MenuPageInner />
      </Suspense>
    </div>
  );
}
