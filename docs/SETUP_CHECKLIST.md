# セットアップチェックリスト

RT swim lab を動かすために必要な設定の一覧です。

---

## 1. Supabase「箱」を作成

1. [supabase.com](https://supabase.com) にログイン
2. **New project** でプロジェクト作成
3. ダッシュボード → **Settings** → **API** で以下をコピー:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL` と `SUPABASE_URL`
   - anon (public) key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - service_role key → `SUPABASE_SERVICE_ROLE_KEY`
4. **Authentication** → **Providers** → **Email** を有効化
5. **Confirm email** をオフにすると、登録後すぐログイン可能

### テーブル作成

```bash
npx supabase link --project-ref <プロジェクトID>
npx supabase db push
```

または SQL Editor で `supabase/migrations/20260304151513_create_menus_table.sql` を実行。

---

## 2. .env.ai に設定

`.env.ai.example` をコピーして `.env.ai` を作成し、以下を埋める:

| 変数 | 用途 |
|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase の URL（必須・認証） |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon key（必須・認証） |
| `SUPABASE_URL` | 同上（サーバー用） |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role key（メニュー保存用） |
| `OPENAI_API_KEY` | カスタム作成用（**任意**。クイック作成は不要） |

**注意:** 以前 `.env.local` に書いていたキーは読み込まれません。`.env.ai` に移してください。

---

## 3. 動作確認

```bash
npm run dev
```

- `/signup` で新規登録
- `/login` でログイン
- トップでメニュー作成 → マイページで確認
