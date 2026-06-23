# RT Swim Lab ローカル開発手順

このドキュメントは、ローカル環境で開発サーバーを起動し、`/mypage/menu` などログイン後ページを確認するための手順です。

## 1. 開発サーバーの起動

Windows、macOS、Linux 共通の通常起動は以下です。

```bash
npm run dev
```

このスクリプトはローカル環境変数を読み込んでから `next dev` を起動します。

3000番ポートがすでに使われている場合は、既存プロセスを停止するか、3001番で起動してください。

```bash
npm run dev:3001
```

macOS/Linuxで、3000番ポートを使っているプロセスを停止してから起動したい場合のみ、以下を使います。

```bash
npm run dev:unix
```

`dev:unix` は `lsof` や `xargs` を使うため、Windows PowerShellでは使わないでください。

## 2. ローカル環境変数ファイル

既存のプロジェクト運用では `.env.ai` を使います。PCごとのローカル上書きには `.env.local` も使えます。

どちらもGit管理対象外です。secret値をcommitしないでください。

`npm run dev` では `.env.local` を先に読みます。同じキーが `.env.ai` にもあり、かつ `.env.ai` 側に値が入っている場合は `.env.ai` を優先します。

`.env.ai` 側が空値の場合は、`.env.local` の値を上書きしません。

認証ページの確認に最低限必要なSupabase公開変数は以下です。

```dotenv
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

README、HANDOFF、Issue、Pull Request、チャットログにAPI keyやsecret値を書かないでください。

## 3. 開発用認証バイパス

`/mypage/menu` などのログイン後ページは、通常はSupabase Authのログインが必要です。

ローカルでUI確認だけを行いたい場合、このアプリには開発用の認証バイパスがあります。使う場合は `.env.ai` または `.env.local` に以下を設定します。

```dotenv
DEV_BYPASS_AUTH=true
DEV_BYPASS_USER_ID=<supabase-user-uuid>
NEXT_PUBLIC_DEV_BYPASS_AUTH=true
NEXT_PUBLIC_DEV_BYPASS_USER_ID=<same-supabase-user-uuid>
```

`DEV_BYPASS_USER_ID` には、Supabase Authまたは `profiles` に存在するユーザーUUIDを指定してください。

バイパス状態でメニュー保存などサーバー側のSupabase処理まで確認する場合、APIによっては以下も必要です。

```dotenv
SUPABASE_SERVICE_ROLE_KEY=
```

`SUPABASE_SERVICE_ROLE_KEY` はサーバー側限定のsecretです。`NEXT_PUBLIC_*` には絶対に入れず、値を共有・表示しないでください。

## 4. `/mypage/menu` の確認手順

1. Supabaseの公開変数を `.env.ai` または `.env.local` に設定します。
2. 通常ログインを使わない場合は、開発用認証バイパスの変数も設定します。
3. 環境変数を変更したら、開発サーバーを再起動します。
4. 以下を開きます。

   ```text
   http://localhost:3000/login?redirect=/mypage/menu
   ```

5. 開発用バイパスが有効なら、ログイン画面に表示される開発用ボタンを押します。
6. 以下で `/mypage/menu` を確認します。

   ```text
   http://localhost:3000/mypage/menu
   ```

`MAINTENANCE_MODE` が `true` の間は、通常のマイページナビゲーションにメニュー導線が表示されない場合があります。UI確認時は直接URLを開いてください。

## 5. Windowsで日本語ログが文字化けする場合

このリポジトリのMarkdownやスクリプトはUTF-8で保存します。

Windows PowerShellや古いコンソールで日本語ログが文字化けする場合は、コードやドキュメントではなく端末側の文字コード設定が原因のことがあります。可能であれば Windows Terminal または PowerShell 7 を使ってください。

必要な場合のみ、起動前に以下を試してください。

```powershell
chcp 65001
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new()
$OutputEncoding = [System.Text.UTF8Encoding]::new()
```

ログをファイルへリダイレクトして確認する場合、Windows PowerShell 5.1では `Get-Content` の既定エンコードによりUTF-8の日本語が文字化けして見えることがあります。その場合は以下のようにUTF-8を明示してください。

```powershell
Get-Content .\dev.log -Encoding UTF8
```

環境依存のため、この設定は強制しません。まずはファイル自体がUTF-8で保存されていることを確認してください。

## 6. Vercel Preview と localhost の違い

開発用認証バイパスはlocalhostでの確認用です。コード上も `NODE_ENV=development` のときだけ有効になる前提です。

Vercel Productionでは、開発用バイパス変数を設定しないでください。Preview環境で使う場合も、用途と影響を確認してから設定してください。

Vercel側の環境変数を変更した場合は、再デプロイが必要になることがあります。
