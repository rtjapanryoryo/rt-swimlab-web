/**
 * メニュー骨格生成器
 * - ルールベースで距離・セット構成・強度を決定論的に生成
 * - LLMはコンテンツラベル（ドリル名・パターン名）の充填のみ担当
 * - totalM === targetDist を算術的に保証
 */

import type { TrainingInput } from './generator';

// ============================================================
// 型定義
// ============================================================

export interface SegmentSpec {
  sets: number;
  mPerSet: number;
  totalM: number;       // sets × mPerSet (exact)
  intensity: string;    // EN1, EN2, EN3, AN1, AN2, A1, A2
  intensityNum: string; // ①②③④⑤⑥
  patternPool: string[];
  restHint: string;     // "30sec" / "1:00" 等（プログラム計算・再現性保証）
}

export interface BlockSpec {
  blockType: string;
  segments: SegmentSpec[];
  totalM: number; // exact sum of segments
}

export interface MenuSkeleton {
  input: TrainingInput;
  targetDist: number;
  distanceType: 'S' | 'M' | 'D';

  warmUp: BlockSpec;
  drill: BlockSpec;
  kick: BlockSpec;
  pull: BlockSpec;
  preMain: BlockSpec;
  main: BlockSpec;
  down: BlockSpec;

  hasDive: boolean;
  hasRest: boolean;

  totalM: number; // === targetDist (guaranteed)

  mainCategory: string;
  mainIntensity: string;
  mainIntensityNum: string;
  preMainIntensity: string;
  preMainIntensityNum: string;
  nonMainIntensity: string;
  nonMainIntensityNum: string;

  adjustmentNotes: string[];
}

// ============================================================
// 強度定義
// ============================================================

/**
 * 強度ステップ管理（RT Japan公式定義に準拠）
 * ①=A1/A2  ②=EN1  ③=EN2  ④=EN3  ⑤=AN1  ⑥=AN2  ⑦=MAX
 * ※ A1とA2は同じ①。EN2（③）は別レベルとして独立。
 */
const INTENSITY_STEPS: { label: string; step: number; num: string }[] = [
  { label: 'A1',  step: 1, num: '①' },
  { label: 'A2',  step: 1, num: '①' }, // A1/A2ともに①
  { label: 'EN1', step: 2, num: '②' },
  { label: 'EN2', step: 3, num: '③' },
  { label: 'EN3', step: 4, num: '④' },
  { label: 'EN4', step: 4, num: '④' },
  { label: 'AN1', step: 5, num: '⑤' },
  { label: 'AN2', step: 6, num: '⑥' },
  { label: 'MAX', step: 7, num: '⑦' },
];

const STEP_TO_LABEL: Record<number, string> = { 1: 'A1', 2: 'EN1', 3: 'EN2', 4: 'EN3', 5: 'AN1', 6: 'AN2', 7: 'MAX' };
const STEP_TO_NUM:   Record<number, string> = { 1: '①', 2: '②', 3: '③', 4: '④', 5: '⑤', 6: '⑥', 7: '⑦' };

function stepOf(label: string): number {
  return INTENSITY_STEPS.find(i => i.label === label)?.step ?? 3;
}

function labelOfStep(step: number): string {
  const clamped = Math.max(1, Math.min(7, step));
  return STEP_TO_LABEL[clamped] ?? 'EN1';
}

function numOfStep(step: number): string {
  const clamped = Math.max(1, Math.min(7, step));
  return STEP_TO_NUM[clamped] ?? '③';
}

/**
 * 1セット距離×強度ステップから適切なレスト目安（秒）を計算し文字列で返す。
 * 完全にプログラム側で決定するため LLM に依存しない → 再現性保証。
 */
