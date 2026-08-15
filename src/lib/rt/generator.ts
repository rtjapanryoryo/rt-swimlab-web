/**
 * RT-japan 水泳練習メニュー自動生成ロジック
 * プロトコル＝ジェネレート（RT_MENU_GENERATION_RULES_JA.md）に基づく決定論的生成（同じ入力→同じ出力）
 */

// ============================================================
// 型定義
// ============================================================

export interface TrainingInput {
  period: string; // ①〜⑦
  stroke: string; // FR, Ba, Br, Fly, IM
  distance: string; // 2000, 3000, 4000, 5000, 6000, 7000, 8000（目標距離m）
  age: string; // 年齢（数値）
  distanceType: string; // S, M, D
  level: string; // 全国大会入賞〜代表クラス, 上級, 中級, 初級, マスターズ各
  condition: string; // 良好、軽疲労、筋疲労、疲労残り、月経期
  practiceTime: string; // 60, 90, 120
  generationMode?: 'standard' | 'sprint_50m';
  poolLength?: 'short_course' | 'long_course';
  raceEvent?: string;
  raceEvent2?: string;
  bestTime?: string;
  explanationLevel?: 'beginner_friendly' | 'technical';
  mainSetTime?: '20' | '30' | '45' | '60';
}

export type MenuBestTimeReference = {
  raceEvent: string;
  display: string | null;
  source: 'personal_best' | 'none';
};

export type MenuGenerationContext = {
  timingRuleVersion: string;
  contextVersion?: string;
  promptVersion?: string;
  knowledgeVersion?: string;
  outputContractVersion?: string;
  evaluationVersion?: string;
  generationRuleVersion?: string;
  model?: string;
  bestTimeSource: 'personal_best' | 'none';
  bestTimeDisplay: string | null;
  bestTimeEvent: string | null;
  poolLength: 'short_course' | 'long_course';
  bestTimeReferences?: MenuBestTimeReference[];
  mainSetTimeMinutes?: number;
  estimatedDurationMinutes?: number;
};

export interface TrainingResult {
  purpose: string;
  warmUp: string;
  drill: string;
  kick: string;
  pull: string;
  preMain: string;
  dive: string;
  rest: string;
  main: string;
  down: string;
  total: string;
  intention: string;
  coachingPoint: string;
  caution: string;
  expectedEffect: string;
  warmUpM?: number;
  drillM?: number;
  kickM?: number;
  pullM?: number;
  preMainM?: number;
  mainM?: number;
  downM?: number;
  generationContext?: MenuGenerationContext;
}

export type DistanceType = 'S' | 'M' | 'D';
export type PurposeType = '耐乳酸' | '心肺' | '技術' | 'スピード' | 'フォーム' | '持久力' | 'その他';
export type AgeGroup = '小学生' | '中学生' | '高校生' | '大学生以上' | '成人・マスターズ';

interface MainSetRule {
  sets: number; // 本数
  distance: number; // 距離（m）
  rest: string; // レスト（秒または分）
  intensity: string; // 強度（EN3, EN2など）
  intensityNote: string; // 強度の説明
}

// ============================================================
// 年齢グループ判定
// ============================================================

function getAgeGroup(age: string): AgeGroup {
  // グループ文字列対応
  if (age.includes('小学生')) return '小学生';
  if (age.includes('中学生')) return '中学生';
  if (age.includes('高校生')) return '高校生';
  if (age.includes('30〜39') || age.includes('40歳以上')) return '成人・マスターズ';
  if (age.includes('大学生')) return '大学生以上';
  if (age.includes('マスターズ')) return '成人・マスターズ';

  const ageNum = parseInt(age, 10);
  if (isNaN(ageNum)) return '高校生'; // デフォルト
  if (ageNum <= 12) return '小学生';
  if (ageNum <= 15) return '中学生';
  if (ageNum <= 18) return '高校生';
  if (ageNum <= 25) return '大学生以上';
  return '成人・マスターズ';
}

// ============================================================
// 目的タイプ判定
// ============================================================

function getPurposeType(purpose: string): PurposeType {
  if (purpose.includes('耐乳酸') || purpose.includes('乳酸')) return '耐乳酸';
  if (purpose.includes('持久力') || purpose.includes('持久')) return '持久力';
  if (purpose.includes('心肺')) return '心肺';
  if (purpose.includes('技術') || purpose.includes('フォーム')) return '技術';
  if (purpose.includes('スピード') || purpose.includes('速く')) return 'スピード';
  if (purpose.includes('レースペース')) return '耐乳酸'; // レースペースは耐乳酸として扱う
  if (purpose.includes('回復')) return '心肺'; // 回復は心肺として扱う
  return 'その他';
}

/** 期から目的タイプを導出（7.目的削除に伴う） */
function derivePurposeFromPeriod(period: string): PurposeType {
  switch (period) {
    case '1': return '心肺'; // リカバリー期
    case '2': return '技術'; // 基礎形成期
    case '3': return '技術'; // 発展形成期
    case '4': return '心肺'; // 強化期(スピード持久力)
    case '5': return '耐乳酸'; // 強化期(耐乳酸)
    case '6': return 'スピード'; // 調整期
    case '7': return 'スピード'; // テーパー期
    default: return 'その他';
  }
}

// ============================================================
// Main Set ルールテーブル
// S/M/D × 目的 × 年齢 → 本数/距離/レスト/強度意図
// ============================================================

