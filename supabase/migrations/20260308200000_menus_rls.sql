-- menus テーブルに RLS を有効化し、自分のメニューのみ閲覧・挿入可能に
ALTER TABLE public.menus ENABLE ROW LEVEL SECURITY;

-- 自分の行のみ SELECT（user_id は TEXT で UUID 文字列を格納）
DROP POLICY IF EXISTS "Users can view own menus" ON public.menus;
CREATE POLICY "Users can view own menus" ON public.menus
  FOR SELECT USING ((auth.uid())::text = user_id);

-- 自分の行のみ INSERT
DROP POLICY IF EXISTS "Users can insert own menus" ON public.menus;
CREATE POLICY "Users can insert own menus" ON public.menus
  FOR INSERT WITH CHECK ((auth.uid())::text = user_id);
