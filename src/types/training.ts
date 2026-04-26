// ============================================================
// Training Story Architecture — 型定義
// AIは提案のみ、判断は常に人間（コーチ/選手）
// ============================================================

export type PeriodKey = '1' | '2' | '3' | '4' | '5' | '6' | '7';
export type SessionStatus = 'planned' | 'done' | 'skipped';
export type FatigueLevel = 1 | 2 | 3 | 4 | 5;
export type UserRole = 'user' | 'admin' | 'coach';

// ── 期メタデータ ───────────────────────────────────────────

export const PERIOD_META: Record<PeriodKey, {
  label: string;
  short: string;
  color: string;       // Tailwind bg class
  textColor: string;   // Tailwind text class
  borderColor: string;
  intensityLabel: string;
  description: string;
}> = {
  '1': { label: 'リカバリー',  short: '回復',    color: 'bg-slate-100',   textColor: 'text-slate-600',  borderColor: 'border-slate-300',  intensityLabel: 'EN2以下',  description: '疲労回復・基礎固め' },
  '2': { label: '基礎形成',   short: '基礎',    color: 'bg-blue-50',     textColor: 'text-blue-700',   borderColor: 'border-blue-300',   intensityLabel: 'EN3',      description: '有酸素基盤・フォーム構築' },
  '3': { label: '発展形成',   short: '発展',    color: 'bg-teal-50',     textColor: 'text-teal-700',   borderColor: 'border-teal-300',   intensityLabel: 'EN3〜AN1', description: 'EN強度・技術発展' },
  '4': { label: '強化 (SL)',  short: 'SL強化',  color: 'bg-orange-50',   textColor: 'text-orange-700', borderColor: 'border-orange-300', intensityLabel: 'AN1',      description: 'スピード持久力強化' },
  '5': { label: '強化 (AN)',  short: 'AN強化',  color: 'bg-red-50',      textColor: 'text-red-700',    borderColor: 'border-red-300',    intensityLabel: 'AN2〜MAX', description: '耐乳酸・高強度' },
  '6': { label: '調整期',    short: '調整',    color: 'bg-violet-50',   textColor: 'text-violet-700', borderColor: 'border-violet-300', intensityLabel: 'EN1〜AN1', description: 'レース調整・量を落とす' },
  '7': { label: 'テーパー',   short: 'テーパー', color: 'bg-amber-50',    textColor: 'text-amber-700',  borderColor: 'border-amber-300',  intensityLabel: 'A1〜EN1',  description: '最終調整・ピーキング' },
};

// ── DB エンティティ ────────────────────────────────────────

export interface SecondaryMeet {
  date: string;   // ISO date
  name: string;
}

export interface TrainingPlan {
  id: string;
  user_id: string;
  name: string;
  goal_event: string;
  goal_distance_type: 'S' | 'M' | 'D';
  goal_time_sec: number | null;
  goal_meet_date: string;       // ISO date（Aマーク・期配分の基準）
  goal_meet_name: string | null;
  secondary_meets: SecondaryMeet[];  // B/Cマーク（タイムライン表示のみ）
  start_date: string;           // ISO date
  level: string;
  stroke_primary: string;
  coach_memo: string | null;    // コーチの思想・制約（AI prompt に注入）
  is_active: boolean;
  ai_memo: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface TrainingCycle {
  id: string;
  plan_id: string;
  period: PeriodKey;
  start_date: string;
  end_date: string;
  target_weekly_volume_m: number | null;
  notes: string | null;
  created_at: string;
}

export interface TrainingSession {
  id: string;
  plan_id: string;
  user_id: string;
  cycle_id: string | null;
  scheduled_date: string;
  menu_id: string | null;
  status: SessionStatus;

  // AI提案（コーチが上書き可能）
  ai_suggested_period: PeriodKey | null;
  ai_suggested_distance_m: number | null;
  ai_suggested_condition: string | null;
  ai_suggestion_reason: string | null;

  // コーチ/選手上書き
  override_period: PeriodKey | null;
  override_distance_m: number | null;
  override_condition: string | null;
  coach_note: string | null;

  // 実績
  actual_distance_m: number | null;
  actual_duration_min: number | null;
  fatigue_before: FatigueLevel | null;
  fatigue_after: FatigueLevel | null;
  athlete_note: string | null;
  ai_feedback: string | null;

  created_at: string;
  updated_at: string;
}

export interface CoachAthlete {
  id: string;
  coach_id: string;
  athlete_id: string;
  created_at: string;
}

// ── AI提案型 ──────────────────────────────────────────────

export interface TodaySuggestion {
  period: PeriodKey;
  distance_m: number;
  condition: string;
  stroke: string;
  distance_type: 'S' | 'M' | 'D';
  reason: string;                   // 「なぜその提案か」
  warning: string | null;           // 試合前ガード警告
  days_to_meet: number;
  intensity_ceiling: string | null; // 試合前制限がある場合の強度上限
  context: SessionContext;
}

export interface SessionContext {
  plan_id: string;
  current_period: PeriodKey;
  days_to_meet: number;
  days_since_last_session: number | null;
  last_sessions: RecentSession[];
  avg_fatigue_7days: number | null;
  weekly_volume_done_m: number;
  weekly_volume_target_m: number | null;
  coach_memo: string | null;
  intensity_ceiling_step: number | null;
  goal_context: string | null;          // 目標シートから抽出した選手の目標・課題
  recent_menu_intentions: string[];     // 直近3回の生成メニューのintention（重複防止用）
}

export interface RecentSession {
  date: string;
  distance_m: number | null;
  fatigue_after: FatigueLevel | null;
  period: PeriodKey | null;
  status: SessionStatus;
  athlete_note: string | null;          // 選手の感想・メモ（次回生成に反映）
}

// ── 期自動配分 ────────────────────────────────────────────

export interface PeriodAllocation {
  period: PeriodKey;
  start_date: string;
  end_date: string;
  weeks: number;
  target_weekly_volume_m: number;
}

// ── フォーム用 ────────────────────────────────────────────

export interface CreatePlanInput {
  name: string;
  goal_event: string;
  goal_distance_type: 'S' | 'M' | 'D';
  goal_time_sec: number | null;
  goal_meet_date: string;
  goal_meet_name: string | null;
  start_date: string;
  level: string;
  stroke_primary: string;
  coach_memo: string | null;
}