const MAIN_SET_RULES: Record<DistanceType, Record<PurposeType, Record<AgeGroup, MainSetRule>>> = {
  // ============================================================
  // S（スプリント）
  // ============================================================
  S: {
    耐乳酸: {
      小学生: { sets: 4, distance: 25, rest: '30秒', intensity: 'EN3', intensityNote: '10秒心拍29-30（年齢補正+2-3）' },
      中学生: { sets: 6, distance: 25, rest: '30秒', intensity: 'EN3', intensityNote: '10秒心拍29-30（年齢補正+1-2）' },
      高校生: { sets: 8, distance: 25, rest: '30秒', intensity: 'EN3', intensityNote: '10秒心拍29-30' },
      '大学生以上': { sets: 8, distance: 25, rest: '30秒', intensity: 'EN3', intensityNote: '10秒心拍29-30' },
      '成人・マスターズ': { sets: 6, distance: 25, rest: '40秒', intensity: 'EN2', intensityNote: '10秒心拍28前後（年齢補正-2-3）' },
    },
    心肺: {
      小学生: { sets: 8, distance: 25, rest: '20秒', intensity: 'EN1', intensityNote: '10秒心拍26-27（年齢補正+2-3）' },
      中学生: { sets: 10, distance: 25, rest: '20秒', intensity: 'EN1', intensityNote: '10秒心拍26-27（年齢補正+1-2）' },
      高校生: { sets: 12, distance: 25, rest: '20秒', intensity: 'EN1', intensityNote: '10秒心拍26-27' },
      '大学生以上': { sets: 12, distance: 25, rest: '20秒', intensity: 'EN1', intensityNote: '10秒心拍26-27' },
      '成人・マスターズ': { sets: 8, distance: 25, rest: '30秒', intensity: 'A2', intensityNote: '10秒心拍24-26（年齢補正-2-3）' },
    },
    技術: {
      小学生: { sets: 6, distance: 25, rest: '30秒', intensity: 'A1', intensityNote: '10秒心拍22-24（年齢補正+2-3）' },
      中学生: { sets: 8, distance: 25, rest: '30秒', intensity: 'A1', intensityNote: '10秒心拍22-24（年齢補正+1-2）' },
      高校生: { sets: 8, distance: 25, rest: '30秒', intensity: 'A1', intensityNote: '10秒心拍22-24' },
      '大学生以上': { sets: 8, distance: 25, rest: '30秒', intensity: 'A1', intensityNote: '10秒心拍22-24' },
      '成人・マスターズ': { sets: 6, distance: 25, rest: '40秒', intensity: 'A1', intensityNote: '10秒心拍22-24（年齢補正-2-3）' },
    },
    スピード: {
      小学生: { sets: 4, distance: 25, rest: '60秒', intensity: 'AN', intensityNote: '短時間のみ、フォーム維持優先' },
      中学生: { sets: 6, distance: 25, rest: '60秒', intensity: 'AN', intensityNote: '短時間のみ、フォーム維持優先' },
      高校生: { sets: 8, distance: 25, rest: '60秒', intensity: 'AN', intensityNote: '短時間のみ、フォーム維持優先' },
      '大学生以上': { sets: 8, distance: 25, rest: '60秒', intensity: 'AN', intensityNote: '短時間のみ、フォーム維持優先' },
      '成人・マスターズ': { sets: 4, distance: 25, rest: '90秒', intensity: 'EN2', intensityNote: '安全優先、強度を下げる' },
    },
    フォーム: {
      小学生: { sets: 6, distance: 25, rest: '30秒', intensity: 'A1', intensityNote: '10秒心拍22-24（年齢補正+2-3）' },
      中学生: { sets: 8, distance: 25, rest: '30秒', intensity: 'A1', intensityNote: '10秒心拍22-24（年齢補正+1-2）' },
      高校生: { sets: 8, distance: 25, rest: '30秒', intensity: 'A1', intensityNote: '10秒心拍22-24' },
      '大学生以上': { sets: 8, distance: 25, rest: '30秒', intensity: 'A1', intensityNote: '10秒心拍22-24' },
      '成人・マスターズ': { sets: 6, distance: 25, rest: '40秒', intensity: 'A1', intensityNote: '10秒心拍22-24（年齢補正-2-3）' },
    },
    持久力: {
      小学生: { sets: 6, distance: 25, rest: '15秒', intensity: 'EN1', intensityNote: '10秒心拍26-27（年齢補正+2-3）' },
      中学生: { sets: 8, distance: 25, rest: '15秒', intensity: 'EN1', intensityNote: '10秒心拍26-27（年齢補正+1-2）' },
      高校生: { sets: 10, distance: 25, rest: '15秒', intensity: 'EN1', intensityNote: '10秒心拍26-27' },
      '大学生以上': { sets: 10, distance: 25, rest: '15秒', intensity: 'EN1', intensityNote: '10秒心拍26-27' },
      '成人・マスターズ': { sets: 6, distance: 25, rest: '25秒', intensity: 'A2', intensityNote: '10秒心拍24-26（年齢補正-2-3）' },
    },
    その他: {
      小学生: { sets: 6, distance: 25, rest: '30秒', intensity: 'EN1', intensityNote: '10秒心拍26-27（年齢補正+2-3）' },
      中学生: { sets: 8, distance: 25, rest: '30秒', intensity: 'EN1', intensityNote: '10秒心拍26-27（年齢補正+1-2）' },
      高校生: { sets: 8, distance: 25, rest: '30秒', intensity: 'EN1', intensityNote: '10秒心拍26-27' },
      '大学生以上': { sets: 8, distance: 25, rest: '30秒', intensity: 'EN1', intensityNote: '10秒心拍26-27' },
      '成人・マスターズ': { sets: 6, distance: 25, rest: '40秒', intensity: 'A2', intensityNote: '10秒心拍24-26（年齢補正-2-3）' },
    },
  },

  // ============================================================
  // M（ミドル）
  // ============================================================
  M: {
    耐乳酸: {
      小学生: { sets: 4, distance: 50, rest: '45秒', intensity: 'EN3', intensityNote: '10秒心拍29-30（年齢補正+2-3）' },
      中学生: { sets: 6, distance: 50, rest: '45秒', intensity: 'EN3', intensityNote: '10秒心拍29-30（年齢補正+1-2）' },
      高校生: { sets: 8, distance: 50, rest: '45秒', intensity: 'EN3', intensityNote: '10秒心拍29-30' },
      '大学生以上': { sets: 8, distance: 50, rest: '45秒', intensity: 'EN3', intensityNote: '10秒心拍29-30' },
      '成人・マスターズ': { sets: 6, distance: 50, rest: '60秒', intensity: 'EN2', intensityNote: '10秒心拍28前後（年齢補正-2-3）' },
    },
    心肺: {
      小学生: { sets: 6, distance: 50, rest: '30秒', intensity: 'EN1', intensityNote: '10秒心拍26-27（年齢補正+2-3）' },
      中学生: { sets: 8, distance: 50, rest: '30秒', intensity: 'EN1', intensityNote: '10秒心拍26-27（年齢補正+1-2）' },
      高校生: { sets: 10, distance: 50, rest: '30秒', intensity: 'EN1', intensityNote: '10秒心拍26-27' },
      '大学生以上': { sets: 10, distance: 50, rest: '30秒', intensity: 'EN1', intensityNote: '10秒心拍26-27' },
      '成人・マスターズ': { sets: 6, distance: 50, rest: '45秒', intensity: 'A2', intensityNote: '10秒心拍24-26（年齢補正-2-3）' },
    },
    技術: {
      小学生: { sets: 6, distance: 50, rest: '40秒', intensity: 'A1', intensityNote: '10秒心拍22-24（年齢補正+2-3）' },
      中学生: { sets: 8, distance: 50, rest: '40秒', intensity: 'A1', intensityNote: '10秒心拍22-24（年齢補正+1-2）' },
      高校生: { sets: 8, distance: 50, rest: '40秒', intensity: 'A1', intensityNote: '10秒心拍22-24' },
      '大学生以上': { sets: 8, distance: 50, rest: '40秒', intensity: 'A1', intensityNote: '10秒心拍22-24' },
      '成人・マスターズ': { sets: 6, distance: 50, rest: '50秒', intensity: 'A1', intensityNote: '10秒心拍22-24（年齢補正-2-3）' },
    },
    スピード: {
      小学生: { sets: 4, distance: 50, rest: '90秒', intensity: 'AN', intensityNote: '短時間のみ、フォーム維持優先' },
      中学生: { sets: 6, distance: 50, rest: '90秒', intensity: 'AN', intensityNote: '短時間のみ、フォーム維持優先' },
      高校生: { sets: 8, distance: 50, rest: '90秒', intensity: 'AN', intensityNote: '短時間のみ、フォーム維持優先' },
      '大学生以上': { sets: 8, distance: 50, rest: '90秒', intensity: 'AN', intensityNote: '短時間のみ、フォーム維持優先' },
      '成人・マスターズ': { sets: 4, distance: 50, rest: '120秒', intensity: 'EN2', intensityNote: '安全優先、強度を下げる' },
    },
    フォーム: {
      小学生: { sets: 6, distance: 50, rest: '40秒', intensity: 'A1', intensityNote: '10秒心拍22-24（年齢補正+2-3）' },
      中学生: { sets: 8, distance: 50, rest: '40秒', intensity: 'A1', intensityNote: '10秒心拍22-24（年齢補正+1-2）' },
      高校生: { sets: 8, distance: 50, rest: '40秒', intensity: 'A1', intensityNote: '10秒心拍22-24' },
      '大学生以上': { sets: 8, distance: 50, rest: '40秒', intensity: 'A1', intensityNote: '10秒心拍22-24' },
      '成人・マスターズ': { sets: 6, distance: 50, rest: '50秒', intensity: 'A1', intensityNote: '10秒心拍22-24（年齢補正-2-3）' },
    },
    持久力: {
      小学生: { sets: 6, distance: 50, rest: '20秒', intensity: 'EN1', intensityNote: '10秒心拍26-27（年齢補正+2-3）' },
      中学生: { sets: 8, distance: 50, rest: '20秒', intensity: 'EN1', intensityNote: '10秒心拍26-27（年齢補正+1-2）' },
      高校生: { sets: 10, distance: 50, rest: '20秒', intensity: 'EN1', intensityNote: '10秒心拍26-27' },
      '大学生以上': { sets: 10, distance: 50, rest: '20秒', intensity: 'EN1', intensityNote: '10秒心拍26-27' },
      '成人・マスターズ': { sets: 6, distance: 50, rest: '35秒', intensity: 'A2', intensityNote: '10秒心拍24-26（年齢補正-2-3）' },
    },
    その他: {
      小学生: { sets: 6, distance: 50, rest: '40秒', intensity: 'EN1', intensityNote: '10秒心拍26-27（年齢補正+2-3）' },
      中学生: { sets: 8, distance: 50, rest: '40秒', intensity: 'EN1', intensityNote: '10秒心拍26-27（年齢補正+1-2）' },
      高校生: { sets: 8, distance: 50, rest: '40秒', intensity: 'EN1', intensityNote: '10秒心拍26-27' },
      '大学生以上': { sets: 8, distance: 50, rest: '40秒', intensity: 'EN1', intensityNote: '10秒心拍26-27' },
      '成人・マスターズ': { sets: 6, distance: 50, rest: '50秒', intensity: 'A2', intensityNote: '10秒心拍24-26（年齢補正-2-3）' },
    },
  },

  // ============================================================
  // D（ディスタンス）
  // ============================================================
  D: {
    耐乳酸: {
      小学生: { sets: 4, distance: 100, rest: '60秒', intensity: 'EN3', intensityNote: '10秒心拍29-30（年齢補正+2-3）' },
      中学生: { sets: 6, distance: 100, rest: '60秒', intensity: 'EN3', intensityNote: '10秒心拍29-30（年齢補正+1-2）' },
      高校生: { sets: 8, distance: 100, rest: '60秒', intensity: 'EN3', intensityNote: '10秒心拍29-30' },
      '大学生以上': { sets: 8, distance: 100, rest: '60秒', intensity: 'EN3', intensityNote: '10秒心拍29-30' },
      '成人・マスターズ': { sets: 6, distance: 100, rest: '90秒', intensity: 'EN2', intensityNote: '10秒心拍28前後（年齢補正-2-3）' },
    },
    心肺: {
      小学生: { sets: 6, distance: 100, rest: '30秒', intensity: 'EN1', intensityNote: '10秒心拍26-27（年齢補正+2-3）' },
      中学生: { sets: 8, distance: 100, rest: '30秒', intensity: 'EN1', intensityNote: '10秒心拍26-27（年齢補正+1-2）' },
      高校生: { sets: 10, distance: 100, rest: '30秒', intensity: 'EN1', intensityNote: '10秒心拍26-27' },
      '大学生以上': { sets: 10, distance: 100, rest: '30秒', intensity: 'EN1', intensityNote: '10秒心拍26-27' },
      '成人・マスターズ': { sets: 6, distance: 100, rest: '60秒', intensity: 'A2', intensityNote: '10秒心拍24-26（年齢補正-2-3）' },
    },
    技術: {
      小学生: { sets: 6, distance: 100, rest: '45秒', intensity: 'A1', intensityNote: '10秒心拍22-24（年齢補正+2-3）' },
      中学生: { sets: 8, distance: 100, rest: '45秒', intensity: 'A1', intensityNote: '10秒心拍22-24（年齢補正+1-2）' },
      高校生: { sets: 8, distance: 100, rest: '45秒', intensity: 'A1', intensityNote: '10秒心拍22-24' },
      '大学生以上': { sets: 8, distance: 100, rest: '45秒', intensity: 'A1', intensityNote: '10秒心拍22-24' },
      '成人・マスターズ': { sets: 6, distance: 100, rest: '60秒', intensity: 'A1', intensityNote: '10秒心拍22-24（年齢補正-2-3）' },
    },
    スピード: {
      小学生: { sets: 4, distance: 100, rest: '120秒', intensity: 'AN', intensityNote: '短時間のみ、フォーム維持優先' },
      中学生: { sets: 6, distance: 100, rest: '120秒', intensity: 'AN', intensityNote: '短時間のみ、フォーム維持優先' },
      高校生: { sets: 8, distance: 100, rest: '120秒', intensity: 'AN', intensityNote: '短時間のみ、フォーム維持優先' },
      '大学生以上': { sets: 8, distance: 100, rest: '120秒', intensity: 'AN', intensityNote: '短時間のみ、フォーム維持優先' },
      '成人・マスターズ': { sets: 4, distance: 100, rest: '180秒', intensity: 'EN2', intensityNote: '安全優先、強度を下げる' },
    },
    フォーム: {
      小学生: { sets: 6, distance: 100, rest: '45秒', intensity: 'A1', intensityNote: '10秒心拍22-24（年齢補正+2-3）' },
      中学生: { sets: 8, distance: 100, rest: '45秒', intensity: 'A1', intensityNote: '10秒心拍22-24（年齢補正+1-2）' },
      高校生: { sets: 8, distance: 100, rest: '45秒', intensity: 'A1', intensityNote: '10秒心拍22-24' },
      '大学生以上': { sets: 8, distance: 100, rest: '45秒', intensity: 'A1', intensityNote: '10秒心拍22-24' },
      '成人・マスターズ': { sets: 6, distance: 100, rest: '60秒', intensity: 'A1', intensityNote: '10秒心拍22-24（年齢補正-2-3）' },
    },
    持久力: {
      小学生: { sets: 6, distance: 100, rest: '20秒', intensity: 'EN1', intensityNote: '10秒心拍26-27（年齢補正+2-3）' },
      中学生: { sets: 8, distance: 100, rest: '20秒', intensity: 'EN1', intensityNote: '10秒心拍26-27（年齢補正+1-2）' },
      高校生: { sets: 10, distance: 100, rest: '20秒', intensity: 'EN1', intensityNote: '10秒心拍26-27' },
      '大学生以上': { sets: 10, distance: 100, rest: '20秒', intensity: 'EN1', intensityNote: '10秒心拍26-27' },
      '成人・マスターズ': { sets: 6, distance: 100, rest: '40秒', intensity: 'A2', intensityNote: '10秒心拍24-26（年齢補正-2-3）' },
    },
    その他: {
      小学生: { sets: 6, distance: 100, rest: '45秒', intensity: 'EN1', intensityNote: '10秒心拍26-27（年齢補正+2-3）' },
      中学生: { sets: 8, distance: 100, rest: '45秒', intensity: 'EN1', intensityNote: '10秒心拍26-27（年齢補正+1-2）' },
      高校生: { sets: 8, distance: 100, rest: '45秒', intensity: 'EN1', intensityNote: '10秒心拍26-27' },
      '大学生以上': { sets: 8, distance: 100, rest: '45秒', intensity: 'EN1', intensityNote: '10秒心拍26-27' },
      '成人・マスターズ': { sets: 6, distance: 100, rest: '60秒', intensity: 'A2', intensityNote: '10秒心拍24-26（年齢補正-2-3）' },
    },
  },
};