function computeRestHint(mPerSet: number, intensityStep: number): string {
  const byStep: Record<number, number> = { 1: 15, 2: 15, 3: 20, 4: 30, 5: 45, 6: 60, 7: 90 };
  let rest = byStep[Math.max(1, Math.min(7, intensityStep))] ?? 30;
  // 距離が長いほど絶対タイムが伸びるので休息も追加
  if (mPerSet >= 400) rest += 30;
  else if (mPerSet >= 200) rest += 20;
  else if (mPerSet >= 100) rest += 10;
  if (rest < 60) return `${rest}sec`;
  const mins = Math.floor(rest / 60);
  const secs = rest % 60;
  return secs === 0 ? `${mins}:00` : `${mins}:${String(secs).padStart(2, '0')}`;
}

/**
 * 期ごとのベース強度 [mainStep, nonMainStep]（RT Japan規則書 強度天井表準拠）
 * step1=A1/A2(①)  step2=EN1(②)  step3=EN2(③)  step4=EN3(④)  step5=AN1(⑤)  step6=AN2(⑥)
 * ※ drillStep/kickStep/pullStep は generateMenuSkeleton 内でブロック別に調整
 */
const PERIOD_INTENSITY: Record<string, [number, number]> = {
  '1': [3, 3], // リカバリー:  main③(EN2) non③(EN2)
  '2': [4, 3], // 基礎形成:    main④(EN3) non③(EN2)
  '3': [4, 4], // 発展形成:    main④(EN3) non④(EN3)
  '4': [5, 4], // スピード持久: main⑤(AN1) non④(EN3)
  '5': [6, 4], // 耐乳酸:      main⑥(AN2) non④(EN3)
  '6': [5, 4], // 調整:        main⑤(AN1) non④(EN3)
  '7': [4, 3], // テーパー:    main④(EN3) non③(EN2)
};

function getAdjustedIntensities(
  period: string,
  age: number,
  condition: string
): { mainStep: number; nonMainStep: number; preMainStep: number; notes: string[] } {
  const [baseMain, baseNonMain] = PERIOD_INTENSITY[period] ?? [4, 3];
  const notes: string[] = [];

  let mainStep = baseMain;
  let nonMainStep = baseNonMain;

  // 年齢補正
  if (age <= 12) {
    mainStep = Math.max(1, mainStep - 2);
    nonMainStep = Math.max(1, nonMainStep - 1);
    notes.push('小学生: 強度-2(main), -1(非main)');
  } else if (age >= 40) {
    mainStep = Math.max(1, mainStep - 2);
    nonMainStep = Math.max(1, nonMainStep - 1);
    notes.push('マスターズ: 強度-2(main), -1(非main)');
  } else if (age >= 30) {
    mainStep = Math.max(1, mainStep - 1);
    notes.push('成人: 強度-1(main)');
  }

  // 状況補正
  if (condition.includes('疲労残り') || condition.includes('月経期')) {
    mainStep = Math.max(1, mainStep - 2);
    notes.push(`${condition}: 強度-2(main)`);
  } else if (condition.includes('疲労') || condition.includes('筋疲労')) {
    mainStep = Math.max(1, mainStep - 1);
    notes.push(`${condition}: 強度-1(main)`);
  }

  // Pre-Main は Main より必ず1段階下
  const preMainStep = Math.max(1, mainStep - 1);

  return { mainStep, nonMainStep, preMainStep, notes };
}

// ============================================================
// 距離配分
// ============================================================

interface AllocConfig {
  wupPct: number;   wupMax: number;   wupMin: number;
  drillPct: number;
  kickPct: number;
  pullPct: number;
  preMainPct: number;
  downPct: number;  downMin: number;  downMax: number;
  unit: number;
}

