'use client';

import { useState, useEffect, useCallback } from 'react';
import type { GoalSheetLevel, BeginnerContent, IntermediateContent, AdvancedContent, GoalSheet } from '@/types/goal-sheet';
import { BeginnerSheet } from '@/components/goal-sheet/BeginnerSheet';
import { IntermediateSheet } from '@/components/goal-sheet/IntermediateSheet';
import { AdvancedSheet } from '@/components/goal-sheet/AdvancedSheet';

type LevelConfig = {
  key: GoalSheetLevel;
  label: string;
  step: string;
  emoji: string;
  tagline: string;
  desc: string;
  activeCard:   string;
  activeStep:   string;
  activeLabel:  string;
  activeSub:    string;
  activeBar:    string;
  inactiveCard: string;
};

const LEVELS: LevelConfig[] = [
  {
    key: 'beginner',
    label: '初級',
    step: '01',
    emoji: '🌱',
    tagline: '夢をカタチにしよう',
    desc: '考える習慣をつくる',
    activeCard:   'border-emerald-400 bg-gradient-to-b from-emerald-50 to-white shadow-md shadow-emerald-100/60',
    activeStep:   'text-emerald-400',
    activeLabel:  'text-emerald-700',
    activeSub:    'text-emerald-500',
    activeBar:    'bg-emerald-400',
    inactiveCard: 'border-slate-100 bg-white hover:border-emerald-200 hover:bg-emerald-50/30 shadow-sm',
  },
  {
    key: 'intermediate',
    label: '中級',
    step: '02',
    emoji: '🔷',
    tagline: '具体化と数値化',
    desc: '目標をわける',
    activeCard:   'border-blue-400 bg-gradient-to-b from-blue-50 to-white shadow-md shadow-blue-100/60',
    activeStep:   'text-blue-400',
    activeLabel:  'text-blue-700',
    activeSub:    'text-blue-500',
    activeBar:    'bg-blue-400',
    inactiveCard: 'border-slate-100 bg-white hover:border-blue-200 hover:bg-blue-50/30 shadow-sm',
  },
  {
    key: 'advanced',
    label: '上級',
    step: '03',
    emoji: '🔥',
    tagline: '再現性と戦略',
    desc: '戦略を練る',
    activeCard:   'border-amber-400 bg-gradient-to-b from-amber-50 to-white shadow-md shadow-amber-100/60',
    activeStep:   'text-amber-400',
    activeLabel:  'text-amber-700',
    activeSub:    'text-amber-500',
    activeBar:    'bg-amber-400',
    inactiveCard: 'border-slate-100 bg-white hover:border-amber-200 hover:bg-amber-50/30 shadow-sm',
  },
];

function PrintIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 6 2 18 2 18 9" />
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
      <rect x="6" y="14" width="12" height="8" />
    </svg>
  );
}