// ============================================================
// 期の定義
// ============================================================

const PERIOD_NAMES: Record<string, string> = {
  '1': 'リカバリー期',
  '2': '基礎形成期',
  '3': '発展形成期',
  '4': '強化期 (スピード持久力)',
  '5': '強化期 (耐乳酸)',
  '6': '調整期',
  '7': 'テーパー期',
};

/**
 * 期ごとのMain制御（カスタム専用）。
 * - リカバリー期: 耐乳酸MAX不要。強度を落としフォーム再構築に集中。
 * - 基礎形成期: 耐乳酸MAXは原則入れない。内容と強度を一致させる。
 * - 発展形成期: 変更なし。
 * - スピード持久期: 耐乳酸MAXは入れない。スピード×持久までに留める。
 * - 耐乳酸期: 現状維持。
 * - 調整期: 現状維持。
 * - テーパー期: 耐乳酸セットは入れない。短いスピード・テンポ調整に。
 */
const DEFAULT_MAIN_RULE: MainSetRule = {
  sets: 6,
  distance: 50,
  rest: '30秒',
  intensity: 'EN1',
  intensityNote: '10秒心拍26-27',
};

function getEffectiveMainRule(
  period: string,
  purposeType: PurposeType,
  distanceType: DistanceType,
  ageGroup: AgeGroup
): { mainRule: MainSetRule; effectivePurposeType: PurposeType } {
  const rules = MAIN_SET_RULES[distanceType];
  if (!rules) {
    return { mainRule: DEFAULT_MAIN_RULE, effectivePurposeType: purposeType };
  }

  const getRule = (p: PurposeType): MainSetRule =>
    rules[p]?.[ageGroup] || rules['その他']?.[ageGroup] || DEFAULT_MAIN_RULE;

  switch (period) {
    case '1': // リカバリー期: 強度を落とす。耐乳酸→技術相当に。
      if (purposeType === '耐乳酸' || purposeType === 'スピード') {
        return { mainRule: getRule('技術'), effectivePurposeType: '技術' };
      }
      const r1 = getRule(purposeType);
      if (['EN3', 'EN4', 'AN', 'AN1', 'AN2', 'AN3'].includes(r1.intensity)) {
        return {
          mainRule: { ...r1, intensity: 'EN2', intensityNote: '強度を落としフォーム再構築に集中' },
          effectivePurposeType: purposeType,
        };
      }
      return { mainRule: r1, effectivePurposeType: purposeType };

    case '2': // 基礎形成期: 耐乳酸MAXは原則入れない。
      if (purposeType === '耐乳酸') {
        return { mainRule: getRule('技術'), effectivePurposeType: '技術' };
      }
      return { mainRule: getRule(purposeType), effectivePurposeType: purposeType };

    case '3': // 発展形成期: 変更なし
    case '5': // 耐乳酸期: 現状維持
    case '6': // 調整期: 現状維持
      return { mainRule: getRule(purposeType), effectivePurposeType: purposeType };

    case '4': // スピード持久期: 耐乳酸MAXは入れない。スピード×持久まで。
      if (purposeType === '耐乳酸') {
        return { mainRule: getRule('持久力'), effectivePurposeType: '持久力' };
      }
      return { mainRule: getRule(purposeType), effectivePurposeType: purposeType };

    case '7': // テーパー期: 耐乳酸セットは入れない。短いスピード・テンポ調整に。
      if (purposeType === '耐乳酸') {
        return { mainRule: getRule('スピード'), effectivePurposeType: 'スピード' };
      }
      return { mainRule: getRule(purposeType), effectivePurposeType: purposeType };

    default:
      return { mainRule: getRule(purposeType), effectivePurposeType: purposeType };
  }
}

