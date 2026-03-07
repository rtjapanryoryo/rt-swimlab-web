# APIキー取得ガイド

`.env.ai` に設定する各APIキーの取得方法です。

---

## 1. Google OAuth（ログインに必須）

### 取得手順

1. [Google Cloud Console](https://console.cloud.google.com/) にログイン
2. **プロジェクトを選択** または **新しいプロジェクトを作成**
3. 左メニュー **APIとサービス** → **認証情報**
4. **認証情報を作成** → **OAuth クライアント ID**
5. アプリケーションの種類: **ウェブアプリケーション**
6. **承認済みの JavaScript 生成元** に追加:
   - `http://localhost:3000`
   - `https://rt-swimlab-web-tl3a.vercel.app`
7. **承認済みのリダイレクト URI** に追加:
   - `http://localhost:3000/api/auth/callback/google`
   - `https://rt-swimlab-web-tl3a.vercel.app/api/auth/callback/google`
8. **作成** をクリック
9. 表示された **クライアントID** と **クライアントシークレット** をコピー

### .env.ai に設定

```
GOOGLE_CLIENT_ID=264483404131-xxxxxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxxxx
```

---

## 2. NextAuth シークレット（ログインに必須）

### 生成方法

ターミナルで実行:

```bash
openssl rand -base64 32
```

または、[generate-secret.vercel.app](https://generate-secret.vercel.app/32) で32バイトのランダム文字列を生成。

### .env.ai に設定

```
NEXTAUTH_SECRET=生成された文字列
```

---

## 3. OpenAI API キー（カスタム作成にのみ必要）

クイック作成のみ使う場合は不要。カスタム作成（AIメニュー生成）を使う場合のみ設定。

### 取得手順

1. [platform.openai.com](https://platform.openai.com/) にログイン
2. 右上のプロフィール → **API キー**
3. **Create new secret key** をクリック
4. 表示されたキーをコピー（一度しか表示されないので保存すること）

### .env.ai に設定

```
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxx
```

---

## 4. Supabase API キー（メニュー保存・マイページ）

### 取得手順

1. [supabase.com](https://supabase.com) にログイン
2. プロジェクトを作成（または既存プロジェクトを選択）
3. 左メニュー **Settings**（歯車）→ **API**
4. 以下をコピー:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon (public)** キー → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### .env.ai に設定

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xxxxx
```

### 補足

Supabase を使うには `menus` テーブルの作成も必要です。詳細は `docs/SUPABASE_SETUP.md` を参照。

---

## 5. Vercel での本番環境設定

Vercel にデプロイする場合:

1. プロジェクト → **Settings** → **Environment Variables**
2. 上記の変数をすべて追加
3. **Production / Preview / Development** にチェック
4. 再デプロイ

---

## まとめ

| 変数 | 用途 | 必須 |
|------|------|------|
| GOOGLE_CLIENT_ID | ログイン | ○ |
| GOOGLE_CLIENT_SECRET | ログイン | ○ |
| NEXTAUTH_SECRET | ログイン | ○ |
| OPENAI_API_KEY | カスタム作成（AI） | △ |
| NEXT_PUBLIC_SUPABASE_URL | 認証・メニュー保存・マイページ | ○ |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | 認証・メニュー保存・マイページ | ○ |

設定後は `npm run dev` を再起動してください。
