-- admin ロールのユーザーが generation_logs・menus テーブルを全件参照できるポリシーを追加
-- これにより SUPABASE_SERVICE_ROLE_KEY 不要でダッシュボードが動作する

-- generation_logs
DROP POLICY IF EXISTS "admin can read all generation_logs" ON public.generation_logs;
CREATE POLICY "admin can read all generation_logs"
  ON public.generation_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

-- menus
DROP POLICY IF EXISTS "admin can read all menus" ON public.menus;
CREATE POLICY "admin can read all menus"
  ON public.menus
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

-- training_plans（プラン統計用）
DROP POLICY IF EXISTS "admin can read all training_plans" ON public.training_plans;
CREATE POLICY "admin can read all training_plans"
  ON public.training_plans
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

-- training_sessions（セッション統計用）
DROP POLICY IF EXISTS "admin can read all training_sessions" ON public.training_sessions;
CREATE POLICY "admin can read all training_sessions"
  ON public.training_sessions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );
