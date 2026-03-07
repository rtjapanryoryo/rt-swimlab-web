# Vercel 環境変数チェックリスト

GitHub 連携で Vercel にデプロイしている場合、以下を Vercel ダッシュボードで設定してください。

## 必須（認証・サインアップ・ログイン）

| 変数名 | 値の取得元 |
|--------|------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API → anon (public) key |

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
- `/login` および `/signup` に「Google でログイン/登録」が表示されること
- `/signup` で登録ができるか試す

## Google が出ない場合

- Vercel の **Settings → Environment Variables** で `NEXT_PUBLIC_SUPABASE_URL` と `NEXT_PUBLIC_SUPABASE_ANON_KEY` が設定されているか確認
- 変数は **Production / Preview / Development** のいずれかで有効であること（必要な環境にチェック）
- 設定後は **Redeploy** を実行（環境変数を変更しただけでは反映されない）
