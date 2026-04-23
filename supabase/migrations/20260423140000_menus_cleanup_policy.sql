-- menus テーブルの容量管理
-- result カラム（フルメニューJSON）は 90 日を超えたら null に更新し、容量を節約する
-- ※ input（入力パラメータ）と統計用カラムは永続保持

-- 管理者が手動で実行する容量クリーンアップ用関数
CREATE OR REPLACE FUNCTION public.cleanup_old_menu_results(days_to_keep INT DEFAULT 90)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE public.menus
  SET result = '{}'::jsonb
  WHERE created_at < NOW() - (days_to_keep || ' days')::INTERVAL
    AND result != '{}'::jsonb;

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$;

COMMENT ON FUNCTION public.cleanup_old_menu_results IS
  '90日以上前のメニューの result（フルJSON）を空にして容量削減。input と統計は保持。手動実行用。';

-- generation_logs が重複保存している場合のクリーンアップインデックス追加
CREATE INDEX IF NOT EXISTS idx_generation_logs_user_created
  ON public.generation_logs (user_id, created_at DESC);

-- menus テーブルの古いデータ統計ビュー（管理者確認用）
CREATE OR REPLACE VIEW public.admin_storage_summary AS
SELECT
  'menus' AS table_name,
  COUNT(*) AS total_rows,
  COUNT(CASE WHEN result != '{}'::jsonb THEN 1 END) AS rows_with_result,
  COUNT(CASE WHEN created_at < NOW() - INTERVAL '90 days' THEN 1 END) AS rows_older_90d,
  COUNT(CASE WHEN created_at < NOW() - INTERVAL '90 days' AND result != '{}'::jsonb THEN 1 END) AS cleanable_rows
FROM public.menus
UNION ALL
SELECT
  'generation_logs',
  COUNT(*),
  NULL,
  COUNT(CASE WHEN created_at < NOW() - INTERVAL '90 days' THEN 1 END),
  NULL
FROM public.generation_logs;

COMMENT ON VIEW public.admin_storage_summary IS
  '各テーブルの行数・クリーンアップ可能行数を確認するビュー';
