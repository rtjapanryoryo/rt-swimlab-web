-- ============================================================
-- Schema Cleanup: 一貫性・整合性の統一
-- 1. menus.user_id TEXT → UUID (FK追加)
-- 2. menus RLS: キャスト不要に
-- 3. 全テーブルの admin ポリシーを is_admin() に統一
-- 4. subscriptions の updated_at トリガーを共通関数に統一
-- 5. menus に DELETE ポリシー追加
-- ============================================================

-- ── 1. menus.user_id: TEXT → UUID ────────────────────────────
-- user_id を参照しているポリシーを先に削除（型変更のために必須）
DROP POLICY IF EXISTS "Users can view own menus"   ON public.menus;
DROP POLICY IF EXISTS "Users can insert own menus" ON public.menus;
DROP POLICY IF EXISTS "admin can read all menus"   ON public.menus;

-- 孤立レコード削除（profiles に存在しない user_id）
DELETE FROM public.menus
WHERE user_id NOT IN (SELECT id::text FROM public.profiles);

-- TEXT → UUID に型変換
ALTER TABLE public.menus
  ALTER COLUMN user_id TYPE UUID USING user_id::uuid;

-- FK 追加
ALTER TABLE public.menus
  ADD CONSTRAINT menus_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- ── 2. menus RLS: キャスト除去・DELETE 追加 ──────────────────
CREATE POLICY "Users can view own menus" ON public.menus
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own menus" ON public.menus
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own menus" ON public.menus
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "admin can read all menus" ON public.menus
  FOR SELECT USING (public.is_admin());

-- ── 3. 全テーブルの admin ポリシーを is_admin() に統一 ────────

-- generation_logs
DROP POLICY IF EXISTS "admin can read all generation_logs" ON public.generation_logs;
CREATE POLICY "admin can read all generation_logs" ON public.generation_logs
  FOR SELECT USING (public.is_admin());

-- subscriptions
DROP POLICY IF EXISTS "admin can read all subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "admin can manage subscriptions"   ON public.subscriptions;
CREATE POLICY "admin can read all subscriptions" ON public.subscriptions
  FOR SELECT USING (public.is_admin());
CREATE POLICY "admin can manage subscriptions" ON public.subscriptions
  FOR ALL USING (public.is_admin());

-- training_plans
DROP POLICY IF EXISTS "admin full access plans" ON public.training_plans;
CREATE POLICY "admin full access plans" ON public.training_plans
  FOR ALL USING (public.is_admin());

-- training_cycles
DROP POLICY IF EXISTS "admin full access cycles" ON public.training_cycles;
CREATE POLICY "admin full access cycles" ON public.training_cycles
  FOR ALL USING (public.is_admin());

-- training_sessions
DROP POLICY IF EXISTS "admin full access sessions" ON public.training_sessions;
CREATE POLICY "admin full access sessions" ON public.training_sessions
  FOR ALL USING (public.is_admin());

-- coach_athletes
DROP POLICY IF EXISTS "admin full access coaches" ON public.coach_athletes;
CREATE POLICY "admin full access coaches" ON public.coach_athletes
  FOR ALL USING (public.is_admin());

-- ── 4. subscriptions の updated_at トリガーを共通関数に統一 ───
DROP TRIGGER IF EXISTS subscriptions_updated_at ON public.subscriptions;
DROP FUNCTION IF EXISTS public.update_subscriptions_updated_at();

CREATE TRIGGER subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
