-- RT GENE PROFILE: ファイルサイズ制限を 10MB → 50MB に変更
UPDATE storage.buckets
SET file_size_limit = 52428800
WHERE id = 'gene-profiles';
