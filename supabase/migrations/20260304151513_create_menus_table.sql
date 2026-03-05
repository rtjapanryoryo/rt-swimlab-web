-- メニューログテーブル
CREATE TABLE IF NOT EXISTS menus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  user_email TEXT,
  input JSONB NOT NULL DEFAULT '{}',
  result JSONB NOT NULL DEFAULT '{}',
  source TEXT NOT NULL DEFAULT 'quick',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 日付・ユーザーで検索しやすくするインデックス
CREATE INDEX IF NOT EXISTS idx_menus_user_created ON menus (user_id, created_at DESC);
