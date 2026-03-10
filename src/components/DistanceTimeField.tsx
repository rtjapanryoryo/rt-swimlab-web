'use client';

import { validateDistanceTime, getSuggestedDistanceRange, getDistanceOptionsForType } from '@/lib/rt/distance-time-validation';

export interface DistanceTimeFieldProps {
  distance: string;
  practiceTime: string;
  onDistanceChange: (v: string) => void;
  onPracticeTimeChange: (v: string) => void;
  /** 距離タイプ（S/M/D）。指定時はそのタイプに合う距離のみ表示 */
  distanceType?: string;
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
  distanceType,
  distanceLabel = '距離',
  practiceTimeLabel = '練習時間',
  fullWidth = false,
}: DistanceTimeFieldProps) {
  const distanceOptions = getDistanceOptionsForType(distanceType ?? '');
  const validation = distance && practiceTime ? validateDistanceTime(distance, practiceTime) : null;
  const showSuggestion = validation && (validation.status === 'dense' || validation.status === 'not_recommended');
  const rangeHint = practiceTime ? getSuggestedDistanceRange(practiceTime) : null;

  const handleApplySuggestion = () => {
    if (validation?.suggestedPracticeTime) {
      onPracticeTimeChange(validation.suggestedPracticeTime);
    }
  };

  const fieldClass =
    'w-full px-3 py-2.5 border-2 border-slate-200 rounded-2xl bg-white focus:outline-none focus:ring-2 focus:ring-cyan-400/30 focus:border-cyan-400 transition-colors';

  return (
    <div className={fullWidth ? 'col-span-full' : ''}>
      <div
        className={`rounded-2xl border border-slate-200/80 bg-gradient-to-br from-slate-50/50 to-white p-4 sm:p-5 ${fullWidth ? '' : ''}`}
      >
        <p className="mb-3 text-xs font-medium text-slate-500">
          距離と時間のバランスで、適切な練習密度が決まります
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{distanceLabel}</label>
            <select value={distance} onChange={(e) => onDistanceChange(e.target.value)} className={fieldClass}>
              <option value="">選択してください</option>
              {distanceOptions.map((d) => (
                <option key={d} value={d}>
                  {Number(d).toLocaleString()}m
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

        {rangeHint && !showSuggestion && (
          <p className="mt-2 text-xs text-slate-400">
            {practiceTime}分の場合、{rangeHint.label}が目安です
          </p>
        )}

        {validation && (validation.status === 'optimal' || validation.status === 'feasible') && distance && practiceTime && (
          <p className="mt-2 flex items-center gap-2 text-xs text-slate-500">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden />
            {validation.message}
          </p>
        )}
      </div>

      {showSuggestion && (
        <div
          role="alert"
          className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 shadow-sm"
        >
          <p className="text-sm font-medium text-slate-700 mb-1">この組み合わせについて</p>
          <p className="text-sm leading-relaxed text-slate-600 mb-3">{validation.message}</p>
          {validation.suggestedPracticeTime && (
            <button
              type="button"
              onClick={handleApplySuggestion}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-cyan-500/20 transition-all hover:from-cyan-600 hover:to-teal-600 hover:shadow-lg hover:shadow-cyan-500/25 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2"
            >
              {validation.suggestedPracticeTime}分に変更する
            </button>
          )}
        </div>
      )}
    </div>
  );
}
