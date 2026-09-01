import type { TrainingInput } from './generator';
import {
  calculateSegmentTiming,
  type PersonalBestTimingReference,
  type SegmentTiming,
} from './training-timing';

export const MAIN_SET_RULE_VERSION = 'main-set-v3';

export type MainSetEvent = {
  raceEvent: string;
  stroke: 'Fr' | 'Ba' | 'Br' | 'Fly' | 'IM';
  raceDistanceM: number;
  personalBest: PersonalBestTimingReference | null;
};

export type MainSetSegment = {
  label: 'Main 1' | 'Main 2';
  raceEvent: string;
  stroke: MainSetEvent['stroke'];
  rounds: number;
  setRestSeconds: number;
  repetitions: number;
  distanceM: number;
  totalM: number;
  intensity: string;
  intensityNumber: string;
  timing: SegmentTiming;
  estimatedDurationSeconds: number;
};

export type MainSetPlan = {
  segments: MainSetSegment[];
  totalM: number;
  requestedDurationMinutes: number;
  estimatedDurationMinutes: number;
  category: string;
  template: string;
  adjustmentNotes: string[];
};

type LevelKey = 'beginner' | 'intermediate' | 'advanced';

const PERIOD_MAIN_STEP: Record<string, number> = {
  '1': 3,
  '2': 4,
  '3': 4,
  '4': 5,
  '5': 6,
  '6': 5,
  '7': 4,
};

const STEP_TO_LABEL: Record<number, string> = {
  1: 'A1',
  2: 'EN1',
  3: 'EN2',
  4: 'EN3',
  5: 'AN1',
  6: 'AN2',
  7: 'MAX',
};

const STEP_TO_NUMBER: Record<number, string> = {
  1: '①',
  2: '②',
  3: '③',
  4: '④',
  5: '⑤',
  6: '⑥',
  7: '⑦',
};

function clampStep(step: number): number {
  return Math.max(1, Math.min(7, step));
}

function getLevelKey(level: string): LevelKey {
  if (level.includes('トップ選手') || level.includes('競技選手')) return 'advanced';
  if (level.includes('フィットネス') || level.includes('初心者')) return 'beginner';
  return 'intermediate';
}

function parseAge(age: string): number {
  const value = Number.parseInt(age, 10);
  if (Number.isFinite(value)) return value;
  if (age.includes('小学生')) return 10;
  if (age.includes('中学生')) return 14;
  if (age.includes('高校生')) return 17;
  if (age.includes('30〜39')) return 35;
  if (age.includes('40歳以上')) return 45;
  if (age.includes('大学生')) return 20;
  return 30;
}

function getAdjustedMainStep(input: TrainingInput): { step: number; notes: string[] } {
  let step = PERIOD_MAIN_STEP[input.period] ?? 4;
  const notes: string[] = [];
  const level = getLevelKey(input.level);
  const age = parseAge(input.age);

  if (input.level.includes('一般スイマー')) {
    step -= 1;
    notes.push('一般スイマーのため強度を1段階調整');
  }
  if (level === 'advanced') step += 1;
  if (level === 'beginner') {
    step -= 2;
    notes.push('初心者・フィットネス層のため強度を2段階調整');
  }
  if (age >= 40) {
    step -= 2;
    notes.push('40歳以上の安全性を優先して強度を2段階調整');
  } else if (age >= 30) {
    step -= 1;
    notes.push('30歳以上の安全性を優先して強度を1段階調整');
  } else if (age <= 12) {
    step -= 2;
    notes.push('小学生の安全性を優先して強度を2段階調整');
  }
  if (input.condition.includes('疲労残り') || input.condition.includes('月経期')) {
    step -= 2;
    notes.push('当日の状態を考慮して強度を2段階調整');
  } else if (input.condition.includes('疲労')) {
    step -= 1;
    notes.push('当日の疲労を考慮して強度を1段階調整');
  }

  return { step: clampStep(step), notes };
}