export default function GoalSheetPage() {
  const [activeLevel, setActiveLevel] = useState<GoalSheetLevel>('beginner');
  const [sheets, setSheets] = useState<Partial<Record<GoalSheetLevel, GoalSheet | null>>>({});
  const [loading, setLoading] = useState(true);

  const fetchSheet = useCallback(async (level: GoalSheetLevel) => {
    if (level in sheets) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/goal-sheet?level=${level}`, { credentials: 'include' });
      const data = await res.json();
      setSheets(prev => ({ ...prev, [level]: data.sheet ?? null }));
    } finally {
      setLoading(false);
    }
  }, [sheets]);

  useEffect(() => {
    fetchSheet(activeLevel);
  }, [activeLevel, fetchSheet]);

  const handleSave = async (
    level: GoalSheetLevel,
    content: BeginnerContent | IntermediateContent | AdvancedContent,
  ) => {
    const res = await fetch('/api/goal-sheet', {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ level, content }),
    });
    const data = await res.json();
    if (data.sheet) {
      setSheets(prev => ({ ...prev, [level]: data.sheet }));
    }
  };

  const activeConfig = LEVELS.find(l => l.key === activeLevel)!;
  const activeSheet  = sheets[activeLevel];

  return (
    <>
      <style>{`
        @media print {
          aside, footer, .no-print { display: none !important; }
          main { padding: 0 !important; margin: 0 !important; }
          .print-section { break-inside: avoid; page-break-inside: avoid; }
          body { background: white !important; }
          .print-header { display: block !important; }
        }
        .print-header { display: none; }
      `}</style>

      <div className="space-y-5 max-w-3xl mx-auto">
        {/* 印刷時ヘッダー */}
        <div className="print-header mb-6">
          <img src="/RT-japan_Logo.svg" alt="RT-japan" className="h-10 w-auto mb-3" />
          <h1 className="text-xl font-bold text-slate-900">目標達成ワークシート【{activeConfig.label}】</h1>
          <p className="text-sm text-slate-500">テーマ：{activeConfig.tagline}</p>
          <p className="text-xs text-slate-400 mt-1">
            印刷日：{new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
          <hr className="mt-3 border-slate-200" />
        </div>

        {/* ページヘッダー */}
        <div className="no-print flex items-center justify-between gap-4">
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-slate-900">目標シート</h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-0.5">夢を言語化し、勝利への道筋をつくります</p>
          </div>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-500 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 shadow-sm transition-colors shrink-0"
          >
            <PrintIcon />
            <span className="hidden sm:inline">PDF保存</span>
          </button>
        </div>

        {/* レベルタブ */}
        <div className="no-print grid grid-cols-3 gap-2 sm:gap-3">
          {LEVELS.map(level => {
            const isActive = activeLevel === level.key;
            return (
              <button
                key={level.key}
                onClick={() => setActiveLevel(level.key)}
                className={`relative flex flex-col items-center gap-1 pt-3 pb-4 px-2 rounded-2xl border-2 transition-all duration-200 ${
                  isActive ? level.activeCard : level.inactiveCard
                }`}
              >
                <span className={`text-[10px] font-black tracking-widest ${isActive ? level.activeStep : 'text-slate-300'}`}>
                  {level.step}
                </span>
                <span className="text-xl sm:text-2xl leading-none">{level.emoji}</span>
                <span className={`text-xs sm:text-sm font-bold mt-0.5 ${isActive ? level.activeLabel : 'text-slate-600'}`}>
                  {level.label}
                </span>
                <span className={`text-[9px] sm:text-[10px] font-medium leading-tight text-center ${isActive ? level.activeSub : 'text-slate-400'}`}>
                  {level.desc}
                </span>
                {isActive && (
                  <div className={`absolute bottom-0 left-1/2 -translate-x-1/2 w-10 h-1 rounded-t-full ${level.activeBar}`} />
                )}
              </button>
            );
          })}
        </div>

        {/* カウンセリング導線（レベルタブ直下） */}
        <div className="no-print rounded-2xl border border-cyan-200 bg-gradient-to-r from-cyan-50 to-teal-50 px-5 py-3 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-slate-800">目標シートをコーチと一緒に作る</p>
            <p className="text-xs text-slate-500 mt-0.5">書き方で迷ったら、無料カウンセリングで相談できます（15分）</p>
          </div>
          <a
            href="/mypage/counseling"
            className="shrink-0 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 text-white text-xs font-bold shadow-lg shadow-cyan-500/20 hover:from-cyan-400 hover:to-teal-400 transition-all whitespace-nowrap"
          >
            無料相談
          </a>
        </div>

        {/* コンテンツ */}
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {activeLevel === 'beginner' && (
              <BeginnerSheet
                initialData={(activeSheet?.content as BeginnerContent) ?? null}
                aiAdvice={activeSheet?.ai_feedback ?? null}
                savedAt={activeSheet?.updated_at ?? null}
                onSave={content => handleSave('beginner', content)}
              />
            )}
            {activeLevel === 'intermediate' && (
              <IntermediateSheet
                initialData={(activeSheet?.content as IntermediateContent) ?? null}
                aiAdvice={activeSheet?.ai_feedback ?? null}
                savedAt={activeSheet?.updated_at ?? null}
                onSave={content => handleSave('intermediate', content)}
              />
            )}
            {activeLevel === 'advanced' && (
              <AdvancedSheet
                initialData={(activeSheet?.content as AdvancedContent) ?? null}
                aiAdvice={activeSheet?.ai_feedback ?? null}
                savedAt={activeSheet?.updated_at ?? null}
                onSave={content => handleSave('advanced', content)}
              />
            )}
          </>
        )}

        {/* 印刷フッター */}
        <div className="print-header border-t border-slate-200 pt-4 mt-8 text-xs text-slate-400">
          <p>RT swim lab — 目標達成ワークシート | このシートはコーチとのカウンセリングにもご活用ください</p>
        </div>
      </div>
    </>
  );
}
