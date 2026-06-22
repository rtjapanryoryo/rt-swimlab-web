# RT Swim Lab Handoff

## 現在の状態

- branch: `chore/remove-standalone-admin`
- `admin/` は削除済みです。
- `admin/` 削除コミット: `401e4aa chore: remove unused standalone admin app`
- 本番管理画面は `src/app/admin/**` です。
- 管理APIは `src/app/api/admin/**` です。
- `npm run build` は `admin/` 削除後に成功済みです。
- `npm run lint` は既存のESLintエラーで失敗しています。
- lintエラーは `admin/` 削除由来ではありません。

## 今後の改修対象

- `src/app/admin/**`
- `src/app/api/admin/**`
- `src/app/mypage/**`
- `src/components/**`
- `src/lib/**`

## 触るときに注意するもの

- Supabase migrationは不用意に変更しないでください。
- RLS policy変更は本番影響が大きいため、API側の権限確認と合わせて確認してください。
- 環境変数の値はREADMEやHANDOFFに書かないでください。
- `SUPABASE_SERVICE_ROLE_KEY` はサーバー側限定です。
- `src/app/**`、`src/lib/**`、`supabase/**` は目的のあるタスクでのみ変更してください。

## OpenAI / Supabase / Vercel / Stripe 確認事項

- OpenAI API keyはVercel Productionに設定が必要です。
- `OPENAI_MODEL` の利用有無と本番値は要確認です。
- Supabase接続は `src/lib/supabase/**` を保守対象にします。
- 管理者判定は `profiles.role === 'admin'` です。
- VercelのRoot Directoryは `./` です。
- Vercel上で `admin/` をRoot Directoryにした別プロジェクトやadmin専用ドメインは確認されていません。
- Stripeは本リリース時に料金体系と環境変数を別途整理してください。

## 本リリース前の確認事項

- `/mypage/menu` のメンテナンス解除方針
- quick生成 / custom生成の扱い
- OpenAI APIの設定有無
- OpenAI未設定時の画面表示とサーバー側挙動
- 生成履歴と実施履歴の分離
- 保存済みメニューと実施済み練習の扱い
- PDF出力の見やすさ
- 管理画面の権限チェック
- 既存lintエラーの整理
- Stripe連携・料金設定
- README / HANDOFF.md の継続更新

## 未完成・保留事項

- `npm run lint` は既存エラーで失敗中です。別タスクで整理してください。
- `/mypage/menu` のメンテナンス解除は、本リリース前の機能整理後に判断してください。
- quick生成を本リリース初期版の中心にするか、custom生成も含めるかは要確認です。
- OpenAI API未設定時のcustom生成の扱いは要確認です。
- 生成日と実施日の分離、練習後メモ、タイム入力はDB変更要否を確認してください。
- LINE共有時の扱いは `docs/LINE_SHARING.md` を確認してください。

## README整理メモ

- 旧READMEにはcreate-next-app初期テンプレート文言が残っていました。
- 旧READMEには文字化けした説明が残っていました。
- 旧README末尾には `test` が残っていました。
- 今回、READMEは引き継ぎ用の構成へ再整理しました。
