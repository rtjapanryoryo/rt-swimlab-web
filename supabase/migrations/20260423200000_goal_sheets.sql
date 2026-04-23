-- ============================================================
-- Goal Sheets: 初級・中級・上級 目標達成ワークシート
-- ユーザーごとにレベル別1レコード（upsert設計）
-- ============================================================

CREATE TABLE IF NOT EXISTS public.goal_sheets (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  level       TEXT        NOT NULL CHECK (level IN ('beginner', 'intermediate', 'advanced')),
  content     JSONB       NOT NULL DEFAULT '{}',
  ai_feedback TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, level)
);

-- updated_at 自動更新トリガー
CREATE OR REPLACE FUNCTION public.set_goal_sheet_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS goal_sheets_updated_at ON public.goal_sheets;
CREATE TRIGGER goal_sheets_updated_at
  BEFORE UPDATE ON public.goal_sheets
  FOR EACH ROW EXECUTE FUNCTION public.set_goal_sheet_updated_at();

-- RLS
ALTER TABLE public.goal_sheets ENABLE ROW LEVEL SECURITY;

-- 本人は読み書き可
CREATE POLICY "goal_sheets_select_own" ON public.goal_sheets
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "goal_sheets_insert_own" ON public.goal_sheets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "goal_sheets_update_own" ON public.goal_sheets
  FOR UPDATE USING (auth.uid() = user_id);

-- コーチは担当選手のシートを閲覧可（coach_athletes 経由）
CREATE POLICY "goal_sheets_coach_select" ON public.goal_sheets
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM public.coach_athletes ca
      JOIN public.profiles p ON p.id = auth.uid()
      WHERE ca.athlete_id = goal_sheets.user_id
        AND ca.coach_id   = auth.uid()
        AND p.role IN ('coach', 'admin')
    )
  );

-- 管理者は全件閲覧可
CREATE POLICY "goal_sheets_admin_select" ON public.goal_sheets
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
