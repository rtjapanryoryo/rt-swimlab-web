export type GoalSheetLevel = 'beginner' | 'intermediate' | 'advanced';

// ── 初級 ─────────────────────────────────────────────────────
export interface BeginnerContent {
  // ① 夢・ビジョン
  why: string;
  vision_deadline: string;
  vision_how: string;
  // ② 今の自分
  current_event: string;
  current_best_time: string;
  current_strengths: string;
  current_weaknesses: string;
  current_concern: string;
  // ③ 目標を段階に
  goal_this_week: string;
  goal_tomorrow: string;
  // ④ 振り返り
  reflection_did: string;
  reflection_next: string;
  reflection_satisfaction: number; // 1-5
}

// ── 中級 ─────────────────────────────────────────────────────
export interface IntermediateContent {
  // ① ビジョン
  vision_deadline: string;
  vision_event: string;
  vision_target_time: string;
  vision_player_type: string;
  // ② 現在の自分を数字で
  current_event: string;
  current_best_time: string;
  current_race_first: string;
  current_race_second: string;
  current_stroke: string;
  current_turn: string;
  current_strengths: string;
  current_improvements: string;
  // ③ シーズン目標
  season_meet: string;
  season_time: string;
  season_swimming: string;
  // ③ 半年後
  midterm_time: string;
  midterm_strength: string;
  midterm_form: string;
  // ③ 今月
  monthly_main: string;
  monthly_conditioning: string;
  monthly_technique: string;
  // ③ 今週
  weekly_quality: string;
  weekly_form: string;
  weekly_condition: string;
  // ③ 明日
  tomorrow_time: string;
  tomorrow_focus: string;
  tomorrow_repeat: string;
  // ④ 振り返りチェック
  reflection_specific: boolean;
  reflection_executed: boolean;
  reflection_next_task: boolean;
}

// ── 上級 ─────────────────────────────────────────────────────
export interface AdvancedContent {
  // ① 理想のレースビジョン
  vision_meet: string;
  vision_rank: string;
  vision_time: string;
  vision_pattern: string;
  // ② ライバル・自己分析
  rival_first: string;
  rival_second: string;
  rival_strengths: string;
  diff_first: string;
  diff_second: string;
  diff_technique: string;
  // ③ レースプラン
  race_0_15: string;
  race_15_50: string;
  race_50_75: string;
  race_75_100: string;
  race_stroke_count: string;
  race_tempo: string;
  race_breathing: string;
  // ④ コンディション・メンタル
  cond_weight: string;
  cond_sleep: string;
  cond_routine: string;
  cond_relaxation: string;
  // ⑤ 年間ロードマップ
  road_target: string;
  road_stepup: string;
  road_enjoy: string;
  // ⑥ 毎日のセルフ評価（0-10）
  score_technique: number;
  score_concentration: number;
  score_condition: number;
  score_satisfaction: number;
}

export interface GoalSheet {
  id: string;
  user_id: string;
  level: GoalSheetLevel;
  content: BeginnerContent | IntermediateContent | AdvancedContent;
  ai_feedback: string | null;
  created_at: string;
  updated_at: string;
}

// ── デフォルト値 ──────────────────────────────────────────────
export const BEGINNER_DEFAULT: BeginnerContent = {
  why: '', vision_deadline: '', vision_how: '',
  current_event: '', current_best_time: '', current_strengths: '',
  current_weaknesses: '', current_concern: '',
  goal_this_week: '', goal_tomorrow: '',
  reflection_did: '', reflection_next: '', reflection_satisfaction: 3,
};

export const INTERMEDIATE_DEFAULT: IntermediateContent = {
  vision_deadline: '', vision_event: '', vision_target_time: '', vision_player_type: '',
  current_event: '', current_best_time: '', current_race_first: '',
  current_race_second: '', current_stroke: '', current_turn: '',
  current_strengths: '', current_improvements: '',
  season_meet: '', season_time: '', season_swimming: '',
  midterm_time: '', midterm_strength: '', midterm_form: '',
  monthly_main: '', monthly_conditioning: '', monthly_technique: '',
  weekly_quality: '', weekly_form: '', weekly_condition: '',
  tomorrow_time: '', tomorrow_focus: '', tomorrow_repeat: '',
  reflection_specific: false, reflection_executed: false, reflection_next_task: false,
};

export const ADVANCED_DEFAULT: AdvancedContent = {
  vision_meet: '', vision_rank: '', vision_time: '', vision_pattern: '',
  rival_first: '', rival_second: '', rival_strengths: '',
  diff_first: '', diff_second: '', diff_technique: '',
  race_0_15: '', race_15_50: '', race_50_75: '', race_75_100: '',
  race_stroke_count: '', race_tempo: '', race_breathing: '',
  cond_weight: '', cond_sleep: '', cond_routine: '', cond_relaxation: '',
  road_target: '', road_stepup: '', road_enjoy: '',
  score_technique: 5, score_concentration: 5, score_condition: 5, score_satisfaction: 5,
};
