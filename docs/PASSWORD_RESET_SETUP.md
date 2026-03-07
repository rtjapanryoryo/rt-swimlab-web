# パスワード変更・リセット設計（Supabase 連携）

RT swim lab のパスワード機能は **Supabase Auth** に紐づいています。登録したメールアドレス宛にリセットリンクが送信されます。

## 2つのフロー

| パターン | 経路 | 説明 |
|---------|------|------|
| **パスワードを忘れた** | `/forgot-password` → メール → `/update-password` | 登録メールにリセットリンクを送信。リンクから新しいパスワードを設定 |
| **パスワードを変更**（ログイン中） | 設定 → フォーム送信 | ログイン中のまま、新しいパスワードを直接設定 |

---

## 1. パスワードを忘れた（メールでリセット）

### 流れ

1. ユーザーが `/forgot-password` でメールアドレスを入力
2. `supabase.auth.resetPasswordForEmail(email, { redirectTo })` を実行
3. **Supabase が登録済みメールアドレス宛にリセット用リンクを送信**
4. ユーザーがメール内のリンクをクリック
5. リンク先: `/auth/callback?code=xxx&next=/update-password`（PKCE）または `?token_hash=xxx&type=recovery`
6. コールバックでセッション確立 → `/update-password` へリダイレクト
7. ユーザーが新しいパスワードを入力 → `supabase.auth.updateUser({ password })` で更新

### Supabase 設定（必須）

1. **Authentication** → **URL Configuration**
   - **Site URL**: 本番のベースURL（例: `https://rt-swimlab-web.vercel.app`）
   - **Redirect URLs** に以下を追加:
     - `http://localhost:3000/auth/callback`
     - `https://あなたのドメイン/auth/callback`

2. **Authentication** → **Email Templates**
   - **Reset Password** テンプレートが有効
   - デフォルトの `{{ .ConfirmationURL }}` がリセットリンクに使われる

3. **メール送信**
   - 開発時: Supabase 標準の SMTP（rate limit あり）
   - 本番推奨: **Authentication** → **SMTP Settings** でカスタム SMTP を設定（Gmail, SendGrid 等）

### 動作しない場合の確認

- メールが届かない → 迷惑メールフォルダ、SMTP 設定、rate limit を確認
- リンククリックでエラー → Redirect URLs に `https://あなたのドメイン/auth/callback` が含まれているか確認
- 「リンクの有効期限が切れています」 → リセットリンクは通常 1 時間程度で失効。再度リセット用メールを送信

---

## 2. パスワードを変更（ログイン中）

- マイページ → 設定 → 「パスワードを変更」
- ログイン中のセッションで本人確認済みのため、新しいパスワードを入力するだけで即時変更可能
- `supabase.auth.updateUser({ password })` で更新（メール不要）

---

## セキュリティ

- リセットリンクは **登録したメールアドレス** にのみ送信される
- リンクには一時トークンが含まれ、有効期限あり
- パスワードは 6 文字以上（Supabase デフォルト）