const ALLOC_CONFIG: Record<'S' | 'M' | 'D', AllocConfig> = {
  S: { wupPct: 0.14, wupMax: 500, wupMin: 200, drillPct: 0.13, kickPct: 0.14, pullPct: 0.17, preMainPct: 0.09, downPct: 0.04, downMin: 100, downMax: 200, unit: 25 },
  M: { wupPct: 0.10, wupMax: 500, wupMin: 250, drillPct: 0.12, kickPct: 0.12, pullPct: 0.16, preMainPct: 0.09, downPct: 0.05, downMin: 150, downMax: 250, unit: 50 },
  D: { wupPct: 0.08, wupMax: 500, wupMin: 300, drillPct: 0.11, kickPct: 0.11, pullPct: 0.14, preMainPct: 0.08, downPct: 0.04, downMin: 200, downMax: 300, unit: 100 },
};

function roundToUnit(n: number, unit: number): number {
  return Math.round(n / unit) * unit;
}

interface BlockAlloc {
  warmUp: number; drill: number; kick: number;
  pull: number; preMain: number; main: number; down: number;
}

/**
 * 各ブロックの距離配分を算出。main = targetDist - sum(others) で算術保証。
 * main が unit の倍数にならない場合、pull を ±unit 調整して整合させる。
 */
function allocateBlocks(targetDist: number, distanceType: 'S' | 'M' | 'D'): BlockAlloc {
  const cfg = ALLOC_CONFIG[distanceType];
  const { unit } = cfg;

  const r = (pct: number) => roundToUnit(targetDist * pct, unit);

  let warmUp  = Math.min(Math.max(r(cfg.wupPct),   cfg.wupMin),   cfg.wupMax);
  let drill   = Math.max(r(cfg.drillPct),   unit * 2);
  let kick    = Math.max(r(cfg.kickPct),    unit * 2);
  let pull    = Math.max(r(cfg.pullPct),    unit * 2);
  let preMain = Math.max(r(cfg.preMainPct), unit * 1);
  let down    = Math.min(Math.max(r(cfg.downPct), cfg.downMin), cfg.downMax);

  // warmUp を unit の倍数に揃える
  warmUp = roundToUnit(warmUp, unit);
  down   = roundToUnit(down,   unit);

  const sumFixed = () => warmUp + drill + kick + pull + preMain + down;
  let main = targetDist - sumFixed();

  // main が unit で割り切れるよう pull を調整（最大 ±4unit）
  for (let delta = 0; Math.abs(delta) <= unit * 4; delta += (delta > 0 ? -delta - unit : -delta + unit)) {
    if (main % unit === 0 && main > 0) break;
    pull += unit;
    main = targetDist - sumFixed();
    if (main % unit === 0 && main > 0) break;
    pull -= unit * 2;
    main = targetDist - sumFixed();
    if (main % unit === 0 && main > 0) break;
    pull += unit; // restore
    break;
  }

  // 最終フォールバック: 最小 unit の倍数に切り捨てて main に乗せる
  if (main <= 0 || main % unit !== 0) {
    const fixedFloor = Math.floor(sumFixed() / unit) * unit;
    main = targetDist - fixedFloor;
    const excess = sumFixed() - fixedFloor;
    pull = Math.max(unit, pull - excess);
    main = targetDist - (warmUp + drill + kick + pull + preMain + down);
  }

  if (main < unit) main = unit;

  return { warmUp, drill, kick, pull, preMain, main, down };
}

// ============================================================
// セット構成選択
// ============================================================

interface SetStructure { sets: number; mPerSet: number; }

/** 各ブロック×距離タイプの優先単位（大きい順 = 少ない本数優先） */
const PREFERRED_UNITS: Record<string, Record<'S' | 'M' | 'D', number[]>> = {
  warmUp:  { S: [100, 50, 25],       M: [200, 100, 50],          D: [200, 100]              },
  drill:   { S: [75, 50, 25],        M: [100, 50],                D: [200, 100]              },
  kick:    { S: [75, 50, 25],        M: [100, 50],                D: [200, 100]              },
  pull:    { S: [100, 75, 50, 25],   M: [200, 150, 100, 50],     D: [400, 200, 100]         },
  preMain: { S: [50, 25],            M: [100, 50],                D: [200, 100]              },
  main:    { S: [75, 50, 25],        M: [200, 150, 100, 50],     D: [400, 300, 200, 100]    },
  down:    { S: [100, 50, 25],       M: [200, 150, 100, 50],     D: [300, 200, 100]         },
};

