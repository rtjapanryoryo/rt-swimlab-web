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
  if (level.includes('トップ選手') || level.includes('競技選手')) return 'advanced';
  if (level.includes('フィットネス') || level.includes('初心者')) return 'beginner';
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
 * levelKey: 初級は+10秒（体力回復・怪我防止）
 */
function computeRestHint(mPerSet: number, intensityStep: number, levelKey?: LevelKey): string {
  const byStep: Record<number, number> = { 1: 15, 2: 15, 3: 20, 4: 30, 5: 45, 6: 60, 7: 90 };
  let rest = byStep[Math.max(1, Math.min(7, intensityStep))] ?? 30;
  // 距離が長いほど絶対タイムが伸びるので休息も追加
  if (mPerSet >= 400) rest += 30;
  else if (mPerSet >= 200) rest += 20;
  else if (mPerSet >= 100) rest += 10;
  // 初級は追加レスト（体力回復・安全確保）
  if (levelKey === 'beginner') rest += 10;
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
// nonMainStep は getAdjustedIntensities で「必ず mainStep - 1 以下」に強制される。
// ここでの非Main値はベース（補正前）。同値の行は補正後に自動で -1 される。
const PERIOD_INTENSITY: Record<string, [number, number]> = {
  '1': [3, 3], // リカバリー:  main③(EN2) → 補正後 non②(EN1)
  '2': [4, 3], // 基礎形成:    main④(EN3) non③(EN2)
  '3': [4, 4], // 発展形成:    main④(EN3) → 補正後 non③(EN2)
  '4': [5, 4], // スピード持久: main⑤(AN1) non④(EN3)
  '5': [6, 4], // 耐乳酸:      main⑥(AN2) non④(EN3)
  '6': [5, 4], // 調整:        main⑤(AN1) non④(EN3)
  '7': [4, 3], // テーパー:    main④(EN3) non③(EN2)
};

/**
 * 期別の Main ブロック設計制約
 *
 * maxRatio     : targetDist に対する Main の最大割合
 * maxAbsoluteM : Main の絶対距離上限（高強度期の過剰負荷防止）
 * maxSets      : Main の最大セット数（期の役割に合った本数上限）
 * preferShort  : 短距離・低本数を優先するか（調整/テーパー期）
 *
 * 超過距離は Pull(③) に振り替えて有酸素補強に充てる。
 *
 * 設計思想:
 *  期①: ③は短いアクセント程度 → max 28% かつ 400m 絶対上限
 *  期②: ③中心・④補助 → 40%・本数制限なし
 *  期③: ④中心・Main 集中 → 42%
 *  期④: ⑤をMainに明確集約 → 45%（最大割合）
 *  期⑤: ⑥はMainのみ・量は抑制 → 25% かつ 1200m 絶対上限
 *  期⑥: ⑤は短・低本数 → 22% かつ 800m 絶対上限
 *  期⑦: 高強度は最小量 → 20% かつ 600m 絶対上限
 */
interface PeriodMainConstraints {
  maxRatio: number;
  maxAbsoluteM?: number;
  maxSets: number;
  preferShort: boolean;
}

const PERIOD_MAIN_CONSTRAINTS: Record<string, PeriodMainConstraints> = {
  '1': { maxRatio: 0.28, maxAbsoluteM:  400, maxSets:  6, preferShort: true  },
  '2': { maxRatio: 0.40,                     maxSets: 10, preferShort: false },
  '3': { maxRatio: 0.42,                     maxSets: 10, preferShort: false },
  '4': { maxRatio: 0.45,                     maxSets: 10, preferShort: false },
  '5': { maxRatio: 0.25, maxAbsoluteM: 1200, maxSets:  8, preferShort: true  },
  '6': { maxRatio: 0.22, maxAbsoluteM:  800, maxSets:  6, preferShort: true  },
  '7': { maxRatio: 0.20, maxAbsoluteM:  600, maxSets:  5, preferShort: true  },
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
  if (condition.includes('絶好調')) {
    notes.push('絶好調: ピーク状態・調整なし');
  } else if (condition.includes('疲労残り') || condition.includes('月経期')) {
    mainStep = Math.max(1, mainStep - 2);
    notes.push(`${condition}: 強度-2(main)`);
  } else if (condition.includes('疲労') || condition.includes('筋疲労')) {
    mainStep = Math.max(1, mainStep - 1);
    notes.push(`${condition}: 強度-1(main)`);
  }

  // 非Main は必ず Main より1段階以上低く（Main が最大強度ルール）
  if (nonMainStep >= mainStep) {
    nonMainStep = Math.max(1, mainStep - 1);
    notes.push(`非Main強度を Main(${labelOfStep(mainStep)}) より1段階下に調整`);
  }

  // Pre-Main は Main より必ず1段階下、かつ ④(EN3) を上限とする（⑤/⑥ は Main 専用）
  const preMainStep = Math.min(Math.max(1, mainStep - 1), 4);

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
 * レベル別の距離配分調整（パーセンテージ差分）
 * - 初級: ドリル・キック比率を増やし技術習得時間を確保 → main が減る
 * - 上級: ドリル・キックを若干削ってメイン比率を上げる → 実践練習重視
 * intermediate は調整なし（ALLOC_CONFIG のデフォルト値が基準）
 */
const LEVEL_ALLOC_DELTA: Record<LevelKey, { drill: number; kick: number }> = {
  beginner:     { drill: +0.04, kick: +0.03 }, // +7% 技術 → main -7%
  intermediate: { drill: 0,     kick: 0     },
  advanced:     { drill: -0.02, kick: -0.01 }, // -3% 技術 → main +3%
};

/**
 * 練習時間に応じた W-up / Down の距離上限（短時間ほどコンパクトに）
 * - 60分: W-up 250m以下・Down 150m以下
 * - 90分: W-up 350m以下・Down 200m以下
 * - 120分: 既存の cfg.wupMax / cfg.downMax をそのまま使用
 */
function getPracticeTimeCaps(practiceTime: number): { wupMax: number; downMax: number } {
  if (practiceTime <= 60) return { wupMax: 250, downMax: 150 };
  if (practiceTime <= 90) return { wupMax: 350, downMax: 200 };
  return { wupMax: 500, downMax: 300 };
}

/**
 * ブロック別の推奨丸め単位
 * Pull と PreMain をそれぞれのセット推奨単位に揃えることで
 * findSetStructures が有効な構成を見つけやすくなる。
 * (例: M-type Pull → 100m単位 → 8×100m or 4×200m が自然に選ばれる)
 */
const BLOCK_ALLOC_ROUND: Record<'S' | 'M' | 'D', { pull: number; preMain: number }> = {
  S: { pull:  50, preMain:  25 },
  M: { pull: 100, preMain: 100 },
  D: { pull: 200, preMain: 200 },
};

/**
 * 各ブロックの距離配分を算出。main = targetDist - sum(others) で算術保証。
 * Pull・PreMain は BLOCK_ALLOC_ROUND の推奨単位で丸め、有効なセット構成を保証する。
 */
function allocateBlocks(targetDist: number, distanceType: 'S' | 'M' | 'D', levelKey: LevelKey = 'intermediate', practiceTime = 90, period = '3'): BlockAlloc {
  const cfg = ALLOC_CONFIG[distanceType];
  const timeCaps = getPracticeTimeCaps(practiceTime);
  const delta = LEVEL_ALLOC_DELTA[levelKey];
  const { unit } = cfg;
  const br = BLOCK_ALLOC_ROUND[distanceType];

  const r  = (pct: number) => roundToUnit(targetDist * pct, unit);
  const rr = (pct: number, ru: number) => roundToUnit(targetDist * pct, ru);

  // 練習時間キャップを適用（min > max にならないよう min も追随させる）
  const adjWupMax  = roundToUnit(Math.min(cfg.wupMax,  timeCaps.wupMax),  unit);
  const adjWupMin  = Math.min(cfg.wupMin,  adjWupMax);
  const adjDownMax = roundToUnit(Math.min(cfg.downMax, timeCaps.downMax), unit);
  const adjDownMin = Math.min(cfg.downMin, adjDownMax);

  let warmUp  = Math.min(Math.max(r(cfg.wupPct),   adjWupMin),  adjWupMax);
  let drill   = Math.max(r(cfg.drillPct + delta.drill),   unit * 2);
  let kick    = Math.max(r(cfg.kickPct  + delta.kick),    unit * 2);
  // Pull と PreMain はブロック推奨単位で丸め → セット構成の端数を防止
  let pull    = Math.max(rr(cfg.pullPct,    br.pull),    br.pull * 2);
  let preMain = Math.max(rr(cfg.preMainPct, br.preMain), br.preMain);
  let down    = Math.min(Math.max(r(cfg.downPct), adjDownMin), adjDownMax);

  warmUp = roundToUnit(warmUp, unit);
  down   = roundToUnit(down,   unit);

  const sumFixed = () => warmUp + drill + kick + pull + preMain + down;
  let main = targetDist - sumFixed();

  // main が unit で割り切れるよう pull を ±pullUnit 微調整（最大 ±2回）
  if (main <= 0 || main % unit !== 0) {
    for (const adj of [br.pull, -br.pull, br.pull * 2, -br.pull * 2]) {
      pull += adj;
      main = targetDist - sumFixed();
      if (main > 0 && main % unit === 0) break;
      pull -= adj; // restore
    }
  }

  // 最終フォールバック: main が負またはゼロなら最小 unit を確保
  if (main <= 0) {
    pull = Math.max(br.pull, pull - br.pull);
    main = targetDist - sumFixed();
  }
  if (main < unit) main = unit;

  // 期別 Main 距離上限チェック — 超過分を Pull に振り替えて有酸素補強に充てる
  const periodCon = PERIOD_MAIN_CONSTRAINTS[period];
  if (periodCon) {
    // D-type は高ボリューム前提のため絶対上限を 2× に緩和
    const absMax = periodCon.maxAbsoluteM !== undefined
      ? (distanceType === 'D' ? periodCon.maxAbsoluteM * 2 : periodCon.maxAbsoluteM)
      : undefined;
    let maxMainM = Math.floor(targetDist * periodCon.maxRatio / br.pull) * br.pull;
    if (absMax !== undefined) {
      maxMainM = Math.min(maxMainM, Math.floor(absMax / br.pull) * br.pull);
    }
    if (main > maxMainM && maxMainM >= unit) {
      // 超過分を br.pull 単位に丸めて Pull に振り替え
      const excess = roundToUnit(main - maxMainM, br.pull);
      main -= excess;
      pull += excess;
    }
  }

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
  main:    { S: [100, 50, 25],   M: [200, 100, 50],      D: [400, 200, 100]      },
  down:    { S: [100, 50, 25],   M: [200, 100, 50],      D: [200, 100]           },
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
  maxSetsOverride?: number,
): SetStructure[] {
  const rawPreferred = PREFERRED_UNITS[blockType]?.[distanceType] ?? [50, 25];
  // 初級 or preferShort: 小→大の順（短距離多本数）で検索
  const preferred = preferSmallSets ? [...rawPreferred].reverse() : rawPreferred;
  const baseUnit = BASE_UNIT[distanceType];
  const maxSets = maxSetsOverride ?? (MAX_SETS_PER_BLOCK[blockType] ?? 12);

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

  // 強制フォールバック: 1セットあたり最大 500m の制約内で maxSets を緩和して再探索
  // 「1×1350m」「1×450m」のような異常セット構成を防ぐための最終安全弁
  const MAX_M_PER_SET = 500;
  const relaxedOrder = preferSmallSets
    ? Array.from({ length: Math.floor(Math.min(totalM, MAX_M_PER_SET) / baseUnit) }, (_, i) => baseUnit * (i + 1))
        .filter(u => isValidSetUnit(u) && totalM % u === 0)
    : Array.from({ length: Math.floor(Math.min(totalM, MAX_M_PER_SET) / baseUnit) }, (_, i) => Math.min(MAX_M_PER_SET, totalM) - baseUnit * i)
        .filter(u => u >= baseUnit && isValidSetUnit(u) && totalM % u === 0);
  for (const mPerSet of relaxedOrder) {
    const sets = totalM / mPerSet;
    if (sets >= 2) return [{ sets, mPerSet }]; // maxSets は緩和（500m上限を優先）
  }

  // 真の最終フォールバック: 500m以下で割り切れる最大単位
  for (let mPerSet = MAX_M_PER_SET; mPerSet >= baseUnit; mPerSet -= baseUnit) {
    if (isValidSetUnit(mPerSet) && totalM % mPerSet === 0) {
      return [{ sets: totalM / mPerSet, mPerSet }];
    }
  }
  // 距離が500m以下の場合は1セットも許容（500m以内なので問題なし）
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

/**
 * ドリルプール: 4泳法 × レベル別
 * 【重要】各泳法に固有のドリルのみ収録。泳法をまたいだドリル名は禁止。
 *  Fr: キャッチアップ / 片手 / ハイエルボー / フィスト / フィンガーティップ
 *  Ba: 片手スイム / スカーリング / 6-1-6バランス / ローリング強調（キャッチアップは Fr 固有→Ba 禁止）
 *  Br: 分離キック / グライドプル / 2キック1プル / タイミング強調
 *  Fly: ドルフィンキック / 片キック / 1キック1プル / ショルダードリル / ヒップドライブ
 */
const DRILL_POOLS: Record<string, Record<LevelKey, string[]>> = {
  Fr: {
    beginner:     ['キャッチアップ / 片手右', 'ヘッドアップ / 片手左右交互', '片手スイム（丁寧に）'],
    intermediate: ['odd: 片手左 / even: 片手右', 'フィンガーティップ Des → Swim', 'Form & Des 1→4', 'ハイエルボー→フィスト交互'],
    advanced:     ['フィスト → オープン Des 1→4', 'ハイエルボーキャッチ + ストロークカウント Dec', 'odd: 片手左 / even: フィスト Des', 'Form & Des + TSS最小化'],
  },
  Ba: {
    // Ba固有: 片手スイム・スカーリング・6-1-6・ローリング強調（キャッチアップ厳禁）
    beginner:     ['片手左 / 片手右（フィニッシュ確認）', '6キック 1プル バランス', 'スカーリング基礎（浮力確認）'],
    intermediate: ['片手左右交互 ローリング強調', '6-1-6 バランスドリル', 'スカーリング → Swim 交互', '腕伸ばし6キック / Swim'],
    advanced:     ['片手 + ストローク数 Des 1→4', '6-1-6 ハイエルボー強調', 'スカーリング Des → Race pace Swim', 'Count Down + TSS最小化'],
  },
  Br: {
    beginner:     ['壁キック分離 / Brプルドリル', '2キック1プル グライド強調', '分離キック（ゆっくり）'],
    intermediate: ['グライドフェーズ強調プルドリル', '2キック1プル タイミング', 'Brキック（Fin）/ プルドリル交互', '壁キック → タイミング連結'],
    advanced:     ['プルアウト強調 + 狭い軌道', '2キック1プル → Swim 交互 Des', 'ストロークカウント Dec + グライド', 'レースリズム確認 2×4'],
  },
  Fly: {
    beginner:     ['ドルフィンキック（壁あり）/ 片キック左', '1キック1プル（ゆっくり呼吸確認）', '片手Fly（右→左交互）'],
    intermediate: ['ヒップドライブ片キック左右', 'ショルダードリル + ドルフィン', '1キック1プル → 2キック1プル', 'Form & Des 1→4'],
    advanced:     ['ショルダードリル → Swim Des 1→4', '1K1P → 2K1P → Swim 連続', 'ドルフィン水中 + ハイエルボー', 'レースリズム Form & Des'],
  },
  IM: {
    beginner:     ['4泳法キックドリル（易→難）', '4泳法プルドリル基本', 'Fly→Ba→Br→Fr ドリル順'],
    intermediate: ['4泳法ドリル順（弱点種目2本）', 'odd: IM Order / even: 専門種目', 'Form & Des 4泳法切り替え'],
    advanced:     ['4泳法（弱点種目 Form & Des 強調）', 'odd: IM Order / even: 専門 Des', 'ストロークカウント比較 IM Order'],
  },
  S1: {
    beginner:     ['専門種目ドリル基本', 'Form（フォーム確認）', 'odd: ドリル / even: Easy Swim'],
    intermediate: ['専門種目ドリル', 'Form & Des', 'odd: ドリル / even: Swim'],
    advanced:     ['専門種目ドリル（強度付き）', 'Form & Des 1→4', 'odd: ドリル / even: Swim'],
  },
};

/** キックプール: レベル別（補助的・脚の感覚・リズム系） */
const KICK_POOLS: Record<LevelKey, string[]> = {
  beginner:     ['Des（フォーム優先）', 'good kick（リズムよく）', 'Fins（基本キック感覚）', 'ゆっくり丁寧に Des'],
  intermediate: ['Des 1→4', '1-4 Dec（後半意識）', 'Fins + barefoot 交互', 'good kick（ストロークに連動）', 'Des 後半 Fins'],
  advanced:     ['1-4 Dec 強度 Hard Alt', 'Des Fins（後半キック強化）', 'Underwater 3→5→7 push', 'good kick + count Dec', 'odd: Strong / even: Recover'],
};

/** プルプール: レベル別（テンポ・DPS・ネガティブスプリット系） */
const PULL_POOLS: Record<LevelKey, string[]> = {
  beginner:     ['DPS（ストローク感覚優先）', 'Des（フォーム崩さず）', 'Easy Pull（水感確認）', 'Build（ゆっくり上げる）'],
  intermediate: ['DPS Negative split', 'o:Fast e:DPS交互', 'Des 1→4（ストローク数管理）', 'Variable（ペース変化）', 'Catch emphasis + DPS'],
  advanced:     ['Negative split + count Dec', 'Form & Des 1→4（TSS意識）', 'o:Race pace e:Easy', 'Variable（ペース変動耐性）', 'ベストアベレージ（ターゲットタイム内）'],
};

/** メインプール: 期 × レベル別（高強度集中・戦略的構成） */
const MAIN_POOLS: Record<string, Record<LevelKey, string[]>> = {
  lactic: {  // 期5 AN2
    beginner:     ['ベースメイン（フォーム保持）', '全力後に Form確認'],
    intermediate: ['耐乳酸MAX（ベストアベレージ）', 'Broken（10sec/set）全力', '1H/1E Alt（乳酸交互）'],
    advanced:     ['耐乳酸MAX（ベストタイム狙い）', 'ダイハード（壊さず全力）', '1H/1E Alt + ターゲットタイム'],
  },
  taper: {   // 期7 EN3
    beginner:     ['Standard Main（リズム確認）', 'Des（感覚を整える）'],
    intermediate: ['ベストアベレージ（ターゲット内）', 'Des（レースリズム確認）', 'Variable（ペース感覚）'],
    advanced:     ['ベストアベレージ + split確認', 'Des 1→4（キレ重視）', 'Race pace × 短本数'],
  },
  high: {    // 期4 AN1 / 期6 AN1調整
    beginner:     ['ベースメイン（力まず）', 'Standard Main'],
    intermediate: ['ベストアベレージ（ターゲットタイム内）', 'Negative split（後半勝負）', 'Des 1→4（質の積み上げ）'],
    advanced:     ['ベストアベレージ + count Dec', '1H/1E Alt（高強度交互）', 'Negative split レースペース'],
  },
  middle: {  // 期3 EN3
    beginner:     ['Standard Main（安定ペース）', 'Build（徐々に上げる）'],
    intermediate: ['ベースメイン（安定×量）', 'ベストアベレージ（ターゲット設定）', 'Negative split（後半意識）'],
    advanced:     ['ベストアベレージ + split管理', 'Negative split → Des', 'Variable（ペース変動耐性）'],
  },
  base: {    // 期1 EN2 / 期2 EN3
    beginner:     ['Standard Main（フォーム優先）', 'Easy Main（丁寧に）'],
    intermediate: ['Standard Main（ペース一定）', 'ベースメイン（有酸素ベース）', 'Des（ゆとりを持って）'],
    advanced:     ['ベースメイン（DPS意識）', 'Negative split（リズム構築）', 'Des + count管理'],
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

/** 疲労・月経期時に除外する高強度パターン（完全一致） */
const FATIGUE_FILTER_HARD   = ['耐乳酸MAX', 'ダイハード', '1H/1E Alt', '1-4 Dec 5 Hard Alt', 'odd: Hard / even: Easy'];
/** 重疲労・月経期時にさらに除外する中〜高強度パターン */
const FATIGUE_FILTER_MEDIUM = ['ベストアベレージ', 'Negative split', 'Variable'];

/**
 * 状況に応じてパターンプールから高強度パターンを除外する。
 * - 軽疲労: HARD のみ除外
 * - 筋疲労・疲労残り・月経期: HARD + MEDIUM を除外
 * フォールバック: フィルタ後に1つも残らない場合はプール先頭1件を維持
 */
function filterPoolForCondition(pool: string[], condition: string): string[] {
  const isHeavy = condition.includes('疲労残り') || condition.includes('月経期') || condition.includes('筋疲労');
  const isFatigued = condition.includes('疲労') || condition.includes('月経期');
  if (!isFatigued) return pool;
  const removeKws = isHeavy ? [...FATIGUE_FILTER_HARD, ...FATIGUE_FILTER_MEDIUM] : FATIGUE_FILTER_HARD;
  const filtered = pool.filter((p) => !removeKws.some((k) => p.includes(k)));
  return filtered.length > 0 ? filtered : pool.slice(0, 1);
}

function getPatternPool(
  blockType: string,
  period: string,
  stroke: string,
  level: string,
  condition = '',
): string[] {
  const lk = getLevelKey(level);
  const p = parseInt(period);
  let pool: string[];

  switch (blockType) {
    case 'warmUp': {
      const category = p <= 2 ? 'technique' : p >= 6 ? 'speed' : 'default';
      pool = WARMUP_POOLS[lk][category];
      break;
    }
    case 'drill': {
      // IM, S1, または4泳法のいずれか
      const sk = Object.keys(DRILL_POOLS).includes(stroke) ? stroke : 'S1';
      pool = DRILL_POOLS[sk][lk];
      break;
    }
    case 'kick':
      pool = KICK_POOLS[lk];
      break;
    case 'pull':
      pool = PULL_POOLS[lk];
      break;
    case 'preMain':
      // preMain: レベル × 期で戦略的アプローチを変える
      if (lk === 'beginner') {
        pool = ['Build（ペースを徐々に上げる）', 'Des（フォーム保ちながら）', 'Easy → Race feel'];
      } else if (lk === 'advanced') {
        if (p >= 5)      pool = ['Broken（10sec/set）レースペース', 'Des 1→4 最終レースペース', 'Race pace + kick off wall', 'ターゲットタイム Des'];
        else if (p >= 3) pool = ['Descend to race pace', 'Negative split + count Dec', 'Build up → Race finish', 'Race feel Des 1→4'];
        else             pool = ['Des（レースペース導入）', 'Negative split', 'Build up → Fast'];
      } else {
        if (p >= 5)      pool = ['Descend to race pace（目標タイム意識）', 'Build up → Race pace', 'Des 1→4（最終本レースペース）'];
        else if (p >= 3) pool = ['Des（レースペース確認）', 'Negative split + ペース管理', 'Build up（最終本レースペース）'];
        else             pool = ['Des（フォーム確認）', 'Build（ペースを上げる）', 'レースペース感覚確認'];
      }
      break;
    case 'main': {
      let cat: string;
      if (p === 5) cat = 'lactic';
      else if (p === 7) cat = 'taper';
      else if (p >= 4) cat = 'high';
      else if (p >= 3) cat = 'middle';
      else cat = 'base';
      pool = MAIN_POOLS[cat][lk];
      break;
    }
    default: pool = ['Standard'];
  }

  return filterPoolForCondition(pool, condition);
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
  condition = '',
  maxSetsOverride?: number,
  preferSmallSetsOverride?: boolean,
): BlockSpec {
  const lm = getLevelModifiers(level);
  const lk = lm.key;
  const effectivePreferSmall = preferSmallSetsOverride ?? lm.preferSmallSets;
  const needsTwoSeg = twoSegments ?? (['kick', 'pull'].includes(blockType) && parseInt(period) >= 3);
  const structs = findSetStructures(targetM, blockType, distanceType, needsTwoSeg, effectivePreferSmall, maxSetsOverride);
  const patternPool = getPatternPool(blockType, period, stroke, level, condition);

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
        restHint: computeRestHint(seg.mPerSet, intensityStep, lk),
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
        restHint: computeRestHint(structs[0].mPerSet, intensityStep, lk),
      },
      {
        sets: structs[1].sets, mPerSet: structs[1].mPerSet, totalM: seg2Actual,
        intensity: labelOfStep(step2), intensityNum: numOfStep(step2),
        patternPool: patternPool.slice(2, 4).length ? patternPool.slice(2, 4) : patternPool.slice(0, 2),
        restHint: computeRestHint(structs[1].mPerSet, step2, lk),
      },
    ],
    totalM: seg1Actual + seg2Actual,
  };
}

// ============================================================
// メイン：骨格生成
// ============================================================

/** 年齢グループ文字列 or 数値文字列 → 代表数値に変換 */
function parseAgeNum(age: string): number {
  const n = parseInt(age, 10);
  if (!isNaN(n)) return n;
  if (age.includes('小学生')) return 10;
  if (age.includes('中学生')) return 14;
  if (age.includes('高校生')) return 17;
  if (age.includes('30〜39')) return 35;
  if (age.includes('40歳以上')) return 45;
  if (age.includes('大学生')) return 20;
  if (age.includes('マスターズ')) return 45;
  return 20;
}

export function generateMenuSkeleton(input: TrainingInput): MenuSkeleton {
  const targetDist = parseInt(input.distance, 10);
  const ageNum = parseAgeNum(input.age);
  const dt = (['S', 'M', 'D'].includes(input.distanceType) ? input.distanceType : 'M') as 'S' | 'M' | 'D';

  const { mainStep, nonMainStep, preMainStep, notes } = getAdjustedIntensities(
    input.period, ageNum, input.condition, input.level,
  );

  const lk = getLevelKey(input.level);
  const practiceTimeNum = parseInt(input.practiceTime, 10) || 90;
  const alloc = allocateBlocks(targetDist, dt, lk, practiceTimeNum, input.period);

  // 合計検証（バグ検出用）
  const allocTotal = alloc.warmUp + alloc.drill + alloc.kick + alloc.pull + alloc.preMain + alloc.main + alloc.down;
  if (allocTotal !== targetDist) {
    alloc.main += targetDist - allocTotal;
  }

  /**
   * ブロック別強度の段階設計（役割の明確化・⑤/⑥ は Main 専用）
   *
   *  ① WarmUp  : ① 固定 — 活性化・ゆっくりほぐす
   *  ② Drill   : ≤② (EN1) — フォーム優先・技術習得（強度を上げない）
   *  ② Kick    : ≤② (EN1) — 脚の補助作業。Drill と同格だが内容は別（キック特化）
   *  ③ Pull    : ≤③ (EN2) — テンポ練習・Kick より一段上でメインへの橋渡し
   *  ④ PreMain : main-1 かつ ≤④ (EN3) — Main 直前の準備。⑤/⑥ は Main 専用
   *  ⑤/⑥ Main : mainStep — その日の最大強度。高強度刺激をここに集約
   *  ① Down    : ① 固定 — クールダウン
   *
   *  強度ステップ昇順: WU(①) → Drill(②)/Kick(②) → Pull(③) → PreMain(≤④) → Main(⑤/⑥)
   */
  const drillStep = Math.min(nonMainStep, 2); // EN1(②) 以下に固定
  const kickStep  = Math.min(nonMainStep, 2); // EN1(②) 以下 — Pull(③) と段差をつけ役割を区別
  const pullStep  = Math.min(nonMainStep, 3); // EN2(③) 以下 — Kick より一段上でブリッジ役

  const level = input.level;
  const cond  = input.condition;

  const warmUp  = buildBlockSpec(alloc.warmUp,   'warmUp',  dt, 1,           input.period, input.stroke, level, false, cond);
  const drill   = buildBlockSpec(alloc.drill,    'drill',   dt, drillStep,   input.period, input.stroke, level, false, cond);
  const kick    = buildBlockSpec(alloc.kick,     'kick',    dt, kickStep,    input.period, input.stroke, level, undefined, cond);
  const pull    = buildBlockSpec(alloc.pull,     'pull',    dt, pullStep,    input.period, input.stroke, level, undefined, cond);
  const preMain = buildBlockSpec(alloc.preMain,  'preMain', dt, preMainStep, input.period, input.stroke, level, false, cond);

  // 非Mainブロックの実際の合計でMainを確定（算術保証の核心）
  const nonMainSum = warmUp.totalM + drill.totalM + kick.totalM + pull.totalM + preMain.totalM;
  const down = buildBlockSpec(alloc.down, 'down', dt, 1, input.period, input.stroke, level, false, cond);
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
        adjustedDown = buildBlockSpec(newDownM, 'down', dt, 1, input.period, input.stroke, level, false, cond);
        adjustedExactMain = newMain;
        break;
      }
    }
  }

  /**
   * Main の2セグメント分割しきい値（レベル別）
   * - 上級: 期③以上で分割（早期から強度変化に慣らす）
   * - 中級: 期④以上で分割（現行通り）
   * - 初級 / 期⑥⑦: 常に1セグメント（シンプルに・調整/テーパーは単一強度で完結）
   */
  const mainTwoSeg = (['6', '7'].includes(input.period))
    ? false // 調整・テーパーは単一セグメント（強度の分散防止）
    : lk === 'advanced'
      ? parseInt(input.period) >= 3
      : lk === 'intermediate'
        ? parseInt(input.period) >= 4
        : false;

  // 期別制約を Main ビルドに適用（最大本数・短セット優先）
  const periodCon = PERIOD_MAIN_CONSTRAINTS[input.period] ?? { maxRatio: 0.45, maxSets: 10, preferShort: false };
  const main = buildBlockSpec(
    adjustedExactMain, 'main', dt, mainStep, input.period, input.stroke, level,
    mainTwoSeg, cond,
    periodCon.maxSets,
    periodCon.preferShort || undefined,
  );

  /**
   * hasDive: ダイブ練習の対象レベル
   * - 初級: なし（ダイブ未習得・安全優先）
   * - 中級: 期⑥⑦のみ（調整・テーパー期）
   * - 上級: 期⑤⑥⑦（強化・調整・テーパー）
   */
  const hasDive = lk === 'beginner' ? false
    : lk === 'advanced' ? ['5', '6', '7'].includes(input.period)
    : ['6', '7'].includes(input.period);

  /**
   * hasRest: 休憩時間の挿入
   * - 初級: 常に挿入（体力回復・安全確保）
   * - 中級/上級: 疲労状況または高強度期（期④⑤）のみ
   */
  const hasRest = lk === 'beginner'
    ? true
    : input.condition.includes('疲労') || input.condition.includes('月経期') || ['4', '5'].includes(input.period);

  return {
    input,
    targetDist,
    distanceType: dt,

    warmUp, drill, kick, pull, preMain, main, down: adjustedDown,

    hasDive,
    hasRest,

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
