# Vercel 環境変数チェックリスト

GitHub 連携で Vercel にデプロイしている場合、以下を Vercel ダッシュボードで設定してください。

## 必須（認証・サインアップ・ログイン）

| 変数名 | 値の取得元 |
|--------|------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API → anon (public) key |

## 必須（メニュー保存・マイページ）

| 変数名 | 値の取得元 |
|--------|------------|
| `SUPABASE_URL` | 同上（Project URL） |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API → service_role key |

## 任意（カスタム作成）

| 変数名 | 用途 |
|--------|------|
| `OPENAI_API_KEY` | AI によるカスタムメニュー生成 |

---

## 設定手順

1. [Vercel ダッシュボード](https://vercel.com/dashboard) → プロジェクトを選択
2. **Settings** → **Environment Variables**
3. 上記の変数を追加（Production / Preview / Development で必要に応じて選択）
4. **Save** 後、**Redeploy** で再デプロイ

---

## 動作確認

デプロイ後に以下で確認：

- `https://あなたのサイト/api/health` を開く
- `authConfigured: true` になっていれば OK
- `/signup` で登録ができるか試す
