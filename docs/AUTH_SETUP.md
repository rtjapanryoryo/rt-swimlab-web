# 認証セットアップ（メール・パスワード）

RT swim lab では **Supabase Auth** を使用し、名前（匿名OK）・メールアドレス・パスワードでアカウント管理します。

## 前提

- Supabase プロジェクト作成済み
- `docs/SUPABASE_SETUP.md` に従いテーブル作成済み

## 1. Supabase Auth の設定

1. Supabase ダッシュボード → **Authentication** → **Providers**
2. **Email** を有効化（Enable Email provider）
3. **Confirm email をオフにする**（推奨）→ 登録後すぐログイン可能、rate limit 回避
4. **Google** を有効化（任意）→ Client ID と Client Secret を Google Cloud Console から取得して設定
   - Google Cloud Console → APIとサービス → 認証情報 → OAuth 2.0 クライアント ID 作成
   - 承認済みリダイレクト URI に `https://プロジェクトID.supabase.co/auth/v1/callback` を追加
   - 手動: ダッシュボード → Providers → Email → Confirm email をオフ
   - ターミナル: `SUPABASE_ACCESS_TOKEN=sbp_xxx npm run supabase:disable-email-confirm`  
     （トークンは https://supabase.com/dashboard/account/tokens で作成）

## 2. 環境変数

`.env.ai` に以下を設定してください。

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
```

- **anon key**: Settings → API → Project API keys の **anon**（public）
- **service_role**: 同画面の **service_role**（シークレット）

`NEXT_PUBLIC_` が付く変数はブラウザに公開されます。anon key は公開用です。

## 3. リダイレクト URL（パスワードリセット用）

**Authentication** → **URL Configuration** → **Redirect URLs** に以下を追加：

- ローカル: `http://localhost:3000/auth/callback`
- 本番: `https://あなたのドメイン/auth/callback`

## 4. パスワードをお忘れの場合

- ログイン画面の「パスワードをお忘れですか？」をクリック
- 登録メールアドレスを入力 → リセット用リンクが送信される
- メール内のリンクをクリック → 新しいパスワードを設定

※ Confirm email がオンの場合、パスワードリセットメールにも rate limit が適用されます。

## 5. 動作確認

1. `npm run dev` で起動
2. `/signup` で新規登録（名前は任意・匿名可）
3. `/login` でメール・パスワードでログイン
4. トップページでメニュー作成 → 保存 → マイページで確認

## 注意

- 既存の Google OAuth ユーザーは別アカウントになります。新規にメール/パスワードで登録してください。
- パスワードは6文字以上です。
-  display name（表示名）はユーザーメタデータに保存され、匿名での登録も可能です。
