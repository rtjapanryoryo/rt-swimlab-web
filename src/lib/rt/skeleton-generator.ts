/**
 * メニュー骨格生成器
 * - ルールベースで距離・セット構成・強度を決定論的に生成
 * - LLMはコンテンツラベル（ドリル名・パターン名）の充填のみ担当
 * - totalM === targetDist を算術的に保証
 * - level (初級/中級/上級) を強度・セット構成・パターンすべてに反映
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
// レベル定義
// ============================================================

type LevelKey = 'beginner' | 'intermediate' | 'advanced';

function getLevelKey(level: string): LevelKey {
  if (level.includes('上級')) return 'advanced';
  if (level.includes('初級')) return 'beginner';
  return 'intermediate';
}

/**
 * レベル別強度補正値とセット構成の方針
 * - beginner (初級): 強度を下げ、短距離多本数で技術反復
 * - intermediate (中級): 基準値そのまま
 * - advanced (上級): 強度+1、長距離少本数でレースペース意識
 */
function getLevelModifiers(level: string): {
  mainAdj: number;
  nonMainAdj: number;
  preferSmallSets: boolean;
  preferLargeSets: boolean;
  key: LevelKey;
  note: string;
} {
  const key = getLevelKey(level);
  switch (key) {
    case 'advanced':
      return { mainAdj: 1, nonMainAdj: 0, preferSmallSets: false, preferLargeSets: true, key, note: '上級: 強度+1(main)' };
    case 'beginner':
      return { mainAdj: -2, nonMainAdj: -1, preferSmallSets: true, preferLargeSets: false, key, note: '初級: 強度-2(main), -1(非main)' };
    default:
      return { mainAdj: 0, nonMainAdj: 0, preferSmallSets: false, preferLargeSets: false, key, note: '' };
  }
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
 * 設計基準: 中級選手（育成クラス〜県大会）
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
  condition: string,
  level: string,
): { mainStep: number; nonMainStep: number; preMainStep: number; notes: string[] } {
  const [baseMain, baseNonMain] = PERIOD_INTENSITY[period] ?? [4, 3];
  const notes: string[] = [];

  let mainStep = baseMain;
  let nonMainStep = baseNonMain;

  // ─── レベル補正（最優先・年齢/状況より先に適用）───
  const lm = getLevelModifiers(level);
  if (lm.note) notes.push(lm.note);
  mainStep    = Math.max(1, Math.min(7, mainStep    + lm.mainAdj));
  nonMainStep = Math.max(1, Math.min(7, nonMainStep + lm.nonMainAdj));

  // ─── 年齢補正 ───
  if (age <= 12) {
    mainStep    = Math.max(1, mainStep    - 2);
    nonMainStep = Math.max(1, nonMainStep - 1);
    notes.push('小学生: 強度-2(main), -1(非main)');
  } else if (age >= 40) {
    mainStep    = Math.max(1, mainStep    - 2);
    nonMainStep = Math.max(1, nonMainStep - 1);
    notes.push('マスターズ: 強度-2(main), -1(非main)');
  } else if (age >= 30) {
    mainStep    = Math.max(1, mainStep    - 1);
    notes.push('成人: 強度-1(main)');
  }

  // ─── 状況補正 ───
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
  S: { wupPct: 0.14, wupMax: 500, wupMin: 200, drillPct: 0.13, kickPct: 0.14, pullPct: 0.17, preMainPct: 0.09, downPct: 0.06, downMin: 200, downMax: 300, unit: 25 },
  M: { wupPct: 0.10, wupMax: 500, wupMin: 250, drillPct: 0.12, kickPct: 0.12, pullPct: 0.16, preMainPct: 0.09, downPct: 0.06, downMin: 200, downMax: 300, unit: 50 },
  D: { wupPct: 0.08, wupMax: 500, wupMin: 300, drillPct: 0.11, kickPct: 0.11, pullPct: 0.14, preMainPct: 0.08, downPct: 0.05, downMin: 200, downMax: 400, unit: 100 },
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

/**
 * 有効なセット単位かチェック
 * ルール: 25m・50m はOK。それ以降は 100m 単位のみ（75m・150m・250m は禁止）
 */
function isValidSetUnit(unit: number): boolean {
  if (unit === 25 || unit === 50) return true;
  if (unit > 50) return unit % 100 === 0;
  return false;
}

/**
 * 各ブロック×距離タイプの優先単位（大きい順 = 少ない本数優先）
 * 上級はこのまま（長距離少本数）。初級は配列を逆順にして短距離多本数を優先。
 * ルール: 25・50m はOK。それ以降は100m単位のみ（75m・150m・250m禁止）
 */
const PREFERRED_UNITS: Record<string, Record<'S' | 'M' | 'D', number[]>> = {
  warmUp:  { S: [100, 50, 25],   M: [200, 100, 50],     D: [200, 100]           },
  drill:   { S: [50, 25],        M: [100, 50],           D: [200, 100]           },
  kick:    { S: [50, 25],        M: [100, 50],           D: [200, 100]           },
  pull:    { S: [100, 50, 25],   M: [200, 100, 50],      D: [400, 200, 100]      },
  preMain: { S: [50, 25],        M: [100, 50],           D: [200, 100]           },
  main:    { S: [100, 50, 25],   M: [200, 100, 50],      D: [400, 300, 200, 100] },
  down:    { S: [100, 50, 25],   M: [200, 100, 50],      D: [300, 200, 100]      },
};

/** ベース単位（距離タイプ別）。すべてのブロック距離はこの倍数になる。 */
const BASE_UNIT: Record<'S' | 'M' | 'D', number> = { S: 25, M: 50, D: 100 };

/** ブロック種別ごとの最大セット数（過剰本数による品質低下を防止） */
const MAX_SETS_PER_BLOCK: Record<string, number> = {
  warmUp: 20, drill: 8, kick: 10, pull: 8, preMain: 6, main: 10, down: 20,
};

/**
 * 1つのブロック距離を1-2セグメントに分解。
 * - preferSmallSets=true (初級) の場合、優先単位配列を逆順にして短距離多本数を優先
 * - preferLargeSets=true (上級) の場合、デフォルトの大→小順で長距離少本数を優先
 */
function findSetStructures(
  totalM: number,
  blockType: string,
  distanceType: 'S' | 'M' | 'D',
  allowTwoSegments = false,
  preferSmallSets = false,
): SetStructure[] {
  const rawPreferred = PREFERRED_UNITS[blockType]?.[distanceType] ?? [50, 25];
  // 初級: 小→大の順（短距離多本数）で検索
  const preferred = preferSmallSets ? [...rawPreferred].reverse() : rawPreferred;
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

  // baseUnit で全列挙（maxSets 上限付き・無効単位は除外）
  const searchOrder = preferSmallSets
    ? Array.from({ length: Math.floor(totalM / baseUnit) }, (_, i) => baseUnit * (i + 1))
        .filter(u => totalM % u === 0 && isValidSetUnit(u))
    : Array.from({ length: Math.floor(totalM / baseUnit) }, (_, i) => totalM - baseUnit * i)
        .filter(u => u >= baseUnit && totalM % u === 0 && isValidSetUnit(u));
  for (const unit of searchOrder) {
    const sets = totalM / unit;
    if (sets >= 2 && sets <= maxSets) return [{ sets, mPerSet: unit }];
  }

  // 絶対フォールバック: 1セット（正確さを最優先）
  return [{ sets: 1, mPerSet: totalM }];
}

/** 単一セグメントを探す（2分割用ヘルパー） */
function findSingleSegment(totalM: number, preferred: number[], baseUnit: number, maxSets = 12): SetStructure | null {
  for (const unit of preferred) {
    if (isValidSetUnit(unit) && totalM % unit === 0) {
      const sets = totalM / unit;
      if (sets >= 2 && sets <= maxSets) return { sets, mPerSet: unit };
    }
  }
  // baseUnit で網羅（有効単位のみ）
  const minUnit = preferred[preferred.length - 1] ?? baseUnit;
  for (let unit = Math.max(minUnit, baseUnit); unit >= baseUnit; unit -= baseUnit) {
    if (isValidSetUnit(unit) && totalM % unit === 0) {
      const sets = totalM / unit;
      if (sets >= 2 && sets <= maxSets) return { sets, mPerSet: unit };
    }
  }
  return null;
}

// ============================================================
// パターンプール（レベル × 4泳法 × ブロック種別）
// ============================================================

/** ドリルプール: 4泳法 × レベル別 */
const DRILL_POOLS: Record<string, Record<LevelKey, string[]>> = {
  Fr: {
    beginner:     ['キャッチアップ / 片手右', 'ヘッドアップ / キャッチアップ', '片手左右交互'],
    intermediate: ['odd: 片手左 / even: 片手右', 'odd: キャッチアップ / even: 片手', 'Form & Des', 'ヘッドアップ / キャッチアップ'],
    advanced:     ['ハイエルボー / フィスト', 'Form & Des 1→4', 'odd: 片手左 / even: 片手右', 'フィンガーティップ / キャッチアップ'],
  },
  Ba: {
    beginner:     ['片手左 / 片手右（基本）', '片手スイム（丁寧に）', 'スカーリング基礎'],
    intermediate: ['odd: 片手左 / even: 片手右', 'odd: ドリル / even: Swim', 'Form & Des'],
    advanced:     ['片手 + ローリング強調', 'スカーリング → Swim 交互', 'Form & Des 1→4'],
  },
  Br: {
    beginner:     ['Brキックドリル / Brプルドリル', '2キック1プル（ゆっくり）', '分離キック（壁キック）'],
    intermediate: ['Brキックドリル / Brプルドリル', 'タイミングドリル', '2キック1プル', 'Brキック（Fin）'],
    advanced:     ['水平キックドリル / タイミング', '2キック1プル → Swim 交互', 'プルアウト強調 + タイミング', 'Brキック（Fin）→ タイミング'],
  },
  Fly: {
    beginner:     ['ドルフィンキック（壁あり）/ 片キック左', '1キック1プル（ゆっくり）', 'Fly基本ドリル（呼吸なし）'],
    intermediate: ['片キック（左）/ 片キック（右）', 'ドルフィンキック', 'ショルダードリル', '1キック1プル'],
    advanced:     ['ショルダードリル → Swim 交互', '1キック1プル → 2キック1プル', 'ドルフィン + ハイエルボー', 'Form & Des 1→4'],
  },
  IM: {
    beginner:     ['4泳法キックドリル（易→難）', '4泳法プルドリル基本', 'IM基本ドリル順'],
    intermediate: ['4泳法ドリル順（Fr→Ba→Br→Fly）', 'odd: IM Order / even: 専門種目', 'Form & Des'],
    advanced:     ['4泳法ドリル（弱点種目強調）', 'odd: IM Order / even: 専門種目 +強度', 'Form & Des 1→4'],
  },
  S1: {
    beginner:     ['専門種目ドリル基本', 'Form（フォーム確認）', 'odd: ドリル / even: Easy Swim'],
    intermediate: ['専門種目ドリル', 'Form & Des', 'odd: ドリル / even: Swim'],
    advanced:     ['専門種目ドリル（強度付き）', 'Form & Des 1→4', 'odd: ドリル / even: Swim'],
  },
};

/** キックプール: レベル別 */
const KICK_POOLS: Record<LevelKey, string[]> = {
  beginner:     ['Des（フォーム優先）', 'good kick', 'Fins（基本キック）', 'Des（ゆっくり丁寧に）'],
  intermediate: ['Des', '1-4 Dec', 'Fins 交互', 'good kick', 'Des（後半Fins）'],
  advanced:     ['1-4 Dec 5 Hard Alt', 'Des（後半Fins）', 'Fins', 'good kick', 'odd: Hard / even: Easy'],
};

/** プルプール: レベル別 */
const PULL_POOLS: Record<LevelKey, string[]> = {
  beginner:     ['DPS（丁寧に）', 'Des（フォーム優先）', 'Easy Pull（ストローク感覚）', 'Build'],
  intermediate: ['DPS', 'Negative split', 'Des', 'o:Fast e:Easy', 'Variable'],
  advanced:     ['Negative split', 'Form & Des 1→4', 'o:Fast e:Easy', 'Variable', 'ベストアベレージ'],
};

/** メインプール: 期 × レベル別 */
const MAIN_POOLS: Record<string, Record<LevelKey, string[]>> = {
  lactic: {  // 期5
    beginner:     ['Standard Main', 'ベースメイン'],
    intermediate: ['耐乳酸MAX', 'ダイハード', '1H/1E Alt'],
    advanced:     ['耐乳酸MAX', 'ダイハード', '1H/1E Alt'],
  },
  taper: {   // 期7
    beginner:     ['Standard Main', 'Des'],
    intermediate: ['ベストアベレージ', 'Variable', 'Des'],
    advanced:     ['ベストアベレージ', 'Variable', 'Des'],
  },
  high: {    // 期4, 6
    beginner:     ['ベースメイン', 'Standard Main'],
    intermediate: ['ベストアベレージ', 'Negative split', 'Des'],
    advanced:     ['ベストアベレージ', '1H/1E Alt', 'Negative split'],
  },
  middle: {  // 期3
    beginner:     ['Standard Main', 'ベースメイン'],
    intermediate: ['ベースメイン', 'ベストアベレージ', 'Negative split'],
    advanced:     ['ベストアベレージ', 'Negative split', 'Des'],
  },
  base: {    // 期1, 2
    beginner:     ['Standard Main', 'Easy Main'],
    intermediate: ['Standard Main', 'ベースメイン'],
    advanced:     ['ベースメイン', 'Negative split', 'Des'],
  },
};

/** W-upプール: レベル × 期別 */
const WARMUP_POOLS: Record<LevelKey, Record<string, string[]>> = {
  beginner: {
    technique: ['Des（ゆっくり）', 'Build（丁寧に）', 'SKPS基本'],
    speed:     ['Des', 'Build', 'SKPS基本'],
    default:   ['Des', 'Build', 'SKPS基本'],
  },
  intermediate: {
    technique: ['SKPS', 'IM Order', 'Variable'],
    speed:     ['Build', 'Des', 'Variable'],
    default:   ['SKPS', 'IM Order', 'Variable', 'Des', 'Build'],
  },
  advanced: {
    technique: ['SKPS', 'IM Order', 'Variable', 'Des 1→4'],
    speed:     ['Build', 'Des 1→4', 'Variable', 'SKPS'],
    default:   ['SKPS', 'IM Order', 'Variable', 'Build', 'Des 1→4'],
  },
};

function getPatternPool(
  blockType: string,
  period: string,
  stroke: string,
  level: string,
): string[] {
  const lk = getLevelKey(level);
  const p = parseInt(period);

  switch (blockType) {
    case 'warmUp': {
      const category = p <= 2 ? 'technique' : p >= 6 ? 'speed' : 'default';
      return WARMUP_POOLS[lk][category];
    }
    case 'drill': {
      // IM, S1, または4泳法のいずれか
      const sk = Object.keys(DRILL_POOLS).includes(stroke) ? stroke : 'S1';
      return DRILL_POOLS[sk][lk];
    }
    case 'kick':
      return KICK_POOLS[lk];
    case 'pull':
      return PULL_POOLS[lk];
    case 'preMain':
      // preMainはレベル問わず同一（期別のみ）
      return ['Des（レースペース確認）', 'Negative split', 'レースペース', 'Build up'];
    case 'main': {
      let cat: string;
      if (p === 5) cat = 'lactic';
      else if (p === 7) cat = 'taper';
      else if (p >= 4) cat = 'high';
      else if (p >= 3) cat = 'middle';
      else cat = 'base';
      return MAIN_POOLS[cat][lk];
    }
    default: return ['Standard'];
  }
}

// ============================================================
// Mainカテゴリ（実際の調整済み強度ステップで決定）
// ============================================================

function deriveMainCategory(period: string, distanceType: 'S' | 'M' | 'D', actualMainStep: number): string {
  if (actualMainStep <= 2) return 'Standard Main';                            // A1/A2/EN1
  if (actualMainStep === 3) return 'ベースメイン';                             // EN2
  if (actualMainStep === 4) {                                                  // EN3
    const p = parseInt(period);
    if (p >= 6) return 'ベストアベレージ';
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
  stroke: string,
  level: string,
  twoSegments?: boolean,
): BlockSpec {
  const lm = getLevelModifiers(level);
  const needsTwoSeg = twoSegments ?? (['kick', 'pull'].includes(blockType) && parseInt(period) >= 3);
  const structs = findSetStructures(targetM, blockType, distanceType, needsTwoSeg, lm.preferSmallSets);
  const patternPool = getPatternPool(blockType, period, stroke, level);

  if (structs.length === 1 || ['warmUp', 'down', 'preMain'].includes(blockType)) {
    const seg = structs[0];
    const actualM = seg.sets * seg.mPerSet;
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
      totalM: actualM,
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

  const { mainStep, nonMainStep, preMainStep, notes } = getAdjustedIntensities(
    input.period, ageNum, input.condition, input.level,
  );

  const alloc = allocateBlocks(targetDist, dt);

  // 合計検証（バグ検出用）
  const allocTotal = alloc.warmUp + alloc.drill + alloc.kick + alloc.pull + alloc.preMain + alloc.main + alloc.down;
  if (allocTotal !== targetDist) {
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

  const level = input.level;

  const warmUp  = buildBlockSpec(alloc.warmUp,   'warmUp',  dt, 1,           input.period, input.stroke, level, false);
  const drill   = buildBlockSpec(alloc.drill,    'drill',   dt, drillStep,   input.period, input.stroke, level, false);
  const kick    = buildBlockSpec(alloc.kick,     'kick',    dt, kickStep,    input.period, input.stroke, level);
  const pull    = buildBlockSpec(alloc.pull,     'pull',    dt, pullStep,    input.period, input.stroke, level);
  const preMain = buildBlockSpec(alloc.preMain,  'preMain', dt, preMainStep, input.period, input.stroke, level, false);

  // 非Mainブロックの実際の合計でMainを確定（算術保証の核心）
  const nonMainSum = warmUp.totalM + drill.totalM + kick.totalM + pull.totalM + preMain.totalM;
  const down = buildBlockSpec(alloc.down, 'down', dt, 1, input.period, input.stroke, level, false);
  const exactMain = targetDist - nonMainSum - down.totalM;

  // exactMainが正で割り切れる必要がある。割り切れない場合はdownを微調整
  const baseUnit = BASE_UNIT[dt];
  let adjustedExactMain = exactMain;
  let adjustedDown = down;
  if (exactMain % baseUnit !== 0 || exactMain <= 0) {
    const rawDownM = down.totalM;
    for (const delta of [baseUnit, -baseUnit, baseUnit * 2, -baseUnit * 2]) {
      const newDownM = rawDownM + delta;
      const newMain = targetDist - nonMainSum - newDownM;
      if (newMain > 0 && newMain % baseUnit === 0 && newDownM > 0) {
        adjustedDown = buildBlockSpec(newDownM, 'down', dt, 1, input.period, input.stroke, level, false);
        adjustedExactMain = newMain;
        break;
      }
    }
  }

  const main = buildBlockSpec(
    adjustedExactMain, 'main', dt, mainStep, input.period, input.stroke, level,
    parseInt(input.period) >= 4,
  );

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

/**
 * Pull ブロックで使う種目を返す（バタフライ種目の飽き・疲労対策）
 * - Fly → Pull Fr（有酸素ベース補強・変化つける）
 * - Ba  → Pull Ba（バックストロークの腕力補強）
 * - その他 → 専門種目そのまま
 */
function getPullStroke(stroke: string): string {
  if (stroke === 'Fly') return 'Fr';
  return stroke;
}

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
  const stroke = skeleton.input.stroke;
  const pullStroke = getPullStroke(stroke); // Fly → Fr

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

  // Pull: Fly は Fr に変更して変化をつける（飽き・疲労対策）
  const plSegs = skeleton.pull.segments;
  const pullTemplate = plSegs.map((s, i) =>
    `Pull ${pullStroke} ${s.sets}×${s.mPerSet}m（{PL_PATTERN_${i + 1}}）（${s.intensity}）`
  ).join(' → ');

  // Pre-Main
  const pmSegs = skeleton.preMain.segments;
  const preMainTemplate = pmSegs.map((s) =>
    `Pre-Main ${stroke} ${s.sets}×${s.mPerSet}m {PM_CONTENT}（${s.intensity}）`
  ).join(' → ');

  // Main: カテゴリ・rest ともにプログラム確定
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
