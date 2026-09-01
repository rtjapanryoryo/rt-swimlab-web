import { expect, test } from '@playwright/test';

import { generateMainSetPlan, type MainSetEvent } from '../src/lib/rt/main-set-generator';
import { calculateSegmentTiming } from '../src/lib/rt/training-timing';
import type { TrainingInput } from '../src/lib/rt/generator';
import { mainSetSegmentsToSheetRows, splitGuidanceItems } from '../src/components/MenuSheet';

const longCourseFr50Best = {
  stroke: 'Fr',
  distanceM: 50,
  poolLength: 'long_course' as const,
  timeCentiseconds: 3000,
};

const baseInput: TrainingInput = {
  period: '2',
  stroke: 'Fr',
  distance: '',
  age: 'マスターズ（30〜39歳）',
  distanceType: '',
  level: '一般スイマー（定期練習 / マスターズ継続）',
  condition: '良好（通常コンディション）',
  practiceTime: '',
  generationMode: 'standard',
  poolLength: 'long_course',
  raceEvent: 'Fr_50',
  raceEvent2: '',
  bestTime: '',
  explanationLevel: 'technical',
  mainSetTime: '30',
};

const primaryEvent: MainSetEvent = {
  raceEvent: 'Fr_50',
  stroke: 'Fr',
  raceDistanceM: 50,
  personalBest: longCourseFr50Best,
};

test('一致する50mベストからEasyとEN1のサークルを算出する', () => {
  const easy = calculateSegmentTiming({
    blockType: 'main',
    mPerSet: 50,
    intensity: 'A1',
    level: baseInput.level,
    context: { personalBest: longCourseFr50Best, generationMode: 'standard' },
  });
  const en1 = calculateSegmentTiming({
    blockType: 'main',
    mPerSet: 50,
    intensity: 'EN1',
    level: baseInput.level,
    context: { personalBest: longCourseFr50Best, generationMode: 'standard' },
  });

  expect(easy).toMatchObject({
    type: 'circle',
    seconds: 65,
    display: '1:05',
    targetPaceSeconds: 50,
    basis: 'exact_personal_best',
  });
  expect(en1).toMatchObject({
    type: 'circle',
    seconds: 60,
    display: '1:00',
    targetPaceSeconds: 44,
    basis: 'exact_personal_best',
  });
});

test('ベスト未登録または高強度では安全側のRestを返す', () => {
  const withoutBest = calculateSegmentTiming({
    blockType: 'main',
    mPerSet: 50,
    intensity: 'EN1',
    level: baseInput.level,
    context: { personalBest: null, generationMode: 'standard' },
  });
  const highIntensity = calculateSegmentTiming({
    blockType: 'main',
    mPerSet: 50,
    intensity: 'AN1',
    level: baseInput.level,
    context: { personalBest: longCourseFr50Best, generationMode: 'standard' },
  });

  expect(withoutBest).toMatchObject({
    type: 'rest',
    seconds: 15,
    display: '15秒',
    basis: 'level_fallback',
  });
  expect(highIntensity).toMatchObject({
    type: 'rest',
    seconds: 45,
    display: '45秒',
    basis: 'level_fallback',
  });
});

test('メイン種目が1つなら30分を1つのMain内の複数setにまとめる', () => {
  const plan = generateMainSetPlan({ input: baseInput, primaryEvent });

  expect(plan.segments).toHaveLength(1);
  expect(plan.segments[0]).toMatchObject({
    label: 'Main 1',
    rounds: 2,
    setRestSeconds: 60,
    repetitions: 14,
    distanceM: 50,
    totalM: 1400,
    intensity: 'EN1',
    timing: { type: 'circle', display: '1:00' },
  });
  expect(plan.template).toContain('2set ×（14×50m） セット間 Rest 1分');
  expect(plan.totalM).toBe(1400);
  expect(plan.requestedDurationMinutes).toBe(30);
  expect(plan.estimatedDurationMinutes).toBe(29);
});

test('メイン種目2を指定した場合だけMainを2つに分ける', () => {
  const secondaryEvent: MainSetEvent = {
    raceEvent: 'Fly_50',
    stroke: 'Fly',
    raceDistanceM: 50,
    personalBest: null,
  };
  const plan = generateMainSetPlan({ input: baseInput, primaryEvent, secondaryEvent });

  expect(plan.segments).toHaveLength(2);
  expect(plan.segments[0]).toMatchObject({
    label: 'Main 1',
    raceEvent: 'Fr_50',
  });
  expect(plan.segments[1]).toMatchObject({
    label: 'Main 2',
    raceEvent: 'Fly_50',
  });
});

test('40歳以上の補助バタフライは回復を確保して本数を抑える', () => {
  const secondaryEvent: MainSetEvent = {
    raceEvent: 'Fly_50m',
    stroke: 'Fly',
    raceDistanceM: 50,
    personalBest: null,
  };
  const input: TrainingInput = {
    ...baseInput,
    period: '3',
    age: 'マスターズ（40歳以上）',
    poolLength: 'short_course',
    raceEvent: 'Fr_100m',
    raceEvent2: 'Fly_50m',
    mainSetTime: '45',
  };
  const fr100: MainSetEvent = {
    raceEvent: 'Fr_100m',
    stroke: 'Fr',
    raceDistanceM: 100,
    personalBest: null,
  };

  const plan = generateMainSetPlan({ input, primaryEvent: fr100, secondaryEvent });

  expect(plan.segments[0]).toMatchObject({
    label: 'Main 1',
    repetitions: 11,
    totalM: 1100,
    timing: { type: 'rest', seconds: 35, display: '35秒' },
  });
  expect(plan.segments[1]).toMatchObject({
    label: 'Main 2',
    repetitions: 11,
    totalM: 550,
    timing: { type: 'rest', seconds: 35, display: '35秒' },
  });
  expect(plan.adjustmentNotes).toContain('40歳以上はフォーム維持のため各本の回復を10秒追加');
  expect(plan.adjustmentNotes).toContain('補助種目のバタフライは技術維持のため各本の回復を10秒追加');
});

test('複数setの表示は総本数と合計距離を保持する', () => {
  const plan = generateMainSetPlan({ input: baseInput, primaryEvent });
  const rows = mainSetSegmentsToSheetRows(plan.segments.map((segment) => ({
    ...segment,
    totalRepetitions: segment.rounds * segment.repetitions,
  })));

  expect(rows).toHaveLength(1);
  expect(rows[0]).toMatchObject({
    section: 'Main 1',
    distance: '50',
    count: '28（14×2set）',
    content: 'セット間 Rest 1分',
    total: '1,400m',
    timing: 'サークル 1:00',
  });
});

test('指導文内の短い用語列挙を別項目へ分割しない', () => {
  expect(splitGuidanceItems([
    '呼吸時に頭を持ち上げない',
    '指定強度を超えず、呼吸・姿勢・キャッチを最後まで再現する',
    'フォームが崩れ始める兆候を見逃さない',
  ].join('\n'))).toEqual([
    '呼吸時に頭を持ち上げない',
    '指定強度を超えず、呼吸・姿勢・キャッチを最後まで再現する',
    'フォームが崩れ始める兆候を見逃さない',
  ]);
});

test('過去形式の長い中黒区切りは3項目として表示する', () => {
  expect(splitGuidanceItems(
    '頭の位置を安定させて前方へ伸びる・肘を高く保って水を捉え続ける・体幹からローリングをつなげる',
  )).toHaveLength(3);
});
