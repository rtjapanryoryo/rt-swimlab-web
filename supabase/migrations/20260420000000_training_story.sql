-- ============================================================
-- Training Story Architecture
-- コーチ-AI ハーモニー設計: AIは提案のみ、判断は常に人間
-- ============================================================

-- profiles の role に 'coach' を追加
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
    CHECK (role IN ('user', 'admin', 'coach'));

-- ── training_plans ────────────────────────────────────────
-- 年間計画。コーチ or 選手が主体。AIはこの計画に従う。
CREATE TABLE IF NOT EXISTS public.training_plans (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name              TEXT        NOT NULL,
  goal_event        TEXT        NOT NULL DEFAULT 'Fr',        -- 目標種目
  goal_distance_type TEXT       NOT NULL DEFAULT 'M'
                                CHECK (goal_distance_type IN ('S','M','D')),
  goal_time_sec     INTEGER,                                  -- 目標タイム（秒）
  goal_meet_date    DATE        NOT NULL,                     -- 目標試合日（期配分の基準）
  goal_meet_name    TEXT,                                     -- 試合名
  start_date        DATE        NOT NULL DEFAULT CURRENT_DATE,
  level             TEXT        NOT NULL DEFAULT '中級（育成クラス〜県大会）',
  stroke_primary    TEXT        NOT NULL DEFAULT 'Fr',        -- メイン種目
  coach_memo        TEXT,                                     -- コーチの思想・制約（AI prompt に注入）
  is_active         BOOLEAN     NOT NULL DEFAULT true,
  ai_memo           JSONB       NOT NULL DEFAULT '{}',        -- AI の文脈記憶
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── training_cycles ───────────────────────────────────────
-- 計画内の期（①〜⑦）を日付に紐付け。コーチが配分を決める。
CREATE TABLE IF NOT EXISTS public.training_cycles (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id               UUID        NOT NULL REFERENCES public.training_plans(id) ON DELETE CASCADE,
  period                TEXT        NOT NULL CHECK (period IN ('1','2','3','4','5','6','7')),
  start_date            DATE        NOT NULL,
  end_date              DATE        NOT NULL,
  target_weekly_volume_m INTEGER,                             -- 週間目標距離(m)
  notes                 TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_training_cycles_plan ON training_cycles (plan_id, start_date);

-- ── training_sessions ─────────────────────────────────────
-- 個別セッション。AI提案 + コーチ上書き + 実績ログの3層。
CREATE TABLE IF NOT EXISTS public.training_sessions (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id             UUID        NOT NULL REFERENCES public.training_plans(id) ON DELETE CASCADE,
  user_id             UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  cycle_id            UUID        REFERENCES public.training_cycles(id) ON DELETE SET NULL,
  scheduled_date      DATE        NOT NULL,
  menu_id             UUID        REFERENCES public.menus(id) ON DELETE SET NULL,
  status              TEXT        NOT NULL DEFAULT 'planned'
                                  CHECK (status IN ('planned','done','skipped')),

  -- AI提案（コーチが上書き可能）
  ai_suggested_period       TEXT,
  ai_suggested_distance_m   INTEGER,
  ai_suggested_condition    TEXT,
  ai_suggestion_reason      TEXT,    -- 「なぜその提案か」を必ず記録

  -- コーチ/選手が上書きした値（NULLなら提案値を使用）
  override_period           TEXT,
  override_distance_m       INTEGER,
  override_condition        TEXT,
  coach_note                TEXT,    -- コーチコメント（選手に見える）

  -- 実績ログ（練習後に入力）
  actual_distance_m         INTEGER,
  actual_duration_min       INTEGER,
  fatigue_before            SMALLINT CHECK (fatigue_before BETWEEN 1 AND 5),
  fatigue_after             SMALLINT CHECK (fatigue_after BETWEEN 1 AND 5),
  athlete_note              TEXT,    -- 選手の感想・メモ
  ai_feedback               TEXT,    -- AI の振り返りコメント

  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_training_sessions_plan_date ON training_sessions (plan_id, scheduled_date DESC);
CREATE INDEX IF NOT EXISTS idx_training_sessions_user_date ON training_sessions (user_id, scheduled_date DESC);

-- ── coach_athletes ────────────────────────────────────────
-- コーチ-選手関係。コーチは選手のプラン・セッションを閲覧・編集可能。
CREATE TABLE IF NOT EXISTS public.coach_athletes (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id    UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  athlete_id  UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (coach_id, athlete_id),
  CHECK (coach_id <> athlete_id)
);

CREATE INDEX IF NOT EXISTS idx_coach_athletes_coach ON coach_athletes (coach_id);
CREATE INDEX IF NOT EXISTS idx_coach_athletes_athlete ON coach_athletes (athlete_id);

-- ── RLS ───────────────────────────────────────────────────

ALTER TABLE public.training_plans    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_cycles   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_athletes    ENABLE ROW LEVEL SECURITY;

-- training_plans: 本人 or コーチ
CREATE POLICY "owner or coach can select plan" ON public.training_plans FOR SELECT
  USING (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM public.coach_athletes WHERE coach_id = auth.uid() AND athlete_id = user_id)
  );
CREATE POLICY "owner can insert plan" ON public.training_plans FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "owner or coach can update plan" ON public.training_plans FOR UPDATE
  USING (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM public.coach_athletes WHERE coach_id = auth.uid() AND athlete_id = user_id)
  );
CREATE POLICY "owner can delete plan" ON public.training_plans FOR DELETE
  USING (auth.uid() = user_id);

-- training_cycles: plan owner or coach
CREATE POLICY "owner or coach can select cycle" ON public.training_cycles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.training_plans p
      WHERE p.id = plan_id AND (
        p.user_id = auth.uid() OR
        EXISTS (SELECT 1 FROM public.coach_athletes WHERE coach_id = auth.uid() AND athlete_id = p.user_id)
      )
    )
  );
