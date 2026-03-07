# Supabase SQL 実行手順

## 自動同期を有効にする（推奨・1回だけ）

管理者画面の「ユーザーを同期」ボタンで、SQL Editor を開かずに同期できるようにします。

1. Supabase → **SQL Editor** → **New query**
2. `scripts/supabase-add-sync-function.sql` の内容をコピーして貼り付け
3. **Run** をクリック
4. 管理者になったあと、`/admin` の「ユーザーを同期」ボタンで自動実行可能

---

## いまやること（profiles が空の場合）

1. **Supabase** を開く → **SQL Editor** → **New query**
2. 下の SQL をコピーして貼り付け
3. **Run** をクリック

```sql
INSERT INTO public.profiles (id, role, display_name)
SELECT id, 'user', COALESCE(raw_user_meta_data->>'full_name', email)
FROM auth.users
ON CONFLICT (id) DO NOTHING;
```

これで profiles にユーザーが入ります。

---

## 管理者にしたい場合

1. **Authentication** → **Users** で自分の **UID** をコピー
2. **SQL Editor** で次を実行（`ここにUID` を自分の UID に置き換え）

```sql
UPDATE public.profiles SET role = 'admin' WHERE id = 'ここにUID';
```

---

## 参考：SQL ファイルの場所

- `scripts/supabase-backfill-profiles.sql` … 上記 INSERT と同じ内容
- `scripts/supabase-setup.sql` … テーブルが無いときの初回セットアップ用