// ============================================================
// 種目の表示名
// ============================================================

const STROKE_NAMES: Record<string, string> = {
  FR: 'FR（自由形）',
  Fr: 'Fr（自由形）',
  Ba: 'Ba（背泳）',
  Br: 'Br（平泳）',
  Fly: 'Fly（バタフライ）',
  IM: '個人メドレー',
  S1: 'S1（スタイル1）',
};

// ============================================================
// サークル記入
// ============================================================

function formatCircle(circleMethod: string, _rest: string): string {
  if (!circleMethod || circleMethod === '3') return '';
  return ` @${_rest}`;
}

// ============================================================
// 各ブロック生成ロジック
// ============================================================

/** W-up: 種目は Cho 固定。本文に種目名を入れない。 */
function generateWarmUp(ageGroup: AgeGroup, practiceTime: string): string {
  const time = parseInt(practiceTime, 10);
  let distance = 200;
  if (time >= 120) distance = 300;
  else if (time >= 90) distance = 250;
  else if (time >= 60) distance = 200;
  return `${distance}m（A1）`;
}

/** 入力に応じて0〜max-1のインデックスを決める（同じ入力なら同じ値） */
function pickIndex(seed: string, max: number): number {
  let n = 0;
  for (let i = 0; i < seed.length; i++) n += seed.charCodeAt(i);
  return Math.abs(n) % max;
}

