'use client';

import { useState, useEffect, useCallback } from 'react';
import type { GoalSheetLevel, BeginnerContent, IntermediateContent, AdvancedContent, GoalSheet } from '@/types/goal-sheet';
import { BeginnerSheet } from '@/components/goal-sheet/BeginnerSheet';
import { IntermediateSheet } from '@/components/goal-sheet/IntermediateSheet';
import { AdvancedSheet } from '@/components/goal-sheet/AdvancedSheet';

type LevelConfig = {
  key: GoalSheetLevel;
  label: string;
  emoji: string;
  theme: string;
  tagline: string;
  desc: string;
  activeClass: string;
  inactiveClass: string;
};

const LEVELS: LevelConfig[] = [
  {
    key: 'beginner',
    label: '初級',
    emoji: '🌱',
    theme: 'emerald',
    tagline: '夢をカタチにしよう',
    desc: '考える習慣をつくる',
    activeClass: 'bg-emerald-500 text-white shadow-emerald-200',
    inactiveClass: 'text-slate-500 hover:text-emerald-600 hover:bg-emerald-50',
  },
  {
    key: 'intermediate',
    label: '中級',
    emoji: '🔷',
    theme: 'blue',
    tagline: '具体化と数値化',
    desc: '目標をわける',
    activeClass: 'bg-blue-500 text-white shadow-blue-200',
    inactiveClass: 'text-slate-500 hover:text-blue-600 hover:bg-blue-50',
  },
  {
    key: 'advanced',
    label: '上級',
    emoji: '🔥',
    theme: 'amber',
    tagline: '再現性と戦略',
    desc: '戦略を練る',
    activeClass: 'bg-amber-500 text-white shadow-amber-200',
    inactiveClass: 'text-slate-500 hover:text-amber-600 hover:bg-amber-50',
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
  const [loading, setLoading] = useState(false);

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
  const activeSheet = sheets[activeLevel];

  return (
    <>
      {/* 印刷用スタイル */}
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

      <div className="space-y-6">
        {/* 印刷時のみ表示するヘッダー */}
        <div className="print-header mb-6">
          <img src="/RT-japan_Logo.svg" alt="RT-japan" className="h-10 w-auto mb-3" />
          <h1 className="text-xl font-bold text-slate-900">
            目標達成ワークシート【{activeConfig.label}】
          </h1>
          <p className="text-sm text-slate-500">テーマ：{activeConfig.tagline}</p>
          <p className="text-xs text-slate-400 mt-1">
            印刷日：{new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
          <hr className="mt-3 border-slate-200" />
        </div>

        {/* ページヘッダー */}
        <div className="no-print flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900">目標シート</h1>
            <p className="text-sm text-slate-500 mt-0.5">夢を言語化し、勝利への道筋をつくります</p>
          </div>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 shadow-sm transition-colors shrink-0"
          >
            <PrintIcon />
            <span className="hidden sm:inline">印刷・PDF保存</span>
          </button>
        </div>

        {/* レベルタブ */}
        <div className="no-print flex gap-2 p-1.5 bg-slate-100/80 rounded-2xl">
          {LEVELS.map(level => (
            <button
              key={level.key}
              onClick={() => setActiveLevel(level.key)}
              className={`flex-1 flex flex-col items-center py-2.5 px-2 rounded-xl text-xs font-bold shadow-sm transition-all ${
                activeLevel === level.key ? level.activeClass : level.inactiveClass
              }`}
            >
              <span className="text-base mb-0.5">{level.emoji}</span>
              <span>{level.label}</span>
              <span className={`text-[10px] font-normal mt-0.5 ${activeLevel === level.key ? 'opacity-80' : 'text-slate-400'}`}>
                {level.desc}
              </span>
            </button>
          ))}
        </div>

        {/* ローディング */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
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

        {/* 印刷時フッター */}
        <div className="print-header border-t border-slate-200 pt-4 mt-8 text-xs text-slate-400">
          <p>RT swim lab — 目標達成ワークシート | このシートはコーチとのカウンセリングにもご活用ください</p>
        </div>
      </div>
    </>
  );
}
