-- profiles RLS の無限再帰を修正
-- 「Admins can view all profiles」が profiles を SELECT して RLS を再評価していた
-- SECURITY DEFINER 関数で admin 判定し、RLS をバイパスする

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin');
$$;

-- 既存ポリシーを削除して再作成
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (public.is_admin());
