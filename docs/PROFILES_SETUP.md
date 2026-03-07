# profiles / generation_logs セットアップ

Gemini プロンプトに基づく、権限ベースのダッシュボード用テーブルです。

## やり方（手順）

### ステップ 1: マイグレーションを実行

**おすすめ: 一括セットアップ（既存ユーザー登録込み）**
1. https://supabase.com/dashboard にログイン
2. プロジェクトを選択
3. 左メニュー **SQL Editor** → **New query**
4. `scripts/supabase-setup.sql` の内容をすべてコピーして貼り付け
5. **Run**（Ctrl+Enter）で実行

**方法 B: Supabase CLI**
```bash
supabase db push
```
※ 既存ユーザー登録は別途 SQL 実行が必要

### ステップ 2: 既存ユーザーを profiles に登録（既にサインアップ済みの場合）

SQL Editor で以下を実行：
```sql
INSERT INTO public.profiles (id, role, display_name)
SELECT id, 'user', COALESCE(raw_user_meta_data->>'full_name', email)
FROM auth.users
ON CONFLICT (id) DO NOTHING;
```

### ステップ 3: 管理者を 1 人設定

1. Dashboard → **Authentication** → **Users** で自分のメールのユーザーを開く
2. **User UID**（UUID）をコピー
3. SQL Editor で実行：
```sql
UPDATE public.profiles SET role = 'admin' WHERE id = 'ここに貼り付けたUUID';
```

例：`UPDATE public.profiles SET role = 'admin' WHERE id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';`

### ステップ 4: 動作確認

1. アプリを起動（`npm run dev`）
2. ログアウトしてからログイン
3. admin にしたユーザー → `/admin` へ飛ぶ
4. それ以外のユーザー → `/mypage` へ飛ぶ

---

## テーブル

| テーブル | 説明 |
|----------|------|
| `profiles` | id (auth.users連携), role, display_name, total_usage_count |
| `generation_logs` | user_id, content_details, created_at |

## 環境変数 (.env.local / .env.ai)

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

## 動作フロー

1. **ログイン** → role に応じて `/admin` または `/mypage` へリダイレクト
2. **マイページ** → プロフィール表示、生成ログ一覧、テスト用「新しい編集メニューを生成する」ボタン
3. **管理者画面** → 全ユーザーの一覧（ユーザーID、名前、累計生成回数）
