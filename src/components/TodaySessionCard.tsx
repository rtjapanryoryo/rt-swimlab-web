'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PERIOD_META } from '@/types/training';
import type { TodaySuggestion } from '@/types/training';

// ── 今日のAI提案カード ─────────────────────────────────────
// AIは「提案」のみ。コーチ/選手が上書きしてから生成する設計。

export function TodaySessionCard() {
  const router = useRouter();
  const [suggestion, setSuggestion] = useState<TodaySuggestion | null>(null);
  const [planId, setPlanId]         = useState<string | null>(null);
  const [loading, setLoading]       = useState(true);
  const [noplan, setNoplan]         = useState(false);

  // 上書き用ローカル状態
  const [distance, setDistance]   = useState('');
  const [condition, setCondition] = useState('');

  useEffect(() => {
    fetch('/api/training/today', { credentials: 'include' })
      .then(r => r.json())
      .then(d => {
        if (d.suggestion) {
          setSuggestion(d.suggestion as TodaySuggestion);
          setPlanId(d.plan_id as string);
          setDistance(String((d.suggestion as TodaySuggestion).distance_m));
          setCondition((d.suggestion as TodaySuggestion).condition);
        } else {
          setNoplan(true);
        }
      })
      .catch(() => setNoplan(true))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-5 animate-pulse">
        <div className="h-4 w-32 bg-slate-100 rounded mb-3" />
        <div className="h-8 w-48 bg-slate-100 rounded" />
      </div>
    );
  }

  if (noplan || !suggestion) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 p-5 flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-lg shrink-0">📅</div>
        <div>
          <p className="text-sm font-semibold text-slate-700">トレーニング計画を作成しましょう</p>
          <p className="text-xs text-slate-400 mt-0.5">試合日を登録するとAIが毎日の練習を提案します</p>
        </div>
        <button
          onClick={() => router.push('/mypage/plan/new')}
          className="ml-auto shrink-0 px-4 py-2 bg-cyan-500 text-white text-sm font-semibold rounded-xl hover:bg-cyan-400 transition-colors"
        >
          計画を作成
        </button>
      </div>
    );
  }

  const meta    = PERIOD_META[suggestion.period];
  const distNum = parseInt(distance) || suggestion.distance_m;

  const handleGenerate = () => {
    // 上書き値（コーチ/選手の判断）をクエリに乗せてメニュー生成ページへ
    const params = new URLSearchParams({
      period:        suggestion.period,
      distance:      String(distNum),
      condition:     condition || suggestion.condition,
      stroke:        suggestion.stroke,
      distanceType:  suggestion.distance_type,
      plan_id:       planId ?? '',
      from_story:    '1',
    });
    router.push(`/mypage/menu?${params.toString()}`);
  };

  return (
    <div className="rounded-2xl border border-cyan-200/60 bg-gradient-to-br from-white to-cyan-50/40 shadow-sm overflow-hidden">
      {/* ヘッダー */}
      <div className="px-5 pt-4 pb-3 flex items-center justify-between border-b border-cyan-100/60">
        <div className="flex items-center gap-2">
          <span className="text-base">🤖</span>
          <p className="text-xs font-bold text-cyan-700 uppercase tracking-wider">今日のAI提案</p>
          <span className="text-[10px] bg-cyan-100 text-cyan-600 px-2 py-0.5 rounded-full font-semibold">
            提案のみ・変更可
          </span>
        </div>
        <button
          onClick={() => router.push(`/mypage/plan/${planId}`)}
          className="text-xs text-slate-400 hover:text-slate-700 transition-colors"
        >
          計画を見る →
        </button>
      </div>

      {/* 試合前ガード警告 */}
      {suggestion.warning && (
        <div className="mx-5 mt-3 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700 font-medium">
          {suggestion.warning}
        </div>
      )}

      {/* 提案内容 */}
      <div className="px-5 py-4 space-y-4">
        <div className="flex flex-wrap gap-3">
          {/* 期バッジ */}
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl ${meta.color} ${meta.textColor} font-semibold text-sm`}>
            <span>期{suggestion.period}</span>
            <span className="text-xs opacity-70">{meta.short}</span>
          </div>

          {/* 試合まで */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 text-slate-600 text-sm">
            🏊 試合まで <strong>{suggestion.days_to_meet}日</strong>
          </div>
        </div>

        {/* 編集可能パラメータ */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              距離（m）<span className="text-cyan-500 ml-1">変更可</span>
            </label>
            <input
              type="number"
              value={distance}
              onChange={e => setDistance(e.target.value)}
              step={500}
              min={500}
              max={15000}
              className="w-full px-3 py-2 text-sm font-bold text-slate-900 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-400 bg-white"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              コンディション <span className="text-cyan-500 ml-1">変更可</span>
            </label>
            <select
              value={condition}
              onChange={e => setCondition(e.target.value)}
              className="w-full px-3 py-2 text-sm text-slate-900 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-400 bg-white"
            >
              {['絶好調', '普通', '軽疲労', '疲労残り', '月経期', '筋疲労'].map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        {/* 提案理由（透明性） */}
        <div className="text-xs text-slate-500 bg-slate-50/80 rounded-xl px-3 py-2.5 leading-relaxed">
          <span className="font-semibold text-slate-600">AIの判断根拠：</span>{suggestion.reason}
        </div>

        {/* 生成ボタン */}
        <button
          onClick={handleGenerate}
          className="w-full py-3 bg-gradient-to-r from-cyan-500 to-teal-500 text-white font-bold rounded-xl hover:from-cyan-400 hover:to-teal-400 transition-all shadow-lg shadow-cyan-500/25 hover:-translate-y-0.5 text-sm"
        >
          この内容でメニューを生成する
        </button>
      </div>
    </div>
  );
}
