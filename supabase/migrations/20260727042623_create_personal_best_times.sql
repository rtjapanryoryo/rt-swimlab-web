-- 種目・距離・プール種別ごとに、ユーザーの現在のベストタイムを1件保存します。
CREATE TABLE IF NOT EXISTS public.personal_best_times (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  stroke             TEXT        NOT NULL CHECK (stroke IN ('Fr', 'Ba', 'Br', 'Fly', 'IM')),
  distance_m         INTEGER     NOT NULL,
  pool_length        TEXT        NOT NULL CHECK (pool_length IN ('short_course', 'long_course')),
  time_centiseconds  INTEGER     NOT NULL CHECK (time_centiseconds > 0 AND time_centiseconds < 360000),
  recorded_on        DATE,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT personal_best_times_event_check CHECK (
    (stroke = 'Fr' AND distance_m IN (25, 50, 100, 200, 400, 800, 1500))
    OR (stroke IN ('Ba', 'Br', 'Fly') AND distance_m IN (25, 50, 100, 200))
    OR (stroke = 'IM' AND distance_m IN (100, 200, 400))
  ),
  CONSTRAINT personal_best_times_pool_event_check CHECK (
    pool_length = 'short_course'
    OR (distance_m <> 25 AND NOT (stroke = 'IM' AND distance_m = 100))
  ),
  UNIQUE (user_id, stroke, distance_m, pool_length)
);

CREATE INDEX IF NOT EXISTS idx_personal_best_times_user
  ON public.personal_best_times (user_id);

CREATE OR REPLACE FUNCTION public.set_personal_best_times_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS personal_best_times_updated_at
  ON public.personal_best_times;
CREATE TRIGGER personal_best_times_updated_at
  BEFORE UPDATE ON public.personal_best_times
  FOR EACH ROW EXECUTE FUNCTION public.set_personal_best_times_updated_at();

ALTER TABLE public.personal_best_times ENABLE ROW LEVEL SECURITY;

-- 本人の記録だけを読み書きできるよう、全操作でuser_idを照合します。
CREATE POLICY "personal_best_times_select_own"
  ON public.personal_best_times
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "personal_best_times_insert_own"
  ON public.personal_best_times
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "personal_best_times_update_own"
  ON public.personal_best_times
  FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "personal_best_times_delete_own"
  ON public.personal_best_times
  FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- 新規プロジェクトでもData APIから利用できるよう、認証済みユーザーへ明示的に権限を付与します。
GRANT SELECT, INSERT, UPDATE, DELETE
  ON TABLE public.personal_best_times
  TO authenticated;