/** ベース単位（距離タイプ別）。すべてのブロック距離はこの倍数になる。 */
const BASE_UNIT: Record<'S' | 'M' | 'D', number> = { S: 25, M: 50, D: 100 };

/** ブロック種別ごとの最大セット数（過剰本数による品質低下を防止） */
const MAX_SETS_PER_BLOCK: Record<string, number> = {
  warmUp: 20, drill: 8, kick: 10, pull: 8, preMain: 6, main: 10, down: 20,
};

/**
 * 1つのブロック距離を1-2セグメントに分解。
 * - 優先単位（大→小）で割り切れる最初の値を選ぶ（本数少ない=質優先）
 * - 割り切れない場合は baseUnit で網羅探索（sets * mPerSet = totalM を保証）
 * - allowTwoSegments=true のとき2分割も試みる
 */
function findSetStructures(
  totalM: number,
  blockType: string,
  distanceType: 'S' | 'M' | 'D',
  allowTwoSegments = false
): SetStructure[] {
  const preferred = PREFERRED_UNITS[blockType]?.[distanceType] ?? [50, 25];
  const baseUnit = BASE_UNIT[distanceType];
  const maxSets = MAX_SETS_PER_BLOCK[blockType] ?? 12;

  // 優先単位でブロック別最大本数以内を探す
  for (const unit of preferred) {
    if (totalM % unit === 0) {
      const sets = totalM / unit;
      if (sets >= 2 && sets <= maxSets) return [{ sets, mPerSet: unit }];
    }
  }

  // 2セグメント分割（allowTwoSegments=true）
  if (allowTwoSegments) {
    for (const ratio of [0.5, 0.4, 0.6, 0.33, 0.67]) {
      const seg1M = roundToUnit(totalM * ratio, baseUnit);
      const seg2M = totalM - seg1M;
      if (seg1M < baseUnit || seg2M < baseUnit) continue;
      const s1 = findSingleSegment(seg1M, preferred, baseUnit, maxSets);
      const s2 = findSingleSegment(seg2M, preferred, baseUnit, maxSets);
      if (s1 && s2) return [s1, s2];
    }
  }

  // baseUnit で全列挙（maxSets 上限付き。必ず sets * mPerSet = totalM を保証）
  for (let unit = preferred[preferred.length - 1] ?? baseUnit; unit >= baseUnit; unit -= baseUnit) {
    if (totalM % unit === 0) {
      const sets = totalM / unit;
      if (sets >= 2 && sets <= maxSets) return [{ sets, mPerSet: unit }];
    }
  }

  // 絶対フォールバック: 1セット（正確さを最優先）
  return [{ sets: 1, mPerSet: totalM }];
}

/** 単一セグメントを探す（2分割用ヘルパー） */
function findSingleSegment(totalM: number, preferred: number[], baseUnit: number, maxSets = 12): SetStructure | null {
  for (const unit of preferred) {
    if (totalM % unit === 0) {
      const sets = totalM / unit;
      if (sets >= 2 && sets <= maxSets) return { sets, mPerSet: unit };
    }
  }
  // baseUnit で網羅
  for (let unit = preferred[preferred.length - 1] ?? baseUnit; unit >= baseUnit; unit -= baseUnit) {
    if (totalM % unit === 0) {
      const sets = totalM / unit;
      if (sets >= 2 && sets <= maxSets) return { sets, mPerSet: unit };
    }
  }
  return null;
}

// ============================================================
// パターンプール
// ============================================================

