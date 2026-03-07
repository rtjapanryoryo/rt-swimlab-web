-- ============================================================
-- RLS ポリシー更新（user + admin 両方）
-- ============================================================
-- 使い方: Supabase Dashboard → SQL Editor → このファイルをコピー → Run
-- 既存ポリシーを削除して、user 用・admin 用をまとめて再作成します。
-- ============================================================

-- profiles: 既存ポリシー削除（日本語名・英語名の両方に対応）
DROP POLICY IF EXISTS "自分のプロフィールを管理" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

-- profiles: 新規作成（user + admin）
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- generation_logs: 既存ポリシー削除
DROP POLICY IF EXISTS "自分のログを管理" ON public.generation_logs;
DROP POLICY IF EXISTS "Users can view own generation logs" ON public.generation_logs;
DROP POLICY IF EXISTS "Users can insert own generation logs" ON public.generation_logs;

-- generation_logs: 新規作成
CREATE POLICY "Users can view own generation logs" ON public.generation_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own generation logs" ON public.generation_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);
