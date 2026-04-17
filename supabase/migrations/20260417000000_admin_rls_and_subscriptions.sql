-- ============================================================
-- 1. admin RLS: generation_logs・menus を全件読める
-- ============================================================

CREATE POLICY "admin can read all generation_logs"
ON generation_logs FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

CREATE POLICY "admin can read all menus"
ON menus FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- ============================================================
-- 2. subscriptions テーブル（収益管理用）
-- ============================================================

CREATE TABLE IF NOT EXISTS subscriptions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  plan          TEXT NOT NULL DEFAULT 'free',     -- 'free' / 'basic' / 'pro'
  status        TEXT NOT NULL DEFAULT 'active',   -- 'active' / 'cancelled' / 'expired'
  price_monthly INTEGER NOT NULL DEFAULT 0,       -- 円
  started_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  cancelled_at  TIMESTAMPTZ,
  expires_at    TIMESTAMPTZ,
  stripe_customer_id    TEXT,
  stripe_subscription_id TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status  ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_plan    ON subscriptions(plan);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- 本人のみ自分のサブスクを読める
CREATE POLICY "users can read own subscription"
ON subscriptions FOR SELECT
USING (auth.uid() = user_id);

-- admin は全件読める
CREATE POLICY "admin can read all subscriptions"
ON subscriptions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- admin は全件書ける（手動プラン変更用）
CREATE POLICY "admin can manage subscriptions"
ON subscriptions FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- updated_at 自動更新トリガー
CREATE OR REPLACE FUNCTION update_subscriptions_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_subscriptions_updated_at();