const PATTERN_POOLS: Record<string, Record<string, string[]>> = {
  warmUp: {
    default: ['SKPS', 'IM Order', 'Variable', 'Des', 'Build'],
    technique: ['SKPS', 'IM Order', 'Variable'],
    speed: ['Build', 'Des', 'Variable'],
  },
  drill: {
    Fr:  ['odd: 片手左 / even: 片手右', 'odd: キャッチアップ / even: 片手', 'Form & Des', 'ヘッドアップ / キャッチアップ'],
    Ba:  ['odd: 片手左 / even: 片手右', 'odd: ドリル / even: Swim', 'Form & Des'],
    Br:  ['Brキックドリル / Brプルドリル', 'タイミングドリル', '2キック1プル', 'Brキック（Fin）'],
    Fly: ['片キック（左）/ 片キック（右）', 'ドルフィンキック', 'ショルダードリル', '1キック1プル'],
    IM:  ['4泳法ドリル順（Fr→Ba→Br→Fly）', 'odd: IM Order / even: 専門種目', 'Form & Des'],
    S1:  ['専門種目ドリル', 'Form & Des', 'odd: ドリル / even: Swim'],
  },
  kick: {
    default: ['Des', '1-4 Dec', 'Fins 交互', 'good kick', 'Des（後半Fins）'],
    advanced: ['1-4 Dec 5 Hard Alt', 'Des（後半Fins）', 'Fins', 'good kick'],
  },
  pull: {
    default:  ['DPS', 'Negative split', 'Des', 'o:Fast e:Easy', 'Variable'],
    advanced: ['Negative split', 'Form & Des 1→4', 'o:Fast e:Easy', 'Variable'],
  },
  preMain: {
    default: ['Des（レースペース確認）', 'Negative split', 'レースペース', 'Build up'],
  },
  main: {
    base:      ['Standard Main', 'ベースメイン'],
    middle:    ['ベストアベレージ', 'Negative split', 'Des'],
    advanced:  ['ベストアベレージ', '1H/1E Alt', 'Negative split'],
    lactic:    ['耐乳酸MAX', 'ダイハード', '1H/1E Alt'],
    taper:     ['ベストアベレージ', 'Variable', 'Des'],
  },
};

function getPatternPool(blockType: string, period: string, stroke?: string): string[] {
  switch (blockType) {
    case 'warmUp': {
      const p = parseInt(period);
      if (p <= 2) return PATTERN_POOLS.warmUp.technique;
      if (p >= 6) return PATTERN_POOLS.warmUp.speed;
      return PATTERN_POOLS.warmUp.default;
    }
    case 'drill': {
      const sk = stroke ?? 'Fr';
      return PATTERN_POOLS.drill[sk] ?? PATTERN_POOLS.drill.Fr;
    }
    case 'kick':
      return parseInt(period) >= 4 ? PATTERN_POOLS.kick.advanced : PATTERN_POOLS.kick.default;
    case 'pull':
      return parseInt(period) >= 3 ? PATTERN_POOLS.pull.advanced : PATTERN_POOLS.pull.default;
    case 'preMain':
      return PATTERN_POOLS.preMain.default;
    case 'main': {
      const p = parseInt(period);
      if (p === 5) return PATTERN_POOLS.main.lactic;
      if (p === 7) return PATTERN_POOLS.main.taper;
      if (p >= 4) return PATTERN_POOLS.main.advanced;
      if (p >= 3) return PATTERN_POOLS.main.middle;
      return PATTERN_POOLS.main.base;
    }
    default: return ['Standard'];
  }
}

// ============================================================
// Mainカテゴリ（実際の調整済み強度ステップで決定）
// ============================================================

