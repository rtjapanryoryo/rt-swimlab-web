-- ============================================================
-- RT GENE PROFILE - PDF 格納用テーブル・Storage
-- ============================================================

-- 1. gene_profiles テーブル（メタデータ）
CREATE TABLE IF NOT EXISTS public.gene_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gene_profiles_user_created ON public.gene_profiles (user_id, created_at DESC);

ALTER TABLE public.gene_profiles ENABLE ROW LEVEL SECURITY;

-- RLS: 自分の行のみ（既存ポリシーがあれば削除して再作成）
DROP POLICY IF EXISTS "Users can manage own gene profiles" ON public.gene_profiles;
CREATE POLICY "Users can manage own gene profiles" ON public.gene_profiles
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 2. Storage バケット作成（存在しない場合）
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'gene-profiles',
  'gene-profiles',
  false,
  10485760,
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  allowed_mime_types = EXCLUDED.allowed_mime_types,
  file_size_limit = EXCLUDED.file_size_limit;

-- 3. Storage RLS: 自分のフォルダのみ（既存ポリシーがあれば削除して再作成）
DROP POLICY IF EXISTS "Users can upload own gene profiles" ON storage.objects;
DROP POLICY IF EXISTS "Users can read own gene profiles" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own gene profiles" ON storage.objects;

CREATE POLICY "Users can upload own gene profiles"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'gene-profiles'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can read own gene profiles"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'gene-profiles'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete own gene profiles"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'gene-profiles'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
