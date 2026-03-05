# Supabase セットアップ手順

メニュー保存・マイページ機能で Supabase を使用します。

## 作業していただくこと（初回のみ）

### 1. Supabase プロジェクト作成

1. [supabase.com](https://supabase.com) にアクセスし、ログイン
2. **New project** をクリック
3. プロジェクト名（例: `rt-swimlab`）、パスワードを設定し、リージョンを選択して作成
4. プロジェクトが作成されるまで数分待つ

### 2. テーブル作成

**方法 A: Supabase CLI を使う（推奨）**

プロジェクトをリンクしてマイグレーションを適用します。詳細は [docs/SUPABASE_CLI.md](./SUPABASE_CLI.md) を参照。

```bash
npx supabase link --project-ref <プロジェクトID>
npx supabase db push
```

**方法 B: SQL Editor で手動実行**

Supabase ダッシュボードで **SQL Editor** を開き、以下を実行してください。

```sql
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
```

### 3. 環境変数の設定

Supabase ダッシュボードの **Settings** → **API** で以下を確認します。

- **Project URL** → `SUPABASE_URL`
- **service_role** の Secret key → `SUPABASE_SERVICE_ROLE_KEY`
  - ※ `anon` ではなく `service_role` を使用（サーバー側で NextAuth の user_id と紐付けするため）

`.env.ai` に以下を追加してください。

```
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 4. 開発サーバー再起動

```bash
npm run dev
```

以上で Supabase の設定は完了です。
