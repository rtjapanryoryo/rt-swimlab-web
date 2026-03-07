# マイグレーション「Tenant or user not found」の対処

## 原因
DATABASE_URL の**パスワード**が正しくない可能性が高いです。

## 解決手順

### 1. Supabase で接続文字列を取得

1. 以下のリンクを開く（あなたのプロジェクトの Database 設定）:
   **https://supabase.com/dashboard/project/lpzrrblueipqhgtttzlw/settings/database**

2. ページ内の **「Connection string」** セクションへスクロール

3. **「Method」** で **「Transaction」**（または Session pooler）を選択  
   ※「Direct connection」は IPv4 で接続できないことがあります

4. **「URI」** の右側のコピーボタンをクリック

5. 表示された URI の `[YOUR-PASSWORD]` を**実際のデータベースパスワード**に置き換える  
   - パスワードを忘れた場合: 同じページの「Reset database password」で再設定

### 2. .env.ai を更新

`.env.ai` の `DATABASE_URL` を、コピーした URI（パスワードを入れたもの）に置き換える:

```
DATABASE_URL="postgresql://postgres.lpzrrblueipqhgtttzlw:あなたのパスワード@aws-0-xx.pooler.supabase.com:6543/postgres"
```

※ `aws-0-xx` の部分は Dashboard に表示されているものをそのまま使用してください。

### 3. マイグレーションを再実行

```bash
npm run db:migrate
```
