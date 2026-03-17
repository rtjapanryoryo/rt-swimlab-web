/**
 * 距離と練習時間の整合性チェック
 *
 * 水泳練習の現実的な密度（m/分）に基づき、
 * 選択された組み合わせが設計上問題ないか判定する。
 */

const PRACTICE_TIMES = [60, 90, 120] as const;
const ALL_DISTANCES = [2000, 3000, 4000, 5000, 5500, 6000, 6500, 7000, 7500, 8000] as const;

/**
 * 距離タイプ別の選択可能な距離範囲（設計: docs/RT_MENU_GENERATION_RULES_JA.md）
 * - S: 2000〜6000m（スプリントは量より質）
 * - M: 3000〜7000m（ミドルは中間）
 * - D: 6000〜8000m（ディスタンスは量を確保、7500mで8,000mに近づける）
 */
export const DISTANCE_OPTIONS_BY_TYPE: Record<string, readonly number[]> = {
  S: [2000, 3000, 4000, 5000, 6000],
  M: [3000, 4000, 5000, 6000, 7000],
  D: [6000, 6500, 7000, 7500, 8000],
};

export type DistanceTimeStatus = 'optimal' | 'feasible' | 'dense' | 'not_recommended';

export interface DistanceTimeResult {
  status: DistanceTimeStatus;
  message: string;
  /** 推奨練習時間（分）。現在の組み合わせが dense/not_recommended の場合に提案 */
  suggestedPracticeTime?: string;
  /** m/分。密度の目安 */
  densityPerMin: number;
}

/**
 * 距離と練習時間の整合性を判定
 *
 * - optimal: 余裕を持って設計できる
 * - feasible: 問題なく設計できる
 * - dense: 高密度。可能だが注意
 * - not_recommended: 非推奨。より長い時間を推奨
 */
export function validateDistanceTime(
  distance: string,
  practiceTime: string
): DistanceTimeResult | null {
  const dist = parseInt(distance, 10);
  const time = parseInt(practiceTime, 10);
  if (!distance || !practiceTime || Number.isNaN(dist) || Number.isNaN(time)) {
    return null;
  }
  if (!ALL_DISTANCES.includes(dist as (typeof ALL_DISTANCES)[number])) return null;
  if (!PRACTICE_TIMES.includes(time as (typeof PRACTICE_TIMES)[number])) return null;

  const density = dist / time;

  // 目安: 50-70 m/分 = 余裕あり, 70-90 = 通常, 90-110 = 高密度, 110+ = 非推奨
  if (time === 60) {
    if (dist <= 3500) {
      return { status: 'optimal', message: '余裕を持って設計できます。', densityPerMin: density };
    }
    if (dist <= 4500) {
      return { status: 'feasible', message: 'この組み合わせで問題なく設計できます。', densityPerMin: density };
    }
    if (dist <= 5500) {
      return {
        status: 'dense',
        message: 'やや高密度になります。余裕を持って取り組むには90分がおすすめです。',
        suggestedPracticeTime: '90',
        densityPerMin: density,
      };
    }
    return {
      status: 'not_recommended',
      message: '60分では高強度になります。90分以上を推奨します。',
      suggestedPracticeTime: '90',
      densityPerMin: density,
    };
  }

  if (time === 90) {
    if (dist <= 4500) {
      return { status: 'optimal', message: '余裕を持って設計できます。', densityPerMin: density };
    }
    if (dist <= 6000) {
      return { status: 'feasible', message: 'この組み合わせで問題なく設計できます。', densityPerMin: density };
    }
    if (dist <= 7000) {
      return {
        status: 'dense',
        message: 'やや高密度になります。余裕を持って取り組むには120分がおすすめです。',
        suggestedPracticeTime: '120',
        densityPerMin: density,
      };
    }
    return {
      status: 'not_recommended',
      message: '90分では高強度になります。120分を推奨します。',
      suggestedPracticeTime: '120',
      densityPerMin: density,
    };
  }

  if (time === 120) {
    if (dist <= 6000) {
      return { status: 'optimal', message: '余裕を持って設計できます。', densityPerMin: density };
    }
    if (dist <= 8000) {
      return { status: 'feasible', message: 'この組み合わせで問題なく設計できます。', densityPerMin: density };
    }
    return {
      status: 'dense',
      message: '120分では高密度になります。',
      densityPerMin: density,
    };
  }

  return null;
}

/** 距離タイプに対して選択中の距離が有効か */
export function isDistanceValidForType(distance: string, distanceType: string): boolean {
  const dist = parseInt(distance, 10);
  if (!distance || Number.isNaN(dist)) return false;
  const opts = distanceType ? DISTANCE_OPTIONS_BY_TYPE[distanceType] : null;
  if (!opts) return ALL_DISTANCES.includes(dist as (typeof ALL_DISTANCES)[number]);
  return (opts as number[]).includes(dist);
}

/** 距離タイプに応じた選択肢（文字列配列）。未指定時は全距離 */
export function getDistanceOptionsForType(distanceType: string): readonly string[] {
  const opts = distanceType ? DISTANCE_OPTIONS_BY_TYPE[distanceType] : null;
  if (!opts) return ALL_DISTANCES.map(String);
  return opts.map(String);
}

/**
 * Quick モード用：距離タイプ × 練習時間で絞った距離選択肢（「距離の目安」）
 * テンプレのカバー範囲と密度（m/分）を考慮。Custom より選択肢を少なくする。
 */
export const QUICK_DISTANCE_OPTIONS: Record<
  string,
  Record<string, readonly number[]>
> = {
  S: {
    '60': [2000, 3000],
    '90': [2000, 3000],
    '120': [2000, 3000],
  },
  M: {
    '60': [3000, 4000],
    '90': [3000, 4000, 5000],
    '120': [3000, 4000, 5000],
  },
  D: {
    '60': [4000],
    '90': [4000, 5000],
    '120': [4000, 5000],
  },
};

/** Quick モードで距離タイプ・練習時間から選択肢を取得 */
export function getQuickDistanceOptions(
  distanceType: string,
  practiceTime: string
): readonly string[] {
  const typeMap = (distanceType === 'S' || distanceType === 'M' || distanceType === 'D')
    ? QUICK_DISTANCE_OPTIONS[distanceType]
    : null;
  const opts = typeMap?.[practiceTime];
  if (!opts) return [];
  return opts.map(String);
}

/** Quick モードで距離が有効か（距離タイプ × 練習時間の組み合わせ） */
export function isQuickDistanceValid(
  distance: string,
  distanceType: string,
  practiceTime: string
): boolean {
  const opts = getQuickDistanceOptions(distanceType, practiceTime);
  return opts.includes(distance);
}

/** 指定した練習時間で無理のない距離の範囲（目安） */
export function getSuggestedDistanceRange(practiceTime: string): { min: number; max: number; label: string } | null {
  const time = parseInt(practiceTime, 10);
  if (!PRACTICE_TIMES.includes(time as (typeof PRACTICE_TIMES)[number])) return null;
  const ranges: Record<number, { min: number; max: number; label: string }> = {
    60: { min: 2000, max: 4500, label: '2,000〜4,500m' },
    90: { min: 2500, max: 6000, label: '2,500〜6,000m' },
    120: { min: 3500, max: 8000, label: '3,500〜8,000m' },
  };
  return ranges[time] ?? null;
}