/** 種目キー正規化（Fr → FR 等、辞書参照用） */
function normalizeStrokeKey(stroke: string): string {
  if (stroke === 'Fr' || stroke === 'fr') return 'FR';
  return stroke;
}

function generateDrill(
  stroke: string,
  ageGroup: AgeGroup,
  _purposeType: PurposeType,
  period: string
): string {
  const strokeKey = normalizeStrokeKey(stroke);
  const drills: Record<string, string[]> = {
    FR: ['キャッチアップ / 片手右', 'odd: 片手左 / even: 片手右', 'Form & Des'],
    Fr: ['キャッチアップ / 片手右', 'odd: 片手左 / even: 片手右', 'Form & Des'],
    Ba: ['片手左 / 片手右', 'odd: 片手左 / even: 片手右', 'Form & Des'],
    Br: ['Brキックドリル / Brプルドリル', '2キック1プル', 'タイミングドリル'],
    Fly: ['片キック（左）/ 片キック（右）', '1キック1プル', 'ドルフィンキック'],
    IM: ['4泳法ドリル順（Fr→Ba→Br→Fly）', 'odd: IM Order / even: 専門種目', 'Form & Des'],
    S1: ['専門種目ドリル', 'Form & Des', 'odd: ドリル / even: Swim'],
  };
  const strokeDrills = drills[strokeKey] || ['Form & Des'];
  const idx = pickIndex(stroke + period, strokeDrills.length);
  const drillName = strokeDrills[idx];
  const sets = ageGroup === '小学生' ? 4 : 6;
  const distance = ageGroup === '小学生' ? 25 : 50;
  return `${drillName} ${sets}×${distance}m`;
}

