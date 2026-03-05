# Google ログイン設定

メール・パスワードに加え、Google アカウントでもログイン・登録できるようにします。

## 1. Google Cloud Console で設定

1. [Google Cloud Console](https://console.cloud.google.com/) にログイン
2. プロジェクトを選択（または新規作成）
3. **APIとサービス** → **認証情報** → **認証情報を作成** → **OAuth クライアント ID**
4. アプリケーションの種類: **ウェブアプリケーション**
5. **承認済みの JavaScript 生成元** に追加:
   - ローカル: `http://localhost:3000`
   - 本番: `https://あなたのドメイン`
6. **承認済みのリダイレクト URI** に追加:
   - Supabase のコールバック URL: `https://あなたのプロジェクトID.supabase.co/auth/v1/callback`
   - 例: `https://jxhjxbmnzoqnoaehkbwh.supabase.co/auth/v1/callback`
7. 作成 → **クライアント ID** と **クライアント シークレット** をコピー

## 2. Supabase ダッシュボードで設定

1. **Authentication** → **Providers** → **Google**
2. **Enable** をオン
3. **Client ID** と **Client Secret** を貼り付け
4. **Save**

## 3. リダイレクト URL（既存設定の確認）

**Authentication** → **URL Configuration** → **Redirect URLs** に以下が含まれていること:

- `http://localhost:3000/auth/callback`
- `https://あなたのドメイン/auth/callback`

## 4. 動作確認

- `/login` で「Google でログイン」をクリック
- Google アカウントで認証
- トップページにリダイレクトされれば OK

## アカウントの紐付け（同じ user_id で情報共有）

### 自動リンク（デフォルト有効）
- **同じメールアドレス**でメール登録とGoogleログインを行うと、Supabase が自動で1つのアカウントに紐付けます
- 紐付くと **同じ user_id** になり、マイページのメニューなどが共有されます
- 例: メールで登録 → 後から「Google でログイン」で同じメールのGoogleアカウントを使用 → 自動紐付き

### 手動連携（マイページから）
- すでにメールでログインしている状態で、マイページの「Google を連携」をクリック
- Google 認証後、同じアカウントに Google が追加されます
- 手動連携を使うには Supabase で有効化が必要:
  - **Authentication** → **Providers** の設定画面で **Manual linking** を有効化
  - または Auth 設定で `GOTRUE_SECURITY_MANUAL_LINKING_ENABLED: true`

## 注意

- 自動リンクにより、同じメールならメール/パスワードと Google は同じアカウント（user_id）に紐付きます
- 初回の Google ログインで自動的にアカウントが作成されます
