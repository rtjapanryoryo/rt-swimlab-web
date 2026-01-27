/**
 * RT-japan 水泳練習メニュー自動生成ロジック
 * RT_PROTOCOL.md に基づく決定論的生成（同じ入力 → 同じ出力）
 */

// ============================================================
// 型定義
// ============================================================

export interface TrainingInput {
  period: string; // ①〜⑦
  stroke: string; // FR, Ba, Br, Fly, IM
  gender: string; // 男, 女
  age: string; // 年齢（数値）
  distanceType: string; // S, M, D
  level: string; // A, B, C, D, M1, M2, M3, M4
  purpose: string; // 目的（対乳酸、心肺、技術、スピードなど）
  condition: string; // 通常、疲労、調整
  practiceTime: string; // 60, 90, 120
  volumeUp: string; // ドリル、キック、プル、プレメイン、メイン
}

export interface TrainingResult {
  purpose: string;
  warmUp: string;
  drill: string;
  kick: string;
  pull: string;
  preMain: string;
  rest: string;
  main: string;
  down: string;
  total: string;
  intention: string;
  coachingPoint: string;
  caution: string;
  expectedEffect: string;
}

export type DistanceType = 'S' | 'M' | 'D';
export type PurposeType = '対乳酸' | '心肺' | '技術' | 'スピード' | 'フォーム' | '持久力' | 'その他';
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
  if (purpose.includes('対乳酸') || purpose.includes('乳酸')) return '対乳酸';
  if (purpose.includes('持久力') || purpose.includes('持久')) return '持久力';
  if (purpose.includes('心肺')) return '心肺';
  if (purpose.includes('技術') || purpose.includes('フォーム')) return '技術';
  if (purpose.includes('スピード') || purpose.includes('速く')) return 'スピード';
  if (purpose.includes('レースペース')) return '対乳酸'; // レースペースは対乳酸として扱う
  if (purpose.includes('回復')) return '心肺'; // 回復は心肺として扱う
  return 'その他';
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
    対乳酸: {
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
    対乳酸: {
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
    対乳酸: {
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
  '4': '強化期①',
  '5': '強化期②',
  '6': '調整期',
  '7': 'テーパー期',
};

// ============================================================
// 種目の表示名
// ============================================================

const STROKE_NAMES: Record<string, string> = {
  FR: 'FR（自由形）',
  Ba: 'Ba（背泳）',
  Br: 'Br（平泳）',
  Fly: 'Fly（バタフライ）',
  IM: 'IM（個人メドレー）',
};

// ============================================================
// サークル記入
// ============================================================

function formatCircle(circleMethod: string, rest: string): string {
  if (circleMethod === '3') return ''; // サークル不要
  return ` @${rest}`;
}

// ============================================================
// 各ブロック生成ロジック
// ============================================================

function generateWarmUp(
  stroke: string,
  ageGroup: AgeGroup,
  practiceTime: string
): string {
  const time = parseInt(practiceTime, 10);
  let distance = 200;

  if (time >= 120) distance = 300;
  else if (time >= 90) distance = 250;

  if (stroke === 'Br') {
    return `${STROKE_NAMES[stroke] || stroke} ${distance}m（A1）`;
  }

  if (ageGroup === '小学生') {
    return `FR ${distance}m + IM 50m（A1）`;
  }

  return `FR ${distance}m + IM 100m（A1）`;
}

function generateDrill(
  stroke: string,
  ageGroup: AgeGroup
): string {
  const drills: Record<string, string[]> = {
    FR: ['片手ドリル', 'キャッチアップ', 'フィストスイム', '片手＋キック'],
    Ba: ['片手ドリル', '片手＋キック', 'ダブルアーム'],
    Br: ['片手ドリル', 'キックのみ', 'プル＋キック'],
    Fly: ['片手ドリル', 'キックのみ', '片手＋キック'],
    IM: ['各泳法のドリル', 'IMドリル'],
  };

  const strokeDrills = drills[stroke] || ['ドリル'];
  const drillName = strokeDrills[0];
  const sets = ageGroup === '小学生' ? 4 : 6;
  const distance = ageGroup === '小学生' ? 25 : 50;

  return `${drillName} ${sets}×${distance}m（左右交互）`;
}

function generateKick(
  ageGroup: AgeGroup,
  practiceTime: string,
  purposeType: PurposeType
): string {
  const time = parseInt(practiceTime, 10);
  let sets = 4;
  let distance = 50;

  // Kick比率に基づく調整
  if (ageGroup === '小学生') {
    sets = time >= 120 ? 8 : time >= 90 ? 6 : 4;
    distance = 50;
  } else if (ageGroup === '中学生') {
    sets = time >= 120 ? 6 : time >= 90 ? 5 : 4;
    distance = 50;
  } else {
    sets = time >= 120 ? 6 : time >= 90 ? 4 : 4;
    distance = 50;
  }

  let intensity = 'EN1';
  if (purposeType === '対乳酸') intensity = 'EN2';
  if (purposeType === '心肺') intensity = 'EN1';

  // ボードの有無を決定（小学生・中学生はボード、高校生以上は交互またはノーボード）
  // 目的が技術・フォームの場合はボード、対乳酸・スピードの場合はノーボード
  let boardInfo = '（ボード）';
  if (purposeType === '対乳酸' || purposeType === 'スピード') {
    boardInfo = '（ノーボード）';
  } else if (ageGroup === '高校生' || ageGroup === '大学生以上') {
    // 高校生以上は交互に（偶数セットはボード、奇数セットはノーボード）
    // ここでは簡易的に、セット数が4以上の場合は交互を想定
    if (sets >= 6) {
      boardInfo = '（ボード・ノーボード交互）';
    } else {
      boardInfo = '（ボード）';
    }
  }

  return `キック ${sets}×${distance}m${boardInfo}（10秒心拍${intensity === 'EN1' ? '26-27' : '28前後'}）`;
}

function generatePull(
  stroke: string,
  ageGroup: AgeGroup,
  practiceTime: string
): string {
  const time = parseInt(practiceTime, 10);
  const sets = time >= 120 ? 6 : time >= 90 ? 5 : 4;
  const distance = 50;

  if (stroke === 'Br') {
    return `プル（専門） ${sets}×${distance}m（肩甲骨・体幹意識）`;
  }

  return `プル ${sets}×${distance}m（肩甲骨意識）`;
}

function generatePreMain(
  distanceType: DistanceType,
  purposeType: PurposeType,
  ageGroup: AgeGroup
): string {
  const distance = distanceType === 'S' ? 25 : distanceType === 'M' ? 50 : 100;
  const sets = ageGroup === '小学生' ? 2 : 3;

  let intensity = 'EN1';
  if (purposeType === '対乳酸') intensity = 'EN2';
  if (purposeType === '心肺') intensity = 'EN1';

  return `Pre-Main ${sets}×${distance}m（${intensity}）`;
}

function generateRest(condition: string, purposeType: PurposeType): string {
  if (condition === '疲労') {
    return '立ち休憩 5分';
  }
  if (purposeType === '対乳酸' || purposeType === 'スピード') {
    return '立ち休憩 3分';
  }
  return '';
}

function generateMain(
  distanceType: DistanceType,
  purposeType: PurposeType,
  ageGroup: AgeGroup,
  circleMethod: string,
  mainRule: MainSetRule
): string {
  const circle = formatCircle(circleMethod, mainRule.rest);
  return `Main ${mainRule.sets}×${mainRule.distance}m${circle}（${mainRule.intensity}）`;
}

function generateDown(practiceTime: string): string {
  const time = parseInt(practiceTime, 10);
  const distance = time >= 120 ? 200 : time >= 90 ? 150 : 100;
  return `Easy Swim ${distance}m（A1）`;
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
  period: string,
  purposeType: PurposeType,
  distanceType: DistanceType,
  stroke: string
): string {
  const purposeTexts: Record<PurposeType, string> = {
    対乳酸: 'フォーム維持を最優先にした対乳酸トレーニング',
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
    対乳酸: 'フォームを崩さずに乳酸耐性を向上させる',
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
  if (condition === '疲労') {
    return '疲労が溜まっている場合は本数を減らすか、強度を下げる。';
  }
  if (ageGroup === '成人・マスターズ') {
    return '無理をせず、体調に応じて調整する。';
  }
  if (purposeType === '対乳酸' || purposeType === 'スピード') {
    return 'フォームが崩れたら強度を下げる。';
  }
  return '体調に応じて調整する。';
}

function generateExpectedEffect(
  purposeType: PurposeType,
  _distanceType: DistanceType
): string {
  const effects: Record<PurposeType, string> = {
    対乳酸: 'レースペースでの持続力向上',
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

export function generateTrainingMenu(input: TrainingInput): TrainingResult {
  const ageGroup = getAgeGroup(input.age);
  const purposeType = getPurposeType(input.purpose);
  const distanceType = input.distanceType as DistanceType;

  // Main Set ルール取得
  const mainRule = MAIN_SET_RULES[distanceType]?.[purposeType]?.[ageGroup] || {
    sets: 6,
    distance: 50,
    rest: '30秒',
    intensity: 'EN1',
    intensityNote: '10秒心拍26-27',
  };

  // 各ブロック生成
  const warmUp = generateWarmUp(input.stroke, ageGroup, input.practiceTime);
  const drill = generateDrill(input.stroke, ageGroup);
  const kick = generateKick(ageGroup, input.practiceTime, purposeType);
  const pull = generatePull(input.stroke, ageGroup, input.practiceTime);
  const preMain = generatePreMain(distanceType, purposeType, ageGroup);
  const rest = generateRest(input.condition, purposeType);
  // volumeUpは将来的に使用予定（現在は互換性のため空文字列を使用）
  const main = generateMain(distanceType, purposeType, ageGroup, '', mainRule);
  const down = generateDown(input.practiceTime);

  // 合計距離計算
  const totalDistance = calculateTotal(warmUp, drill, kick, pull, preMain, main, down);

  // 目的・意図・ポイント生成
  const purpose = generatePurposeText(input.period, purposeType, distanceType, input.stroke);
  const intention = generateIntention(purposeType, mainRule);
  const coachingPoint = generateCoachingPoint(purposeType, ageGroup, mainRule);
  const caution = generateCaution(input.condition, ageGroup, purposeType);
  const expectedEffect = generateExpectedEffect(purposeType, distanceType);

  return {
    purpose,
    warmUp,
    drill,
    kick,
    pull,
    preMain,
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