function generateKick(
  ageGroup: AgeGroup,
  practiceTime: string,
  purposeType: PurposeType,
  period: string
): string {
  const time = parseInt(practiceTime, 10);
  let sets = 4;
  const distance = 50;

  if (ageGroup === '小学生') {
    sets = time >= 120 ? 8 : time >= 90 ? 6 : 4;
  } else if (ageGroup === '中学生') {
    sets = time >= 120 ? 6 : time >= 90 ? 5 : 4;
  } else {
    sets = time >= 120 ? 6 : time >= 90 ? 4 : 4;
  }

  let intensity = 'EN1';
  if (purposeType === '耐乳酸') intensity = 'EN2';

  return `キック ${sets}×${distance}m（${intensity}）`;
}

function generatePull(
  stroke: string,
  _ageGroup: AgeGroup,
  practiceTime: string,
  _period: string
): string {
  const time = parseInt(practiceTime, 10);
  const sets = time >= 120 ? 6 : time >= 90 ? 5 : 4;
  const distance = 50;
  if (stroke === 'Br') {
    return `プル（専門） ${sets}×${distance}m`;
  }
  return `プル ${sets}×${distance}m`;
}

function generatePreMain(
  distanceType: DistanceType,
  purposeType: PurposeType,
  ageGroup: AgeGroup
): string {
  const distance = distanceType === 'S' ? 25 : distanceType === 'M' ? 50 : 100;
  const sets = ageGroup === '小学生' ? 2 : 3;

  let intensity = 'EN1';
  if (purposeType === '耐乳酸') intensity = 'EN2';
  if (purposeType === '心肺') intensity = 'EN1';

  return `Pre-Main ${sets}×${distance}m（${intensity}）`;
}

function generateRest(condition: string, purposeType: PurposeType): string {
  if (condition.includes('疲労') || purposeType === '耐乳酸' || purposeType === 'スピード') {
    return 'Rest / Free time（5~10min）';
  }
  return '';
}

function generateMain(
  _distanceType: DistanceType,
  _purposeType: PurposeType,
  _ageGroup: AgeGroup,
  circleMethod: string,
  mainRule: MainSetRule
): string {
  const circle = formatCircle(circleMethod, mainRule.rest);
  return `Main ${mainRule.sets}×${mainRule.distance}m${circle}（${mainRule.intensity}）`;
}

/** Down: 種目は Cho 固定。本文に種目名を入れない。 */
function generateDown(practiceTime: string): string {
  const time = parseInt(practiceTime, 10);
  const distance = time >= 120 ? 200 : time >= 90 ? 150 : 100;
  return `Easy Swim ${distance}m（A1）`;
}

/**
 * Diveは調整期・テーパー期が中心。
 * リカバリー・基礎形成・発展形成・スピード持久・耐乳酸期では入れない。
 */
function generateDive(ageGroup: AgeGroup, period: string): string {
  if (!['6', '7'].includes(period)) return '';
  const sets = ageGroup === '小学生' ? 4 : ageGroup === '中学生' ? 6 : 8;
  return `Dive ${sets}×15m（A1）`;
}

// ============================================================
// 合計距離計算
// ============================================================

function calculateTotal(
  warmUp: string,
  drill: string,
  kick: string,
  pull: string,
  preMain: string,
  dive: string,
  main: string,
  down: string
): number {
  const extractDistance = (text: string): number => {
    const match = text.match(/(\d+)m/);
    return match ? parseInt(match[1], 10) : 0;
  };

  const extractSets = (text: string): number => {
    const match = text.match(/(\d+)×/);
    return match ? parseInt(match[1], 10) : 1;
  };

  let total = 0;

  // W-up
  const warmUpMatch = warmUp.match(/(\d+)m/);
  if (warmUpMatch) total += parseInt(warmUpMatch[1], 10);
  const warmUpMatch2 = warmUp.match(/\+.*?(\d+)m/);
  if (warmUpMatch2) total += parseInt(warmUpMatch2[1], 10);

  // Drill
  const drillDistance = extractDistance(drill);
  const drillSets = extractSets(drill);
  total += drillDistance * drillSets;

  // Kick
  const kickDistance = extractDistance(kick);
  const kickSets = extractSets(kick);
  total += kickDistance * kickSets;

  // Pull
  const pullDistance = extractDistance(pull);
  const pullSets = extractSets(pull);
  total += pullDistance * pullSets;

  // Pre-Main
  const preMainDistance = extractDistance(preMain);
  const preMainSets = extractSets(preMain);
  total += preMainDistance * preMainSets;

  // Dive
  const diveDistance = extractDistance(dive);
  const diveSets = extractSets(dive);
  total += diveDistance * diveSets;

  // Main
  const mainDistance = extractDistance(main);
  const mainSets = extractSets(main);
  total += mainDistance * mainSets;

  // Down
  const downDistance = extractDistance(down);
  total += downDistance;

  return total;
}

// ============================================================
// 目的・意図・ポイント生成
// ============================================================

function generatePurposeText(
  _period: string,
  purposeType: PurposeType,
  _distanceType: DistanceType,
  _stroke: string
): string {
  const purposeTexts: Record<PurposeType, string> = {
    耐乳酸: 'フォーム維持を最優先にした耐乳酸トレーニング',
    心肺: '心肺機能向上と持久力強化',
    技術: '技術精度向上とフォーム固め',
    スピード: 'スピード感覚の向上と反応速度の向上',
    フォーム: 'フォームの再確認と効率化',
    持久力: '持久力の向上とレースペースの維持',
    その他: '総合的な泳力向上',
  };

  return `今日の狙い：${purposeTexts[purposeType]}`;
}

function generateIntention(
  purposeType: PurposeType,
  _mainRule: MainSetRule
): string {
  const intentions: Record<PurposeType, string> = {
    耐乳酸: 'フォームを崩さずに乳酸耐性を向上させる',
    心肺: '心肺機能を高め、持久力を強化する',
    技術: '技術の精度を上げ、効率的な泳ぎを身につける',
    スピード: 'スピード感覚を養い、反応速度を向上させる',
    フォーム: '正しいフォームを再確認し、効率化を図る',
    持久力: '持久力を向上させ、レースペースでの持続力を高める',
    その他: '総合的な泳力向上を目指す',
  };

  return intentions[purposeType] || '泳力向上を目指す';
}

