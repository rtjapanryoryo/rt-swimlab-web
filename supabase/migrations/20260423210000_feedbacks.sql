-- ============================================================
-- Feedbacks: ユーザーからのフィードバック管理
-- ============================================================

CREATE TABLE IF NOT EXISTS public.feedbacks (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  category     TEXT        NOT NULL CHECK (category IN ('bug','feature','ux','content','other')),
  message      TEXT        NOT NULL CHECK (char_length(message) BETWEEN 1 AND 2000),
  rating       SMALLINT    CHECK (rating BETWEEN 1 AND 5),
  status       TEXT        NOT NULL DEFAULT 'pending'
                           CHECK (status IN ('pending','in_progress','resolved','dismissed')),
  admin_note   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- インデックス
CREATE INDEX IF NOT EXISTS feedbacks_status_idx    ON public.feedbacks(status);
CREATE INDEX IF NOT EXISTS feedbacks_category_idx  ON public.feedbacks(category);
CREATE INDEX IF NOT EXISTS feedbacks_created_idx   ON public.feedbacks(created_at DESC);
CREATE INDEX IF NOT EXISTS feedbacks_user_idx      ON public.feedbacks(user_id);

-- updated_at 自動更新
CREATE OR REPLACE FUNCTION public.set_feedbacks_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS feedbacks_updated_at ON public.feedbacks;
CREATE TRIGGER feedbacks_updated_at
  BEFORE UPDATE ON public.feedbacks
  FOR EACH ROW EXECUTE FUNCTION public.set_feedbacks_updated_at();

-- RLS
ALTER TABLE public.feedbacks ENABLE ROW LEVEL SECURITY;

-- ユーザーは自分のフィードバックを投稿・閲覧できる
CREATE POLICY "feedbacks_insert_own" ON public.feedbacks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "feedbacks_select_own" ON public.feedbacks
  FOR SELECT USING (auth.uid() = user_id);

-- 管理者は全件操作可
CREATE POLICY "feedbacks_admin_all" ON public.feedbacks
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
