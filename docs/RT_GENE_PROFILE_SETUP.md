# RT GENE PROFILE セットアップ

遺伝子情報PDFの格納・表示機能のセットアップ手順です。

## 1. マイグレーション実行

Supabase で以下を実行してください。

**方法A: SQL Editor で手動実行**

1. Supabase Dashboard → SQL Editor
2. `supabase/migrations/20260307200000_create_gene_profiles.sql` の内容をコピー
3. Run で実行

**方法B: npm run db:migrate**

`DATABASE_URL` を設定した状態で:

```bash
DATABASE_URL="postgresql://..." npm run db:migrate
```

※ 既存のマイグレーションも実行されます。gene_profiles のみ実行したい場合は、SQL Editor で該当ファイルの内容を実行してください。

## 2. Storage バケットの確認

マイグレーションに `gene-profiles` バケットの作成が含まれています。実行後、Supabase Dashboard → Storage で `gene-profiles` バケットが存在することを確認してください。

存在しない場合は、Storage → New bucket で以下を作成:

- Name: `gene-profiles`
- Public: オフ（private）
- File size limit: 10MB
- Allowed MIME types: `application/pdf`

## 3. 動作確認

1. ログインしてマイページを開く
2. サイドバーから「RT GENE PROFILE」をクリック
3. PDFをアップロード
4. 一覧から「表示」をクリックしてプレビューを確認

## 4. トラブルシューティング

### PDF が表示されない（500 Internal Server Error）

**原因**: HTTP ヘッダーは ByteString（ASCII のみ）である必要がある。`Content-Disposition` の `filename` に日本語（例: ユーザー名）をそのまま入れると、`TypeError: Cannot convert argument to a ByteString because the character at index N has a value of XXXXX which is greater than 255` が発生する。

**対策**: `src/lib/content-disposition.ts` の `safeContentDisposition()` を使うこと。RFC 5987 に従い、`filename=`（ASCII フォールバック）と `filename*=UTF-8''`（エンコード済み UTF-8）の両方を指定する。他の API でダウンロードファイル名をヘッダーに載せる場合も同様に `safeContentDisposition` を使用すること。
