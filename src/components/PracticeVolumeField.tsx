'use client';

import {
  validateDistanceTime,
  getSuggestedDistanceRange,
  getDistanceOptionsForType,
  getQuickDistanceOptions,
} from '@/lib/rt/distance-time-validation';

const DISTANCE_TYPE_LABELS: Record<string, string> = {
  S: 'S（スプリント）',
  M: 'M（ミドル）',
  D: 'D（ディスタンス）',
};

const DISTANCE_TYPE_RANGES: Record<string, string> = {
  S: '2,000〜6,000m',
  M: '3,000〜7,000m',
  D: '6,000〜8,000m',
};

/** Quick モード用：距離タイプ×練習時間で絞った範囲の説明 */
const QUICK_DISTANCE_TYPE_RANGES: Record<string, Record<string, string>> = {
  S: { '': '2,000〜3,000m', '60': '2,000〜3,000m', '90': '2,000〜3,000m', '120': '2,000〜3,000m' },
  M: { '': '3,000〜5,000m', '60': '3,000〜4,000m', '90': '3,000〜5,000m', '120': '3,000〜5,000m' },
  D: { '': '4,000〜5,000m', '60': '4,000m', '90': '4,000〜5,000m', '120': '4,000〜5,000m' },
};

export interface PracticeVolumeFieldProps {
  distanceType: string;
  distance: string;
  practiceTime: string;
  onDistanceTypeChange: (v: string) => void;
  onDistanceChange: (v: string) => void;
  onPracticeTimeChange: (v: string) => void;
  /** クイック: "2." / カスタム: "5." 等、前の項目番号 */
  itemNumberPrefix?: string;
  /** quick: 距離タイプ×練習時間で絞った選択肢。custom: 全距離タイプ別選択肢 */
  mode?: 'quick' | 'custom';
}

/**
 * 距離タイプ・距離・練習時間を1つのセクションにまとめた入力フィールド。
 * 3つが連動していることを視覚的に示し、ユーザビリティを向上させる。
 */
export function PracticeVolumeField({
  distanceType,
  distance,
  practiceTime,
  onDistanceTypeChange,
  onDistanceChange,
  onPracticeTimeChange,
  itemNumberPrefix = '',
  mode = 'custom',
}: PracticeVolumeFieldProps) {
  const isQuick = mode === 'quick';
  const distanceOptions = isQuick
    ? getQuickDistanceOptions(distanceType ?? '', practiceTime ?? '')
    : getDistanceOptionsForType(distanceType ?? '');
  const distanceSelectDisabled = isQuick
    ? !distanceType || !practiceTime
    : !distanceType;
  const validation = distance && practiceTime ? validateDistanceTime(distance, practiceTime) : null;
  const showSuggestion =
    validation && (validation.status === 'dense' || validation.status === 'not_recommended');
  const rangeHint = practiceTime ? getSuggestedDistanceRange(practiceTime) : null;
  const rangeLabel =
    isQuick && distanceType
      ? QUICK_DISTANCE_TYPE_RANGES[distanceType]?.[practiceTime || ''] ?? DISTANCE_TYPE_RANGES[distanceType]
      : DISTANCE_TYPE_RANGES[distanceType];

  const handleApplySuggestion = () => {
    if (validation?.suggestedPracticeTime) {
      onPracticeTimeChange(validation.suggestedPracticeTime);
    }
  };

  const fieldClass =
    'w-full px-3 py-2.5 border-2 border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-cyan-400/30 focus:border-cyan-400 transition-colors';

  const baseNum = itemNumberPrefix ? parseInt(String(itemNumberPrefix).replace(/\D/g, ''), 10) || 0 : 0;
  const n1 = baseNum ? `${baseNum}.` : '';
  const n2 = baseNum ? `${baseNum + 1}.` : '';
  const n3 = baseNum ? `${baseNum + 2}.` : '';

  return (
    <div className="rounded-2xl border-2 border-cyan-200/80 bg-gradient-to-br from-cyan-50/60 to-white p-5 sm:p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-1">
        <h3 className="text-sm font-bold text-cyan-800 tracking-wide">練習のボリューム</h3>
        <span className="text-xs text-slate-500">（練習時間・距離タイプ・距離はセットで決まります）</span>
      </div>
      <p className="text-xs text-slate-500 mb-4">
        練習時間と距離タイプを先に決め、選べる距離の中から練習ボリュームを調整します
      </p>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            {n1} 練習時間
          </label>
          <select
            value={practiceTime}
            onChange={(e) => onPracticeTimeChange(e.target.value)}
            className={fieldClass}
          >
            <option value="">選択してください</option>
            <option value="60">60分</option>
            <option value="90">90分</option>
            <option value="120">120分</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            {n2} 距離タイプ
            {distanceType && (
              <span className="ml-2 text-xs font-normal text-cyan-600">
                → {rangeLabel}
              </span>
            )}
          </label>
          <div className="flex flex-wrap gap-2">
            {(['S', 'M', 'D'] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => onDistanceTypeChange(type)}
                className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  distanceType === type
                    ? 'bg-cyan-500 text-white shadow-md shadow-cyan-500/25'
                    : 'bg-white border-2 border-slate-200 text-slate-600 hover:border-cyan-300 hover:bg-cyan-50/50'
                }`}
              >
                {DISTANCE_TYPE_LABELS[type]}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            {n3} 距離{isQuick && '（目安）'}
          </label>
          <select
            value={distance}
            onChange={(e) => onDistanceChange(e.target.value)}
            className={fieldClass}
            disabled={distanceSelectDisabled}
          >
            <option value="">
              {distanceSelectDisabled
                ? isQuick
                  ? '距離タイプと練習時間を先に選択'
                  : '先に距離タイプを選択'
                : '選択してください'}
            </option>
            {distanceOptions.map((d) => (
              <option key={d} value={d}>
                {Number(d).toLocaleString()}m
              </option>
            ))}
          </select>
        </div>
      </div>

      {rangeHint && !showSuggestion && (
        <p className="mt-3 text-xs text-slate-400">
          {practiceTime}分の場合、{rangeHint.label}が目安です
        </p>
      )}

      {validation && (validation.status === 'optimal' || validation.status === 'feasible') && distance && practiceTime && (
        <p className="mt-3 flex items-center gap-2 text-xs text-slate-500">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden />
          {validation.message}
        </p>
      )}

      {showSuggestion && (
        <div role="alert" className="mt-4 rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3">
          <p className="text-sm font-medium text-slate-700 mb-1">この組み合わせについて</p>
          <p className="text-sm leading-relaxed text-slate-600 mb-3">{validation.message}</p>
          {validation.suggestedPracticeTime && (
            <button
              type="button"
              onClick={handleApplySuggestion}
              className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-600 transition-colors"
            >
              {validation.suggestedPracticeTime}分に変更する
            </button>
          )}
        </div>
      )}
    </div>
  );
}