function deriveMainCategory(period: string, distanceType: 'S' | 'M' | 'D', actualMainStep: number): string {
  if (actualMainStep <= 1) return 'Standard Main';                            // A1: 完全リカバリー
  if (actualMainStep <= 2) return 'Standard Main';                            // A2
  if (actualMainStep === 3) return 'ベースメイン';                             // EN1
  if (actualMainStep === 4) {                                                  // EN3
    const p = parseInt(period);
    if (p >= 6) return 'ベストアベレージ';
    if (p >= 3) return 'ベースメイン';
    return 'ベースメイン';
  }
  if (actualMainStep === 5) {                                                  // AN1
    const p = parseInt(period);
    if (p === 5) return distanceType === 'D' ? 'ダイハード' : 'ベストアベレージ';
    return 'ベストアベレージ';
  }
  if (actualMainStep === 6) return '耐乳酸MAX';                               // AN2
  return 'ダイハード';                                                          // MAX
}

// ============================================================
// BlockSpec 構築
// ============================================================

function buildBlockSpec(
  targetM: number,
  blockType: string,
  distanceType: 'S' | 'M' | 'D',
  intensityStep: number,
  period: string,
  stroke?: string,
  twoSegments?: boolean
): BlockSpec {
  const needsTwoSeg = twoSegments ?? (['kick', 'pull'].includes(blockType) && parseInt(period) >= 3);
  const structs = findSetStructures(targetM, blockType, distanceType, needsTwoSeg);
  const patternPool = getPatternPool(blockType, period, stroke);

  if (structs.length === 1 || ['warmUp', 'down', 'preMain'].includes(blockType)) {
    const seg = structs[0];
    const actualM = seg.sets * seg.mPerSet; // guaranteed exact when divisor found
    return {
      blockType,
      segments: [{
        sets: seg.sets,
        mPerSet: seg.mPerSet,
        totalM: actualM,
        intensity: labelOfStep(intensityStep),
        intensityNum: numOfStep(intensityStep),
        patternPool,
        restHint: computeRestHint(seg.mPerSet, intensityStep),
      }],
      totalM: actualM, // use actual, not targetM
    };
  }

  // 2セグメント: 1セグ目は基本強度、2セグ目は+1ステップ
  const step2 = Math.min(7, intensityStep + 1);
  const seg1Actual = structs[0].sets * structs[0].mPerSet;
  const seg2Actual = structs[1].sets * structs[1].mPerSet;

  return {
    blockType,
    segments: [
      {
        sets: structs[0].sets, mPerSet: structs[0].mPerSet, totalM: seg1Actual,
        intensity: labelOfStep(intensityStep), intensityNum: numOfStep(intensityStep),
        patternPool: patternPool.slice(0, 2),
        restHint: computeRestHint(structs[0].mPerSet, intensityStep),
      },
      {
        sets: structs[1].sets, mPerSet: structs[1].mPerSet, totalM: seg2Actual,
        intensity: labelOfStep(step2), intensityNum: numOfStep(step2),
        patternPool: patternPool.slice(2, 4).length ? patternPool.slice(2, 4) : patternPool.slice(0, 2),
        restHint: computeRestHint(structs[1].mPerSet, step2),
      },
    ],
    totalM: seg1Actual + seg2Actual,
  };
}

// ============================================================
// メイン：骨格生成
// ============================================================

