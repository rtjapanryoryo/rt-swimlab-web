# custom生成コンテキスト管理

このディレクトリは、custom生成でAIへ渡す指示と、そのバージョンを確認するための正本です。
「何を直すと生成結果のどこが変わるか」を、元の作成者以外でも追える状態にすることを目的とします。

## 現在AIへ渡しているもの

| 管理対象 | 正本 | 変更した場合の主な影響 |
| --- | --- | --- |
| AIの役割・最優先ルール | `context-config.json` の `systemPrompt` | 説明文、指導ポイント、注意点の方向性 |
| 種目・期の表示名 | `context-config.json` の `labels` | AIへ渡す入力条件の表記 |
| AIの出力形式 | `context-config.json` の `outputContract` | JSONの項目と文章量 |
| モデル既定値 | `context-config.json` の `modelDefaults` | 生成の揺らぎ、出力量。モデル名は `OPENAI_MODEL` が優先 |
| Mainの分割・本数・強度 | `src/lib/rt/main-set-generator.ts` | Main数、本数、距離、強度、所要時間 |
| サークル・Rest | `src/lib/rt/training-timing.ts` | ベストタイムからのペース、休憩、丸め方 |
| ベストタイム取得 | `src/app/api/custom-menu/route.ts` | 使用する本人記録の条件 |
| 最終プロンプト組み立て | `src/lib/ai-context/custom-menu-context.ts` | AIへ実際に送る文章全体 |
| 固定評価ケース | `evaluation-cases.json` | 変更前後で確認する入力条件と合格基準 |

## 既存だが現在のcustom生成では未使用の資料

以下は `content/common/` にありますが、現在の `/api/custom-menu` からは読み込まれていません。
資料を編集しても、現時点ではcustom生成結果は変わりません。

- `coach-philosophy.md`
- `custom-period-rules.md`
- `menu-dictionary.md`
- `menu-examples.md`
- `menu-patterns.md`
- `rt-japan-practice-samples.md`
- `session-patterns-db.md`
- `swimming-science-references.md`

これらを一括でAIへ渡すと、トークン増加、指示の競合、数値の上書きが起きる可能性があります。
今後は種目・期・強度に必要な部分だけを選ぶ仕組みを追加してから接続します。

## 更新時のルール

1. `context-config.json` の本文を変更したら、対応するバージョンも更新します。
2. 数値ルールを変更した場合は、TypeScript側のルールバージョンとmanifestを同時に更新します。
3. 固定評価ケースを実行し、変更前より悪化していないことを確認します。
4. ステージングでコーチ確認後に本番へ反映します。
5. APIキー、会員の個人情報、環境変数の値はこのディレクトリへ保存しません。

## 今後追加するもの

- Mainを原則1つにする生成ルール
- 種目・期・強度に応じた知識選択
- 良い出力例・悪い出力例の蓄積
- 現行版と修正版の比較テスト
- コンテキストの公開・ロールバック手順
