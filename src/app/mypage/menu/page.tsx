'use client';

import MenuGeneratorPanel from '@/components/MenuGeneratorPanel';

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
            RTジャパンのコーチング哲学を内包した骨格優先アーキテクチャーにより、<br className="hidden sm:block" />
            距離・強度・インターバルを科学的に設計したメニューを即時生成します。
          </p>

          {/* Feature pills */}
          <div className="mt-5 flex flex-wrap gap-2">
            {[
              { icon: '⚡', text: 'クイック生成' },
              { icon: '🎯', text: 'カスタム生成' },
              { icon: '📊', text: '強度分析' },
              { icon: '🔄', text: '再生成対応' },
            ].map((f) => (
              <span
                key={f.text}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/8 border border-white/10 text-slate-300 text-xs font-medium backdrop-blur-sm hover:border-cyan-400/30 hover:text-white transition-colors"
              >
                <span>{f.icon}</span>
                {f.text}
              </span>
            ))}
          </div>

          {/* Methodology badges */}
          <div className="mt-5 pt-5 border-t border-white/8 flex flex-wrap items-center gap-x-6 gap-y-2">
            {[
              { label: '強度体系', value: 'RT Japan 公式' },
              { label: '温度管理', value: 'temperature 0.1' },
              { label: '距離保証', value: '数学的確定' },
            ].map((b) => (
              <div key={b.label} className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                <span className="text-[11px] text-slate-500 font-medium">{b.label}</span>
                <span className="text-[11px] text-cyan-400 font-bold">{b.value}</span>
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* ─── メニュー生成パネル ─── */}
      <MenuGeneratorPanel embedded />
    </div>
  );
}
