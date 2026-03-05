# Supabase CLI によるマイグレーション

Cursor から Supabase のリモート DB にマイグレーションを適用する方法です。

## 前提

- `supabase init` 済み（`supabase/config.toml` がある）
- Supabase プロジェクト作成済み
- [Supabase CLI](https://supabase.com/docs/guides/cli) がインストールされていること

## 1. Supabase にログインする（初回のみ）

CLI で Supabase のリモート DB にアクセスするには、まずログインが必要です。

```bash
npx supabase login
```

ブラウザが開き、Supabase アカウントでログインするよう求められます。

## 2. プロジェクトをリンクする

初回のみ、リモート Supabase プロジェクトとリンクします。

```bash
npx supabase link --project-ref <プロジェクトID>
```

**プロジェクトID の取得方法**:  
Supabase ダッシュボードの **Settings** → **General** → **Reference ID**、または URL の `https://supabase.com/dashboard/project/xxxxx` の `xxxxx` の部分。

リンク時に **Database password**（プロジェクト作成時に設定した DB パスワード）の入力が求められます。

## 3. マイグレーションを適用する

`supabase/migrations/` 内の SQL をリモート DB に反映します。

```bash
npx supabase db push
```

初回は `20260304151513_create_menus_table.sql` が適用され、`menus` テーブルが作成されます。

## 4. 今後のスキーマ変更の流れ

1. 新しいマイグレーションファイルを作成  
   ```bash
   npx supabase migration new 変更内容の名前
   ```
2. `supabase/migrations/` に生成された `.sql` を編集
3. リモートに適用  
   ```bash
   npx supabase db push
   ```

## 既に SQL Editor でテーブル作成済みの場合

すでに Supabase ダッシュボードの SQL Editor で `menus` テーブルを作成している場合は、`db push` 時に「このマイグレーションは既に適用済み」と見なされ、スキップされます（`CREATE TABLE IF NOT EXISTS` のため、再実行してもエラーにはなりません）。

テーブルが既にある状態で `db push` を実行する場合は、Supabase がマイグレーション履歴を管理するため、初回リンク後の `db push` で問題なく動作します。

## 主なコマンド一覧

| コマンド | 説明 |
|----------|------|
| `npx supabase link` | リモートプロジェクトをリンク |
| `npx supabase db push` | マイグレーションをリモートに適用 |
| `npx supabase migration new 名前` | 新規マイグレーション作成 |
| `npx supabase status` | リンク状態・ローカルサービスの確認 |
| `npx supabase db remote commit` | リモートの差分をローカルに取り込み |
