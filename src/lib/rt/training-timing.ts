export type TimingType = 'circle' | 'rest';
export type TimingBasis = 'exact_personal_best' | 'level_fallback';

export type PersonalBestTimingReference = {
  stroke: string;
  distanceM: number;
  poolLength: 'short_course' | 'long_course';
  timeCentiseconds: number;
};

export type SegmentTiming = {
  type: TimingType;
  seconds: number;
  display: string;
  targetPaceSeconds: number | null;
  basis: TimingBasis;
};

export type TimingCalculationContext = {
  personalBest?: PersonalBestTimingReference | null;
  generationMode?: 'standard' | 'sprint_50m';
};

export const TIMING_RULE_VERSION = 'personal-best-v1';

const INTENSITY_STEP: Record<string, number> = {
  A1: 1,
  A2: 1,
  EN1: 2,
  EN2: 3,
  EN3: 4,
  EN4: 4,
  AN1: 5,
  AN2: 6,
  MAX: 7,
};

const PACE_MULTIPLIER: Record<number, number> = {
  1: 1.65,
  2: 1.45,
  3: 1.3,
  4: 1.18,
  5: 1.1,
  6: 1.04,
  7: 1,
};

const BLOCK_MULTIPLIER: Record<string, number> = {
  drill: 1.25,
  kick: 1.4,
  pull: 1.12,
  preMain: 1,
  main: 1,
};

function roundUpToFiveSeconds(seconds: number): number {
  return Math.ceil(seconds / 5) * 5;
}

export function formatTimingSeconds(seconds: number): string {
  if (seconds < 60) return `${seconds}秒`;
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}:${String(remainder).padStart(2, '0')}`;
}

export function formatPersonalBest(timeCentiseconds: number): string {
  const totalSeconds = Math.floor(timeCentiseconds / 100);
  const centiseconds = timeCentiseconds % 100;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const fraction = String(centiseconds).padStart(2, '0');
  return minutes > 0
    ? `${minutes}:${String(seconds).padStart(2, '0')}.${fraction}`
    : `${seconds}.${fraction}`;
}

function fallbackRestSeconds(mPerSet: number, intensityStep: number, beginner: boolean): number {
  const byStep: Record<number, number> = { 1: 15, 2: 15, 3: 20, 4: 30, 5: 45, 6: 60, 7: 90 };
  let rest = byStep[intensityStep] ?? 30;
  if (mPerSet >= 400) rest += 30;
  else if (mPerSet >= 200) rest += 20;
  else if (mPerSet >= 100) rest += 10;
  if (beginner) rest += 10;
  return roundUpToFiveSeconds(rest);
}

/**
 * ベストタイムが完全一致する場合だけサークルを算出します。
 * 記録がない場合や高強度セットは、安全側に倒して従来相当のRestを返します。
 */
export function calculateSegmentTiming(args: {
  blockType: string;
  mPerSet: number;
  intensity: string;
  level: string;
  context?: TimingCalculationContext;
}): SegmentTiming {
  const { blockType, mPerSet, intensity, level, context } = args;
  const step = INTENSITY_STEP[intensity] ?? 3;
  const beginner = level.includes('初心者') || level.includes('フィットネス');
  const fallbackSeconds = fallbackRestSeconds(mPerSet, step, beginner);
  const personalBest = context?.personalBest;
  const restOnly =
    !personalBest ||
    step >= 5 ||
    (context?.generationMode === 'sprint_50m' && (blockType === 'preMain' || blockType === 'main'));

  if (restOnly) {
    return {
      type: 'rest',
      seconds: fallbackSeconds,
      display: formatTimingSeconds(fallbackSeconds),
      targetPaceSeconds: null,
      basis: 'level_fallback',
    };
  }

  const raceSeconds = personalBest.timeCentiseconds / 100;
  const racePacePerMeter = raceSeconds / personalBest.distanceM;
  const paceMultiplier = PACE_MULTIPLIER[step] ?? PACE_MULTIPLIER[3];
  const blockMultiplier = BLOCK_MULTIPLIER[blockType] ?? 1;
  const distanceRatio = mPerSet / personalBest.distanceM;
  const enduranceAdjustment = distanceRatio > 1 ? Math.pow(distanceRatio, 0.06) : 1;
  const targetPaceSeconds = Math.ceil(
    racePacePerMeter * mPerSet * paceMultiplier * blockMultiplier * enduranceAdjustment
  );

  let recoverySeconds = step <= 2 ? 15 : step === 3 ? 20 : 30;
  if (mPerSet >= 200) recoverySeconds += 10;
  if (mPerSet >= 400) recoverySeconds += 10;
  if (beginner) recoverySeconds += 10;
  const circleSeconds = roundUpToFiveSeconds(targetPaceSeconds + recoverySeconds);

  return {
    type: 'circle',
    seconds: circleSeconds,
    display: formatTimingSeconds(circleSeconds),
    targetPaceSeconds,
    basis: 'exact_personal_best',
  };
}