function generateCoachingPoint(
  purposeType: PurposeType,
  ageGroup: AgeGroup,
  mainRule: MainSetRule
): string {
  if (ageGroup === '小学生') {
    return 'Mainセットではフォーム維持を最優先。年齢に応じた強度で実施。';
  }
  if (ageGroup === '成人・マスターズ') {
    return 'Mainセットでは安全を最優先。フォームが崩れたら強度を下げる。';
  }
  return `Mainセットではフォーム維持を最優先。${mainRule.intensityNote}を意識して実施。`;
}

function generateCaution(
  condition: string,
  ageGroup: AgeGroup,
  purposeType: PurposeType
): string {
  if (condition.includes('疲労')) {
    return '疲労が溜まっている場合は本数を減らすか、強度を下げる。';
  }
  if (ageGroup === '成人・マスターズ') {
    return '無理をせず、体調に応じて調整する。';
  }
  if (purposeType === '耐乳酸' || purposeType === 'スピード') {
    return 'フォームが崩れたら強度を下げる。';
  }
  return '体調に応じて調整する。';
}

function generateExpectedEffect(
  purposeType: PurposeType,
  _distanceType: DistanceType
): string {
  const effects: Record<PurposeType, string> = {
    耐乳酸: 'レースペースでの持続力向上',
    心肺: '心肺機能の向上と持久力の強化',
    技術: '技術の精度向上と効率的な泳ぎの習得',
    スピード: 'スピード感覚の向上と反応速度の向上',
    フォーム: '正しいフォームの定着と効率化',
    持久力: '持久力の向上とレースペースの維持',
    その他: '総合的な泳力向上',
  };

  return effects[purposeType] || '泳力向上';
}

// ============================================================
// メイン生成関数
// ============================================================

/** 9通りテンプレ（距離タイプ S/M/D ごとに候補配列）。PDF「自動生成メニュー - 9通り」をJSON化したもの。 */
export type MenuTemplates9 = { S: unknown[]; M: unknown[]; D: unknown[] };

/** 共通・ローカル・クイックアルゴリズム・9通りテンプレ用（content から取得） */
export interface GeneratorContentOptions {
  commonContent?: string;
  localContent?: string;
  quickAlgorithmContent?: string;
  /** 9通りメニュー。ある場合は距離タイプ最優先でここから1つ選ぶ */
  menuTemplates9?: MenuTemplates9 | null;
}

const TRAINING_RESULT_KEYS: (keyof TrainingResult)[] = [
  'purpose', 'warmUp', 'drill', 'kick', 'pull', 'preMain', 'dive', 'rest',
  'main', 'down', 'total', 'intention', 'coachingPoint', 'caution', 'expectedEffect',
];

function isTrainingResultLike(obj: unknown): obj is TrainingResult {
  if (!obj || typeof obj !== 'object') return false;
  return TRAINING_RESULT_KEYS.every((k) => typeof (obj as Record<string, unknown>)[k] === 'string');
}

/**
 * 10条件に合わせたテンプレ選択（スコアリング＋タイブレーク）。
 * - 軸: distanceType（S/M/D）でグループを決める。
 * - スコア: 各テンプレの purpose/intention/expectedEffect 等をキーワードマッチでスコアリング。
 * - 同点時: pickIndex(seed, N) で上位N件から1つ選ぶ（決定論を維持）。
 */
function scoreTemplateMatch(c: TrainingResult, input: TrainingInput): number {
  const text = [
    c.purpose ?? '',
    c.intention ?? '',
    c.coachingPoint ?? '',
    c.expectedEffect ?? '',
    c.main ?? '',
  ].join(' ');

  let score = 0;

  // 期（period）: テンプレの目的・意図に含まれるキーワードと照合
  const periodKeywords: Record<string, string[]> = {
    '1': ['回復', '感覚維持', 'フォーム再構築', '姿勢安定', 'リラックス', '解放'],
    '2': ['基礎形成', 'フォーム固め', '水感覚', '正しい形', '低～中強度', '再現性'],
    '3': ['発展', '技術精度', 'スピード導入', '強度を上げ', '粘り', '神経系'],
    '4': ['心肺', 'ボリューム', '持久', '一定の強度', 'バランス'],
    '5': ['耐乳酸', 'レースペース', '乳酸', '耐性'],
    '6': ['調整', '疲労除去', 'スピード維持'],
    '7': ['テーパー', '神経', '仕上げ', '最大スピード', 'レース局面'],
  };
  const pKw = periodKeywords[input.period];
  if (pKw) {
    for (const kw of pKw) {
      if (text.includes(kw)) score += 2;
    }
  }

  // 目的（期から導出）
  const purposeKeywords: Record<string, string[]> = {
    技術: ['フォーム', '技術', '姿勢', '形', 'ドリル'],
    スピード: ['スピード', '爆発', '動きのキレ', '反応'],
    耐乳酸: ['耐乳酸', 'レース', '粘り', '耐性'],
    持久: ['持久', '距離', '省エネ', '効率'],
    心肺: ['心肺', '回復', 'リラックス', '楽に', '解放'],
    その他: ['フォーム', '技術', '泳力'],
  };
  const derivedPurpose = derivePurposeFromPeriod(input.period);
  const purKw = purposeKeywords[derivedPurpose];
  if (purKw) {
    for (const kw of purKw) {
      if (text.includes(kw)) score += 2;
    }
  }

  // 状況（condition）
  if (input.condition?.includes('疲労')) {
    if (text.includes('休息') || text.includes('軽め') || text.includes('リラックス')) score += 2;
  }
  if (input.condition === '月経期') {
    if (text.includes('本人') || text.includes('希望')) score += 2;
  }

  // 種目（stroke）: テンプレの内容に種目が含まれるか
  const strokeMap: Record<string, string> = {
    Fr: 'Fr', Ba: 'Ba', Br: 'Br', Fly: 'Fly', IM: 'IM',
  };
  const strokeStr = strokeMap[input.stroke] || input.stroke;
  if (strokeStr && (c.drill?.includes(strokeStr) || c.kick?.includes(strokeStr) || c.pull?.includes(strokeStr) || c.main?.includes(strokeStr))) {
    score += 1;
  }
  if (input.stroke === 'IM' && text.includes('IM')) score += 1;

  // 距離: total の距離とユーザー選択距離の近さ（Quick では最重要）
  const totalMatch = c.total?.match(/(\d[\d,]*)\s*m/);
  const totalM = totalMatch ? parseInt(totalMatch[1].replace(/,/g, ''), 10) : 0;
  const targetM = parseInt(input.distance || '4000', 10);
  if (targetM > 0 && totalM > 0) {
    const diff = Math.abs(totalM - targetM);
    if (diff <= 200) score += 10;       // ±200m: ほぼ一致
    else if (diff <= 400) score += 6;   // ±400m: 良い一致
    else if (diff <= 600) score += 3;   // ±600m: 許容範囲
    else if (diff <= 1000) score += 1;  // ±1000m: やや離れている
  }

  return score;
}

