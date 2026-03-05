# 認証セットアップ（メール・パスワード）

RT swim lab では **Supabase Auth** を使用し、名前（匿名OK）・メールアドレス・パスワードでアカウント管理します。

## 前提

- Supabase プロジェクト作成済み
- `docs/SUPABASE_SETUP.md` に従いテーブル作成済み

## 1. Supabase Auth の設定

1. Supabase ダッシュボード → **Authentication** → **Providers**
2. **Email** を有効化（Enable Email provider）
3. 必要に応じて **Confirm email** をオフにすると、登録後すぐログイン可能（メール認証不要）

## 2. 環境変数

`.env.ai` に以下を設定してください。

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIs...
```

- **anon key**: Settings → API → Project API keys の **anon**（public）
- **service_role**: 同画面の **service_role**（シークレット）

`NEXT_PUBLIC_` が付く変数はブラウザに公開されます。anon key は公開用です。

## 3. 動作確認

1. `npm run dev` で起動
2. `/signup` で新規登録（名前は任意・匿名可）
3. `/login` でメール・パスワードでログイン
4. トップページでメニュー作成 → 保存 → マイページで確認

## 注意

- 既存の Google OAuth ユーザーは別アカウントになります。新規にメール/パスワードで登録してください。
- パスワードは6文字以上です。
-  display name（表示名）はユーザーメタデータに保存され、匿名での登録も可能です。