function repeatDistance(event: MainSetEvent, input: TrainingInput, blockIndex: number): number {
  if (input.generationMode === 'sprint_50m') return blockIndex === 0 ? 25 : 50;
  if (event.raceDistanceM <= 50) return 50;
  if (event.raceDistanceM <= 200) return 100;
  return 200;
}

function fallbackPacePer100(level: string): number {
  const key = getLevelKey(level);
  if (key === 'advanced') return 80;
  if (key === 'beginner') return 135;
  return 105;
}

function estimateSwimSeconds(
  event: MainSetEvent,
  distanceM: number,
  intensityStep: number,
  level: string,
): number {
  if (event.personalBest) {
    const raceSeconds = event.personalBest.timeCentiseconds / 100;
    const pacePerMeter = raceSeconds / event.personalBest.distanceM;
    const paceMultiplier: Record<number, number> = {
      1: 1.65,
      2: 1.45,
      3: 1.3,
      4: 1.18,
      5: 1.1,
      6: 1.04,
      7: 1,
    };
    return Math.ceil(pacePerMeter * distanceM * (paceMultiplier[intensityStep] ?? 1.3));
  }

  // ベストタイム未登録時は、本数算出だけにレベル別の保守的な目安ペースを使います。
  // 表示するサークルは作らず、利用者には従来どおりRestを提示します。
  return Math.ceil(fallbackPacePer100(level) * distanceM / 100);
}

function formatTiming(timing: SegmentTiming): string {
  return timing.type === 'circle'
    ? `サークル ${timing.display}`
    : `Rest ${timing.display}`;
}

function deriveCategory(step: number, generationMode: TrainingInput['generationMode']): string {
  if (generationMode === 'sprint_50m') return step >= 5 ? '50mスピード' : '50mテクニック';
  if (step <= 2) return 'フォーム・リカバリー';
  if (step === 3) return '有酸素ベース';
  if (step === 4) return 'スピード持久力';
  if (step === 5) return 'ベストアベレージ';
  if (step === 6) return '耐乳酸';
  return '最大速度';
}

function buildSegment(args: {
  event: MainSetEvent;
  label: MainSetSegment['label'];
  budgetSeconds: number;
  intensityStep: number;
  input: TrainingInput;
  blockIndex: number;
}): MainSetSegment {
  const { event, label, budgetSeconds, input, blockIndex } = args;
  const intensityStep = clampStep(args.intensityStep);
  const distanceM = repeatDistance(event, input, blockIndex);
  const intensity = STEP_TO_LABEL[intensityStep];
  // 強度がA1まで下がった後も安全調整が実際のRestへ反映されるよう、回復時間を別に加算します。
  const ageRecoverySeconds = parseAge(input.age) >= 40 ? 10 : 0;
  const secondaryFlyRecoverySeconds = label === 'Main 2' && event.stroke === 'Fly' ? 10 : 0;
  const recoveryAdjustmentSeconds = ageRecoverySeconds + secondaryFlyRecoverySeconds;
  const timing = calculateSegmentTiming({
    blockType: 'main',
    mPerSet: distanceM,
    intensity,
    level: input.level,
    context: {
      personalBest: event.personalBest,
      generationMode: input.generationMode,
      recoveryAdjustmentSeconds,
    },
  });
  const swimSeconds = estimateSwimSeconds(event, distanceM, intensityStep, input.level);
  const cycleSeconds = timing.type === 'circle'
    ? timing.seconds
    : swimSeconds + timing.seconds;
  const maxRepetitions = distanceM <= 50 ? 20 : distanceM <= 100 ? 16 : 10;
  const initialRepetitions = Math.max(2, Math.floor(budgetSeconds / cycleSeconds));
  // Mainを無理に2種類へ分割せず、長時間の場合は同じ目的の複数setとしてまとめます。
  const rounds = Math.max(1, Math.ceil(initialRepetitions / maxRepetitions));
  const setRestSeconds = rounds > 1 ? 60 : 0;
  const repetitionBudgetSeconds = Math.max(
    cycleSeconds * 2,
    budgetSeconds - (rounds - 1) * setRestSeconds,
  );
  const rawRepetitions = Math.max(2, Math.floor(repetitionBudgetSeconds / cycleSeconds));
  const repetitions = Math.max(2, Math.floor(rawRepetitions / rounds));

  return {
    label,
    raceEvent: event.raceEvent,
    stroke: event.stroke,
    rounds,
    setRestSeconds,
    repetitions,
    distanceM,
    totalM: rounds * repetitions * distanceM,
    intensity,
    intensityNumber: STEP_TO_NUMBER[intensityStep],
    timing,
    estimatedDurationSeconds:
      rounds * repetitions * cycleSeconds + (rounds - 1) * setRestSeconds,
  };
}

