-- training_plans に secondary_meets（準備試合）カラムを追加
-- primary: goal_meet_date / goal_meet_name が Aマーク（期配分の基準）
-- secondary: B/Cマーク（予選・練習試合）はタイムラインに表示するが期配分には影響しない

ALTER TABLE public.training_plans
  ADD COLUMN IF NOT EXISTS secondary_meets JSONB NOT NULL DEFAULT '[]';

COMMENT ON COLUMN public.training_plans.secondary_meets IS
  '準備試合・予選 [{date: "YYYY-MM-DD", name: "試合名"}] 最大4件推奨';
