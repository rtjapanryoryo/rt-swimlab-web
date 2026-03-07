# マイページ・メニュー保存 セットアップ

## 実装内容（Phase 1 & 3 完了）

- **メニュー保存**: ログイン中にメニュー作成後「保存」ボタンでDBに保存
- **マイページ** (`/mypage`): 保存したメニューの一覧を日付・時間で確認
- **日付フィルター**: from / to で期間絞り込み

## 利用を開始するまでの手順

### 1. Supabase プロジェクト作成（約5分）

1. [supabase.com](https://supabase.com) にアクセスし、アカウント作成 or ログイン
2. **New project** をクリック
3. 以下を入力：
   - **Name**: `rt-swimlab`（任意）
   - **Database Password**: 強力なパスワードを設定（控えておく）
   - **Region**: 日本なら `Northeast Asia (Tokyo)`
4. **Create new project** をクリック（数分かかります）

### 2. テーブル作成

1. Supabase ダッシュボードで **SQL Editor** を開く
2. **New query** をクリック
3. 以下のSQLを貼り付けて **Run** をクリック

```sql
CREATE TABLE IF NOT EXISTS menus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  user_email TEXT,
  input JSONB NOT NULL DEFAULT '{}',
  result JSONB NOT NULL DEFAULT '{}',
  source TEXT NOT NULL DEFAULT 'quick',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_menus_user_created ON menus (user_id, created_at DESC);
```

### 3. 環境変数の設定

1. Supabase ダッシュボードで **Settings**（歯車アイコン）→ **API** を開く
2. 以下をコピー：
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon (public)** キー → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. `.env.ai` に追記：

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xxxxx
```

4. 開発サーバーを再起動：`npm run dev`

### 4. 動作確認

1. ブラウザで `http://localhost:3000` を開く
2. Google でログイン
3. メニューを「クイック作成」または「カスタム作成」で生成
4. **保存** ボタンをクリック → 「✓ 保存済み」と表示されればOK
5. 画面右上の **マイページ** をクリック → 保存したメニューが一覧表示されればOK

## 補足

- **service_role** キーはサーバー側でのみ使用し、フロントには一切渡しません
- Supabase 未設定時は「保存」ボタンは表示されますが、クリック時にエラーになります（503）
- ログインしていない場合は「保存」ボタンは表示されません
