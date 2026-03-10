'use client';

import { validateDistanceTime } from '@/lib/rt/distance-time-validation';

const DISTANCE_OPTIONS = ['2000', '3000', '4000', '5000', '6000', '7000', '8000'] as const;

export interface DistanceTimeFieldProps {
  distance: string;
  practiceTime: string;
  onDistanceChange: (v: string) => void;
  onPracticeTimeChange: (v: string) => void;
  /** ラベルプレフィックス（クイック: "距離", カスタム: "7. 距離" 等） */
  distanceLabel?: string;
  practiceTimeLabel?: string;
  /** グリッド内で2カラム占有するか */
  fullWidth?: boolean;
}

/**
 * 距離と練習時間の連動入力。
 * 整合性に応じて文脈に合ったメッセージと推奨アクションを表示する。
 */
export function DistanceTimeField({
  distance,
  practiceTime,
  onDistanceChange,
  onPracticeTimeChange,
  distanceLabel = '距離',
  practiceTimeLabel = '練習時間',
  fullWidth = false,
}: DistanceTimeFieldProps) {
  const validation = distance && practiceTime ? validateDistanceTime(distance, practiceTime) : null;
  const showSuggestion = validation && (validation.status === 'dense' || validation.status === 'not_recommended');

  const handleApplySuggestion = () => {
    if (validation?.suggestedPracticeTime) {
      onPracticeTimeChange(validation.suggestedPracticeTime);
    }
  };

  const fieldClass =
    'w-full px-3 py-2.5 border-2 border-slate-200 rounded-2xl bg-white focus:outline-none focus:ring-2 focus:ring-cyan-400/30 focus:border-cyan-400';

  return (
    <div className={fullWidth ? 'col-span-full' : ''}>
      <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 ${fullWidth ? '' : ''}`}>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">{distanceLabel}</label>
          <select value={distance} onChange={(e) => onDistanceChange(e.target.value)} className={fieldClass}>
            <option value="">選択してください</option>
            {DISTANCE_OPTIONS.map((d) => (
              <option key={d} value={d}>
                {d}m
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">{practiceTimeLabel}</label>
          <select value={practiceTime} onChange={(e) => onPracticeTimeChange(e.target.value)} className={fieldClass}>
            <option value="">選択してください</option>
            <option value="60">60分</option>
            <option value="90">90分</option>
            <option value="120">120分</option>
          </select>
        </div>
      </div>

      {showSuggestion && (
        <div
          role="status"
          className="mt-3 flex flex-col gap-3 rounded-xl border-l-4 border-slate-300 bg-slate-50/90 px-4 py-3 text-sm"
        >
          <p className="leading-relaxed text-slate-600">{validation.message}</p>
          {validation.suggestedPracticeTime && (
            <button
              type="button"
              onClick={handleApplySuggestion}
              className="self-start rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-cyan-400/30 focus:ring-offset-1"
            >
              {validation.suggestedPracticeTime}分に変更
            </button>
          )}
        </div>
      )}

    </div>
  );
}