CREATE POLICY "owner or coach can insert cycle" ON public.training_cycles FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.training_plans p
      WHERE p.id = plan_id AND (
        p.user_id = auth.uid() OR
        EXISTS (SELECT 1 FROM public.coach_athletes WHERE coach_id = auth.uid() AND athlete_id = p.user_id)
      )
    )
  );
CREATE POLICY "owner or coach can update cycle" ON public.training_cycles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.training_plans p
      WHERE p.id = plan_id AND (
        p.user_id = auth.uid() OR
        EXISTS (SELECT 1 FROM public.coach_athletes WHERE coach_id = auth.uid() AND athlete_id = p.user_id)
      )
    )
  );
CREATE POLICY "owner or coach can delete cycle" ON public.training_cycles FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.training_plans p
      WHERE p.id = plan_id AND (
        p.user_id = auth.uid() OR
        EXISTS (SELECT 1 FROM public.coach_athletes WHERE coach_id = auth.uid() AND athlete_id = p.user_id)
      )
    )
  );

-- training_sessions: plan owner or coach
CREATE POLICY "owner or coach can select session" ON public.training_sessions FOR SELECT
  USING (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM public.coach_athletes WHERE coach_id = auth.uid() AND athlete_id = user_id)
  );
CREATE POLICY "owner can insert session" ON public.training_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "owner or coach can update session" ON public.training_sessions FOR UPDATE
  USING (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM public.coach_athletes WHERE coach_id = auth.uid() AND athlete_id = user_id)
  );
CREATE POLICY "owner can delete session" ON public.training_sessions FOR DELETE
  USING (auth.uid() = user_id);

-- coach_athletes: coach can manage own relationships
CREATE POLICY "coach can select own relations" ON public.coach_athletes FOR SELECT
  USING (auth.uid() = coach_id OR auth.uid() = athlete_id);
CREATE POLICY "coach can insert relations" ON public.coach_athletes FOR INSERT
  WITH CHECK (auth.uid() = coach_id);
CREATE POLICY "coach can delete own relations" ON public.coach_athletes FOR DELETE
  USING (auth.uid() = coach_id);

-- admin bypass
CREATE POLICY "admin full access plans"    ON public.training_plans    FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "admin full access cycles"   ON public.training_cycles   FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "admin full access sessions" ON public.training_sessions FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "admin full access coaches"  ON public.coach_athletes    FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- updated_at 自動更新
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_plans_updated_at    ON public.training_plans;
DROP TRIGGER IF EXISTS trg_sessions_updated_at ON public.training_sessions;
CREATE TRIGGER trg_plans_updated_at    BEFORE UPDATE ON public.training_plans    FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_sessions_updated_at BEFORE UPDATE ON public.training_sessions FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
