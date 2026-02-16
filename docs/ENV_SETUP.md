# 環境変数セットアップ

このプロジェクトは `.env.ai` から環境変数を読み込みます。

## ⚠️ .env.ai が消える理由と対策

**なぜ消えるか**
- `.env.ai` は `.gitignore` に含まれており、**Git にコミットされません**（機密情報保護のため）
- そのため、以下の状況で `.env.ai` が存在しなくなります：
  - リポジトリを新規クローンした
  - 別の PC や環境で作業を始めた
  - プロジェクトフォルダを削除してクローンし直した

**対策（バックアップ）**
- `.env.ai` を作成したら、**安全な場所にバックアップ**してください
  - 例：パスワードマネージャー、暗号化されたクラウドストレージ、チーム共有の安全な場所
- 機密情報を含むため、**Git には絶対にコミットしない**でください

## 1. ファイルの作成

```bash
cp .env.ai.example .env.ai
```

## 2. 必要な変数

| 変数名 | 必須 | 説明 |
|--------|------|------|
| GOOGLE_CLIENT_ID | ○ | Google Cloud Console のクライアントID |
| GOOGLE_CLIENT_SECRET | ○ | Google Cloud Console のクライアントシークレット |
| NEXTAUTH_SECRET | ○ | 任意の32文字以上（`openssl rand -base64 32` で生成） |
| OPENAI_API_KEY | △ | カスタム作成のみ必要。クイック作成は不要 |

## 3. Google Cloud Console の設定

**承認済みの JavaScript 生成元:**
- `http://localhost:3000`
- `https://rt-swimlab-web-tl3a.vercel.app`

**承認済みのリダイレクト URI:**
- `http://localhost:3000/api/auth/callback/google`
- `https://rt-swimlab-web-tl3a.vercel.app/api/auth/callback/google`

## 4. 本番（Vercel）の場合

Vercel ダッシュボード → プロジェクト → Settings → Environment Variables に上記を設定。

## 5. 設定後

開発サーバーを再起動してください。

```bash
npm run dev
```

## 6. .env.ai を紛失した場合

1. **バックアップがある場合**: バックアップから `.env.ai` を復元する
2. **バックアップがない場合**: `.env.ai.example` をコピーして `.env.ai` を作成し、各変数に正しい値を再設定する（Google Cloud Console や OpenAI から再取得が必要な場合があります）