/** テンプレの total から距離（m）を抽出 */
function parseTemplateTotalM(c: TrainingResult): number {
  const match = c.total?.match(/(\d[\d,]*)\s*m/);
  return match ? parseInt(match[1].replace(/,/g, ''), 10) : 0;
}

function selectFrom9Templates(input: TrainingInput, templates: MenuTemplates9): TrainingResult | null {
  const distanceType = (input.distanceType === 'S' || input.distanceType === 'M' || input.distanceType === 'D')
    ? input.distanceType
    : 'M';
  const rawList = templates[distanceType];
  if (!rawList?.length) return null;
  const list = rawList.filter((c): c is TrainingResult => {
    if (!isTrainingResultLike(c)) return false;
    return (c.purpose?.trim() || c.main?.trim() || c.warmUp?.trim()) !== '';
  });
  if (!list.length) return null;

  const targetM = parseInt(input.distance || '4000', 10);

  // スコア＋距離差でソート。スコア優先、同点時は距離差が小さい方を優先
  const scored = list.map((c, i) => {
    const score = scoreTemplateMatch(c, input);
    const totalM = parseTemplateTotalM(c);
    const distanceDiff = targetM > 0 ? Math.abs(totalM - targetM) : 0;
    return { template: c, score, distanceDiff, index: i };
  });
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    // 同点時: 選択距離に近いテンプレを優先
    if (a.distanceDiff !== b.distanceDiff) return a.distanceDiff - b.distanceDiff;
    return a.index - b.index;
  });

  // 最高スコアかつ距離差最小の同点候補から、シードで1つ選ぶ（決定論）
  const maxScore = scored[0]?.score ?? 0;
  const minDiff = scored[0]?.distanceDiff ?? 0;
  const topCandidates = scored.filter(
    (s) => s.score === maxScore && s.distanceDiff === minDiff
  );
  const seed = [
    input.period, input.stroke, input.distance, input.age, input.distanceType,
    input.level, input.condition, input.practiceTime,
  ].join('');
  const idx = pickIndex(seed, topCandidates.length);
  return topCandidates[idx]?.template ?? list[0];
}

export function generateTrainingMenu(
  input: TrainingInput,
  options?: GeneratorContentOptions
): TrainingResult | null {
  // クイック作成：100%テンプレートに沿って出力。アルゴリズムは一切使わず、テンプレの内容をそのまま返す。
  const templates9 = options?.menuTemplates9;
  if (templates9 !== undefined) {
    if (templates9 == null || (!templates9.S?.length && !templates9.M?.length && !templates9.D?.length)) {
      return null;
    }
    const selected = selectFrom9Templates(input, templates9);
    if (selected) return { ...selected }; // テンプレのコピーのみ返却（アルゴリズム由来のフィールドは一切混入させない）
    return null;
  }

  const ageGroup = getAgeGroup(input.age);
  const purposeType = derivePurposeFromPeriod(input.period);
  const distanceType = input.distanceType as DistanceType;

  // Main Set ルール取得（期ごとの制御を適用：耐乳酸MAXは耐乳酸期のみ等）
  const { mainRule, effectivePurposeType } = getEffectiveMainRule(
    input.period,
    purposeType,
    distanceType,
    ageGroup
  );

  // 各ブロック生成
  const warmUp = generateWarmUp(ageGroup, input.practiceTime);
  const drill = generateDrill(input.stroke, ageGroup, purposeType, input.period);
  const kick = generateKick(ageGroup, input.practiceTime, purposeType, input.period);
  const pull = generatePull(input.stroke, ageGroup, input.practiceTime, input.period);
  const preMain = generatePreMain(distanceType, purposeType, ageGroup);
  const dive = generateDive(ageGroup, input.period);
  const rest = generateRest(input.condition, purposeType);
  const main = generateMain(distanceType, effectivePurposeType, ageGroup, '', mainRule);
  const down = generateDown(input.practiceTime);

  // 合計距離計算
  const totalDistance = calculateTotal(warmUp, drill, kick, pull, preMain, dive, main, down);

  // 目的・意図・ポイント生成（actualのMain内容に合わせてeffectivePurposeTypeを使用）
  const purpose = generatePurposeText(input.period, purposeType, distanceType, input.stroke);
  const intention = generateIntention(effectivePurposeType, mainRule);
  const coachingPoint = generateCoachingPoint(effectivePurposeType, ageGroup, mainRule);
  const caution = generateCaution(input.condition, ageGroup, purposeType);
  const expectedEffect = generateExpectedEffect(effectivePurposeType, distanceType);

  return {
    purpose,
    warmUp,
    drill,
    kick,
    pull,
    preMain,
    dive,
    rest,
    main,
    down,
    total: `合計距離：${totalDistance.toLocaleString()}m`,
    intention,
    coachingPoint,
    caution,
    expectedEffect,
  };
}
