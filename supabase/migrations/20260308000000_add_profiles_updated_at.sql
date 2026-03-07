-- profiles に updated_at が無い場合に追加（既存プロジェクト用）
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
