-- ============================================================
-- 既存ユーザーを profiles に登録
-- ============================================================
-- 使い方: Supabase Dashboard → SQL Editor → このファイルをコピー → Run
-- ============================================================

-- 1. auth.users のユーザーを profiles に登録
INSERT INTO public.profiles (id, role, display_name)
SELECT id, 'user', COALESCE(raw_user_meta_data->>'full_name', email)
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- 2. 自分を管理者にする（任意・UID を置き換えてください）
-- UPDATE public.profiles SET role = 'admin' WHERE id = 'c09efc9a-8cad-4a5e-8ead-e20abd4d721b';
