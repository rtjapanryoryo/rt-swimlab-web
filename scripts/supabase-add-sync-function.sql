-- ============================================================
-- auth.users → profiles を同期する関数（管理者のみ実行可）
-- ============================================================
-- 使い方: このファイルを Supabase SQL Editor で実行
-- 実行後、管理者画面の「ユーザーを同期」ボタンで自動実行可能
-- ============================================================

CREATE OR REPLACE FUNCTION public.sync_profiles_from_auth()
RETURNS TABLE(inserted_count bigint) 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cnt bigint;
  caller_is_admin boolean;
BEGIN
  -- 呼び出し元が admin か確認（未ログイン or 非admin は拒否）
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  ) INTO caller_is_admin;
  
  IF NOT caller_is_admin THEN
    RAISE EXCEPTION 'admin only';
  END IF;

  -- auth.users から profiles に未登録ユーザーを追加
  WITH inserted AS (
    INSERT INTO public.profiles (id, role, display_name)
    SELECT id, 'user', COALESCE(raw_user_meta_data->>'full_name', email)
    FROM auth.users
    ON CONFLICT (id) DO NOTHING
    RETURNING id
  )
  SELECT COUNT(*)::bigint INTO cnt FROM inserted;
  
  RETURN QUERY SELECT cnt;
END;
$$;

-- RPC として呼び出し可能にする（認証済みユーザーが実行）
GRANT EXECUTE ON FUNCTION public.sync_profiles_from_auth() TO authenticated;
GRANT EXECUTE ON FUNCTION public.sync_profiles_from_auth() TO service_role;
