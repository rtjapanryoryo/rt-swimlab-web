# Supabase Staging 運用メモ

このドキュメントは、RT Swim Lab の本番 Supabase DB に触らずに
migration 適用と quick 生成保存を確認するための staging 環境メモです。

secret 値はこのファイルに書きません。Project URL、anon key、
service_role key、DB password、Auth user UID、connection string、
`.env.ai` / `.env.local` の実値は、Dashboard またはローカルの
Git 管理外ファイルで確認してください。

## Staging 環境の概要

- Supabase project name: `rt-swimlab-staging`
- Region: `ap-northeast-1`
- 目的: 本番 DB に触らず、migration と quick 生成保存を検証する
- local migration 26 件を staging project に適用済み
- `supabase migration list` で Local / Remote が全件一致したことを確認済み

## 実施済み確認

Supabase Dashboard の Table Editor で以下のテーブルを確認済みです。

- `profiles`
- `menus`
- `generation_logs`

Auth / profiles まわりの確認:

- staging 用 Auth テストユーザーを作成済み
- Auth Users の UID と `profiles.id` が一致することを確認済み
- `profiles` 自動作成 trigger が動作していることを確認済み

ローカル env まわりの確認:

- `.env.ai` を staging 接続先として設定して確認済み
- `.env.ai` と `.env.local` は `.gitignore` 対象
- `NEXT_PUBLIC_SUPABASE_URL` は `https://xxxxx.supabase.co` 形式までにする
- `NEXT_PUBLIC_SUPABASE_URL` に `/auth/v1` や `/rest/v1` を付けない
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` は Supabase API Keys の `anon public`
- `SUPABASE_SERVICE_ROLE_KEY` は `service_role`
- `SUPABASE_SERVICE_ROLE_KEY` は `NEXT_PUBLIC_` に絶対に入れない
- `DEV_BYPASS_USER_ID` と `NEXT_PUBLIC_DEV_BYPASS_USER_ID` は staging Auth user の UID

## Quick 生成保存テスト結果

localhost で以下を確認済みです。

- `/login?redirect=/mypage/menu` が表示される
- 開発用ログイン後に `/mypage/menu` が表示される
- quick / custom タブが表示される
- quick 条件:
  - 練習時間: 60 分
  - 距離タイプ: S
  - 距離: 2,000m
- quick 生成が成功する
- 画面にメニューが表示される

staging DB で以下を確認済みです。

- `menus` にレコード追加あり
- `generation_logs` にレコード追加あり
- `profiles.total_usage_count` が増加

## 注意点

- 本番 DB では quick 生成ボタンを押していない
- Production Vercel env は変更していない
- Vercel Preview を staging Supabase へ向ける作業は未実施
- custom 生成はまだ押していない
- `.env.ai` は一時的な staging 接続運用として使った
- 将来的には `.env.ai.staging` / `.env.ai.production` や env file path 指定など、
  より明確な切替方式を検討する

## 再現時の安全チェック

staging へ向ける前に、次を確認します。

```powershell
git status -sb
git branch --show-current
npx.cmd supabase --version
Test-Path "supabase\.temp\project-ref"
```

`supabase/.temp/project-ref` が存在する場合は、現在の link 先が staging か
既存 project かを確認してから操作してください。誤って本番相当 project に
`db push` しないようにします。

staging migration を再適用または再確認する場合は、必ず link 先が
`rt-swimlab-staging` であることを Dashboard と CLI の両方で確認してから
進めます。

## Vercel Preview を staging に向ける場合

Vercel Preview を staging Supabase へ向ける場合は、Vercel の対象 project の
Preview 環境変数に staging 用の値を設定します。

設定対象の候補:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Preview で開発用バイパスを使うかは、用途と影響を確認してから判断します。
使う場合のみ以下を検討します。

- `DEV_BYPASS_AUTH`
- `DEV_BYPASS_USER_ID`
- `NEXT_PUBLIC_DEV_BYPASS_AUTH`
- `NEXT_PUBLIC_DEV_BYPASS_USER_ID`

Production の環境変数はこの staging 確認では変更しません。

## 次ステップ候補

- Vercel Preview を staging Supabase へ向けるか検討する
- saved menu の表示と再読み込み後の表示を確認する
- custom 生成を開ける条件を整理する
- staging / production の env 切替方式を改善する
- 本番リリース前チェックリストを作成する
