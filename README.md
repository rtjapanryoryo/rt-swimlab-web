# RT Swim Lab

## ローカル開発メモ

Windows PowerShellでは `npm run dev` または `npm run dev:3001` を使ってください。
旧来のポート解放付き起動は、macOS/Linux向けの `npm run dev:unix` として分離しています。

ローカルでログイン後ページや `/mypage/menu` を確認する手順は `docs/LOCAL_DEV.md` を参照してください。

## 1. サービス概要

RT Swim Labは、水泳トレーニングメニューの生成・管理を行うWebアプリです。

## 2. 技術スタック

- Next.js
- TypeScript
- Supabase
- Vercel
- OpenAI API
- Stripe

## 3. 現在の本番構成

- 本番アプリはルートNext.jsアプリです。
- VercelのRoot Directoryは `./` です。
- 本番URLの `/admin` は `src/app/admin/**` に紐づきます。
- 管理APIは `src/app/api/admin/**` です。
- Supabase接続は `src/lib/supabase/**` です。

## 4. ローカル起動方法

初回セットアップでは依存関係をインストールし、`.env.ai.example` をもとに `.env.ai` を用意します。

```bash
npm install
npm run setup:env
```

開発サーバーは以下で起動します。

```bash
npm run dev
```

通常のNext.js dev serverを直接起動したい場合は以下を使います。

```bash
npm run dev:next
```

3001番ポートで起動したい場合は以下を使います。

```bash
npm run dev:3001
```

pm2でバックグラウンド起動するscriptもあります。

```bash
npm run dev:daemon
npm run dev:daemon:stop
npm run dev:daemon:logs
```

環境変数の詳細は `docs/ENV_SETUP.md` も確認してください。

## 5. 環境変数

値やsecretはREADMEに書かないでください。必要な値はローカルの `.env.ai` やVercel dashboardで管理します。

| 変数名 | 用途 |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | ブラウザ側でも参照するSupabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ブラウザ側でも参照するSupabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | サーバー側限定のSupabase service role key |
| `OPENAI_API_KEY` | custom生成などOpenAI API利用時のAPI key |
| `OPENAI_MODEL` | OpenAI APIで利用するモデル名 |
| `DATABASE_URL` | Supabase/Postgresへ直接接続するscriptやmigration用途 |
| `SUPABASE_ACCESS_TOKEN` | Supabase CLIや管理script用途 |
| `DEV_BYPASS_AUTH` | ローカル開発時の認証バイパス用途 |
| `DEV_BYPASS_USER_ID` | 認証バイパス時に使う開発用ユーザーID |

注意:

- `SUPABASE_SERVICE_ROLE_KEY` はRLSをバイパスできるため、サーバー側限定で扱ってください。
- API key、service role key、secret値はREADME、HANDOFF、issue、PR本文に書かないでください。
- `.env.ai.example` で確認できた変数は `NEXT_PUBLIC_SUPABASE_URL`、`NEXT_PUBLIC_SUPABASE_ANON_KEY`、`OPENAI_API_KEY` です。その他の変数はscriptや運用で必要になる可能性があるため、利用箇所を確認してください。

## 6. Supabase / 認証

- Supabase Authを使用します。
- 管理者判定は `profiles.role === 'admin'` を使います。
- RLSが関係するため、DB変更時はmigration、RLS policy、API側の権限確認をセットで確認してください。
- Service Role KeyはRLSをバイパスできるため、取り扱いに注意してください。

## 7. 管理画面

- 本番運用対象の管理画面は `src/app/admin/**` です。
- 管理APIは `src/app/api/admin/**` です。
- middleware / admin layout / API側で管理者権限チェックを行う構成です。
- 一般ユーザーは `/admin` へアクセスできない前提です。

## 8. 削除済みの旧管理画面 `admin/`

以前は `admin/` に独立Next.jsアプリが存在していました。

調査の結果、現在の本番 `/admin` には紐づいていませんでした。Vercel上でも `admin/` をRoot Directoryにした別プロジェクトやadmin専用ドメインは確認されませんでした。

そのため、`admin/` は旧実装・検証実装として削除済みです。

- 削除コミット: `401e4aa chore: remove unused standalone admin app`

## 9. メニュー生成機能

- quick生成は、本リリース前改善の中心候補です。
- custom生成はOpenAI APIに依存する可能性があります。
- OpenAI API未設定時の画面側の扱い、サーバー側フォールバック、エラー表示は本リリース前に要確認です。
- `/mypage/menu` は本リリース前の改善期間としてメンテナンス表示になっている場合があります。メンテナンス解除方針は実装修正前に確認してください。
- 生成履歴、保存済みメニュー、実施済み練習の扱いは分離方針を確認してください。

## 10. デプロイ

- Vercelを使用します。
- 本番ブランチは `main` 想定です。
- VercelのRoot Directoryは `./` です。
- Build Command / Output Directory / Install Command はVercel側でOverrideなしの想定です。
- 環境変数変更後は再デプロイが必要になる場合があります。
- 詳細はVercel dashboard側で確認してください。

## 11. 既知の注意点

- `npm run build` は `admin/` 削除後に成功済みです。
- `npm run lint` は既存のESLintエラーで失敗中です。
- lintエラーは `src/app/admin/**` など既存コード由来で、`admin/` 削除由来ではありません。
- lint修正は別タスクで対応予定です。
- README.mdには元々、文字化けした説明、create-next-app初期テンプレート文言、末尾の `test` がありました。今回、引き継ぎ用READMEとして整理済みです。

## 12. 本リリース前の確認事項

- `/mypage/menu` のメンテナンス解除方針
- quick生成 / custom生成の扱い
- OpenAI APIの設定有無
- 生成履歴と実施履歴の分離
- PDF出力の見やすさ
- 管理画面の権限チェック
- 既存lintエラーの整理
- Stripe連携・料金設定
- README / HANDOFF.md の継続更新

## 13. 引き継ぎメモ

- 詳細な引き継ぎ情報は `HANDOFF.md` を参照してください。
- 未確定事項はREADMEで断定せず、HANDOFF.md側にも要確認として残してください。
- 既存READMEにはLINE共有時の注意に関する記載がありました。詳細は `docs/LINE_SHARING.md` を確認してください。
