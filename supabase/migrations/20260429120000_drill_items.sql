-- ============================================================
-- Drill items: 種目別ドリル動画（YouTube ID）・概要・要点
-- ============================================================

CREATE TABLE IF NOT EXISTS public.drill_items (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  stroke             TEXT        NOT NULL
                       CHECK (stroke IN ('freestyle','backstroke','breaststroke','butterfly')),
  title              TEXT        NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  youtube_video_id   TEXT        NOT NULL CHECK (char_length(youtube_video_id) BETWEEN 6 AND 32),
  overview           TEXT        NOT NULL CHECK (char_length(overview) <= 8000),
  key_points         TEXT        NOT NULL CHECK (char_length(key_points) <= 8000),
  sort_order         INTEGER     NOT NULL DEFAULT 0,
  is_published       BOOLEAN     NOT NULL DEFAULT false,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS drill_items_stroke_sort_idx
  ON public.drill_items (stroke, sort_order ASC, created_at ASC);
CREATE INDEX IF NOT EXISTS drill_items_published_idx
  ON public.drill_items (is_published) WHERE is_published = true;

DROP TRIGGER IF EXISTS trg_drill_items_updated_at ON public.drill_items;
CREATE TRIGGER trg_drill_items_updated_at
  BEFORE UPDATE ON public.drill_items
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.drill_items ENABLE ROW LEVEL SECURITY;

-- ログインユーザー: 公開済みのみ閲覧
DROP POLICY IF EXISTS "drill_items_select_published" ON public.drill_items;
CREATE POLICY "drill_items_select_published" ON public.drill_items
  FOR SELECT TO authenticated
  USING (is_published = true);

-- 管理者: 全件・全操作
DROP POLICY IF EXISTS "drill_items_admin_all" ON public.drill_items;
CREATE POLICY "drill_items_admin_all" ON public.drill_items
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