export function generateMenuSkeleton(input: TrainingInput): MenuSkeleton {
  const targetDist = parseInt(input.distance, 10);
  const ageNum = parseInt(input.age, 10) || 20;
  const dt = (['S', 'M', 'D'].includes(input.distanceType) ? input.distanceType : 'M') as 'S' | 'M' | 'D';

  const { mainStep, nonMainStep, preMainStep, notes } = getAdjustedIntensities(input.period, ageNum, input.condition);

  const alloc = allocateBlocks(targetDist, dt);

  // 合計検証（バグ検出用）
  const allocTotal = alloc.warmUp + alloc.drill + alloc.kick + alloc.pull + alloc.preMain + alloc.main + alloc.down;
  if (allocTotal !== targetDist) {
    // 差分を main に吸収（フォールバック）
    alloc.main += targetDist - allocTotal;
  }

  /**
   * ブロック別強度の設計思想（W-up直後にいきなり高強度にしない）
   *  W-up  : ① (A1) 固定
   *  Drill : max ② (EN1) 固定 — 技術ドリルは常に軽め（フォーム崩さない）
   *  Kick  : max ③ (EN2) — ストロークより軽く補助的（コーチ思想9番）
   *  Pull  : nonMainStep の天井 — メインへの橋渡し
   *  PreMain: mainStep - 1 — メインへの導入
   *  Main  : mainStep（最大強度）
   *  Down  : ① 固定
   */
  const drillStep = Math.min(nonMainStep, 2); // EN1(②) 以下に固定
  const kickStep  = Math.min(nonMainStep, 3); // EN2(③) 以下に固定（ストローク優先思想）
  const pullStep  = nonMainStep;               // Pull は非メイン天井まで

  const warmUp  = buildBlockSpec(alloc.warmUp,   'warmUp',  dt, 1,          input.period, input.stroke, false);
  const drill   = buildBlockSpec(alloc.drill,    'drill',   dt, drillStep,  input.period, input.stroke, false);
  const kick    = buildBlockSpec(alloc.kick,     'kick',    dt, kickStep,   input.period, input.stroke);
  const pull    = buildBlockSpec(alloc.pull,     'pull',    dt, pullStep,   input.period, input.stroke);
  const preMain = buildBlockSpec(alloc.preMain,  'preMain', dt, preMainStep,   input.period, input.stroke, false);

  // 非Mainブロックの実際の合計でMainを確定（算術保証の核心）
  const nonMainSum = warmUp.totalM + drill.totalM + kick.totalM + pull.totalM + preMain.totalM;
  // downはalloc値をそのまま使い、mainとdownの差でtargetDistを達成
  const down = buildBlockSpec(alloc.down, 'down', dt, 1, input.period, input.stroke, false);
  const exactMain = targetDist - nonMainSum - down.totalM;

  // exactMainが正で割り切れる必要がある。割り切れない場合はdownを微調整
  const baseUnit = BASE_UNIT[dt];
  let adjustedExactMain = exactMain;
  let adjustedDown = down;
  if (exactMain % baseUnit !== 0 || exactMain <= 0) {
    // downを±baseUnit調整してexactMainをbaseUnitの倍数にする
    const rawDownM = down.totalM;
    for (const delta of [baseUnit, -baseUnit, baseUnit * 2, -baseUnit * 2]) {
      const newDownM = rawDownM + delta;
      const newMain = targetDist - nonMainSum - newDownM;
      if (newMain > 0 && newMain % baseUnit === 0 && newDownM > 0) {
        adjustedDown = buildBlockSpec(newDownM, 'down', dt, 1, input.period, input.stroke, false);
        adjustedExactMain = newMain;
        break;
      }
    }
  }

  const main = buildBlockSpec(adjustedExactMain, 'main', dt, mainStep, input.period, input.stroke, parseInt(input.period) >= 4);

  return {
    input,
    targetDist,
    distanceType: dt,

    warmUp, drill, kick, pull, preMain, main, down: adjustedDown,

    hasDive: ['6', '7'].includes(input.period),
    hasRest: input.condition.includes('疲労') || ['4', '5'].includes(input.period),

    totalM: targetDist,

    mainCategory: deriveMainCategory(input.period, dt, mainStep),
    mainIntensity: labelOfStep(mainStep),
    mainIntensityNum: numOfStep(mainStep),
    preMainIntensity: labelOfStep(preMainStep),
    preMainIntensityNum: numOfStep(preMainStep),
    nonMainIntensity: labelOfStep(nonMainStep),
    nonMainIntensityNum: numOfStep(nonMainStep),

    adjustmentNotes: notes,
  };
}

// ============================================================
// テンプレート文字列生成
// ============================================================

