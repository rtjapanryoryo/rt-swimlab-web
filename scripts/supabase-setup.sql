-- ============================================================
-- RT swim lab - Supabase 初期セットアップ
-- ============================================================
-- 使い方: Supabase Dashboard → SQL Editor → このファイルをコピー → Run
-- ============================================================

-- 1. profiles テーブル
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  display_name TEXT,
  total_usage_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. generation_logs テーブル
CREATE TABLE IF NOT EXISTS public.generation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content_details TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_generation_logs_user_created ON public.generation_logs (user_id, created_at DESC);

-- 3. 新規ユーザー登録時に profiles を自動作成するトリガー
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, role, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'role', 'user'),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. 既存ユーザーを profiles に登録
INSERT INTO public.profiles (id, role, display_name)
SELECT id, 'user', COALESCE(raw_user_meta_data->>'full_name', email)
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- 5. RLS 有効化
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generation_logs ENABLE ROW LEVEL SECURITY;

-- 6. RLS ポリシー（既存の削除してから作成）
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own generation logs" ON public.generation_logs;
DROP POLICY IF EXISTS "Users can insert own generation logs" ON public.generation_logs;

CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Users can view own generation logs" ON public.generation_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own generation logs" ON public.generation_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- 7. 管理者にしたいユーザーを設定（任意）
-- ============================================================
-- 以下を実行する前に、Authentication → Users で自分の User UID をコピーし、
-- 下の 'YOUR-USER-UUID' を置き換えてください。
--
-- UPDATE public.profiles SET role = 'admin' WHERE id = 'YOUR-USER-UUID';
--
-- ============================================================