/**
 * custom生成はメインセットだけを対象とし、入力時間内に収まる本数を決定論的に算出します。
 * 距離・本数・強度・サークル/RestをAIに決めさせないことで、生成ごとの数値ぶれを防ぎます。
 */
export function generateMainSetPlan(args: {
  input: TrainingInput;
  primaryEvent: MainSetEvent;
  secondaryEvent?: MainSetEvent | null;
}): MainSetPlan {
  const { input, primaryEvent } = args;
  const durationMinutes = Number.parseInt(input.mainSetTime ?? '30', 10);
  const totalSeconds = durationMinutes * 60;
  const { step: mainStep, notes } = getAdjustedMainStep(input);
  const transitionSeconds = args.secondaryEvent ? 90 : 0;
  const usableSeconds = Math.max(600, totalSeconds - transitionSeconds);

  const segments: MainSetSegment[] = [];
  if (parseAge(input.age) >= 40) {
    notes.push('40歳以上はフォーム維持のため各本の回復を10秒追加');
  }
  if (args.secondaryEvent?.stroke === 'Fly') {
    notes.push('補助種目のバタフライは技術維持のため各本の回復を10秒追加');
  }
  if (args.secondaryEvent) {
    segments.push(buildSegment({
      event: primaryEvent,
      label: 'Main 1',
      budgetSeconds: Math.floor(usableSeconds * 0.6),
      intensityStep: mainStep,
      input,
      blockIndex: 0,
    }));
    segments.push(buildSegment({
      event: args.secondaryEvent,
      label: 'Main 2',
      budgetSeconds: Math.floor(usableSeconds * 0.4),
      intensityStep: Math.max(1, mainStep - 1),
      input,
      blockIndex: 1,
    }));
  } else {
    segments.push(buildSegment({
      event: primaryEvent,
      label: 'Main 1',
      budgetSeconds: usableSeconds,
      intensityStep: mainStep,
      input,
      blockIndex: 0,
    }));
  }

  const totalM = segments.reduce((sum, segment) => sum + segment.totalM, 0);
  const estimatedSeconds = segments.reduce(
    (sum, segment) => sum + segment.estimatedDurationSeconds,
    transitionSeconds,
  );
  const category = deriveCategory(mainStep, input.generationMode);
  const template = segments.map((segment) => {
    const repetitions = `${segment.repetitions}×${segment.distanceM}m`;
    const setDisplay = segment.rounds > 1
      ? `${segment.rounds}set ×（${repetitions}） セット間 Rest ${Math.round(segment.setRestSeconds / 60)}分`
      : repetitions;
    return `${segment.label}（${category}）${segment.stroke} ${setDisplay} ${formatTiming(segment.timing)}（${segment.intensity}）`;
  }).join(' → ');

  if (segments.some((segment) => segment.timing.basis === 'level_fallback')) {
    notes.push('完全一致するベストタイムがない種目はRestで設計');
  }

  return {
    segments,
    totalM,
    requestedDurationMinutes: durationMinutes,
    estimatedDurationMinutes: Math.max(1, Math.round(estimatedSeconds / 60)),
    category,
    template,
    adjustmentNotes: notes,
  };
}