/** 骨格からLLM用の「数値固定・ラベル可変」テンプレート文字列を生成 */
export function buildSkeletonTemplateStrings(skeleton: MenuSkeleton): {
  warmUpTemplate: string;
  drillTemplate: string;
  kickTemplate: string;
  pullTemplate: string;
  preMainTemplate: string;
  mainTemplate: string;
  downStr: string;
  totalStr: string;
  diveStr: string;
  restStr: string;
} {
  const dt = skeleton.distanceType;
  const stroke = skeleton.input.stroke;

  // W-up: Cho固定、パターンのみ可変
  const wuSegs = skeleton.warmUp.segments;
  const warmUpTemplate = wuSegs.length === 1
    ? `Cho ${wuSegs[0].totalM}m {WU_PATTERN}（${wuSegs[0].intensity}）`
    : wuSegs.map((s, i) =>
        `Cho ${s.totalM}m {WU_PATTERN_${i + 1}}（${s.intensity}）`
      ).join(' → ');

  // Drill: 種目種別＋ドリル名可変
  const drSegs = skeleton.drill.segments;
  const drillTemplate = drSegs.map((s, i) =>
    `${stroke} {DR_DRILL_${i + 1}} ${s.sets}×${s.mPerSet}m（${s.intensity}）`
  ).join(' → ');

  // Kick: パターン可変
  const kiSegs = skeleton.kick.segments;
  const kickTemplate = kiSegs.map((s, i) =>
    `Kick ${stroke} ${s.sets}×${s.mPerSet}m（{KI_PATTERN_${i + 1}}）（${s.intensity}）`
  ).join(' → ');

  // Pull: 実際の種目、パターン可変（Fr 固定解除）
  const plSegs = skeleton.pull.segments;
  const pullTemplate = plSegs.map((s, i) =>
    `Pull ${stroke} ${s.sets}×${s.mPerSet}m（{PL_PATTERN_${i + 1}}）（${s.intensity}）`
  ).join(' → ');

  // Pre-Main: 種目＋コンテンツ可変（{PM_CONTENT} = レースペース確認・Des 等）
  const pmSegs = skeleton.preMain.segments;
  const preMainTemplate = pmSegs.map((s) =>
    `Pre-Main ${stroke} ${s.sets}×${s.mPerSet}m {PM_CONTENT}（${s.intensity}）`
  ).join(' → ');

  // Main: カテゴリ・rest ともにプログラム確定（LLM は変更不可）
  const maSegs = skeleton.main.segments;
  const mainTemplate = maSegs.map((s, i) => {
    const isFirst = i === 0;
    return isFirst
      ? `Main（${skeleton.mainCategory}）${s.sets}×${s.mPerSet}m @${s.restHint}（${s.intensity}）`
      : `Main ${s.sets}×${s.mPerSet}m @${s.restHint}（${s.intensity}）`;
  }).join(' → ');

  // Down: 固定
  const downStr = `Cho Easy Swim ${skeleton.down.totalM}m（A1）`;

  return {
    warmUpTemplate,
    drillTemplate,
    kickTemplate,
    pullTemplate,
    preMainTemplate,
    mainTemplate,
    downStr,
    totalStr: `合計距離：${skeleton.targetDist.toLocaleString()}m`,
    diveStr: skeleton.hasDive ? `Dive 8×15m（A1）` : '',
    restStr: skeleton.hasRest ? 'Rest / Free time（5~10min）' : '',
  };
}

/** ブロックの全セグメントの totalM 合計（検証用） */
export function sumSkeletonBlocks(skeleton: MenuSkeleton): number {
  const blocks = [skeleton.warmUp, skeleton.drill, skeleton.kick, skeleton.pull, skeleton.preMain, skeleton.main, skeleton.down];
  return blocks.reduce((sum, b) => sum + b.segments.reduce((s, seg) => s + seg.totalM, 0), 0);
}
