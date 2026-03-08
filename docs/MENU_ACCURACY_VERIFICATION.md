# 練習メニュー精度検証

今回のルール追加（総距離一致・Pre-Main強度差・複数構成・耐乳酸期5000m）に基づく検証手順です。

## 検証スクリプトの実行

```bash
# サンプルメニューで検証（改善前後・耐乳酸期の比較）
node scripts/validate-menu-accuracy.mjs

# 生成済みメニューJSONで検証
node scripts/validate-menu-accuracy.mjs path/to/menu.json
```

## 検証項目

| 項目 | 内容 |
|------|------|
| 総距離とブロック合計の一致 | 各ブロックの距離×本数×セットの合計が total と一致すること |
| Pre-Main と Main の強度差 | Pre-Main は Main より一段階下であること |
| W-up 2〜3段階構成 | 段階的に体を作るための複数構成 |
| Kick 2構成 | 発展形成期・スピード持久期・耐乳酸期では2構成 |
| Pull 2構成 | Fr中心で質の違いを持たせる |
| 耐乳酸期120分S | 約5000m前後を確保 |

## 実際のAPI結果の検証手順

1. アプリでカスタム作成を実行（例: 耐乳酸期・120分・Sタイプ・目標5000m）
2. 生成されたメニューを保存するか、APIレスポンスを取得
3. `result` を含むJSONをファイルに保存（例: `menu-output.json`）
4. `node scripts/validate-menu-accuracy.mjs menu-output.json` で検証

### APIレスポンスの形式

```json
{
  "result": {
    "warmUp": "...",
    "drill": "...",
    "kick": "...",
    "pull": "...",
    "preMain": "...",
    "main": "...",
    "down": "...",
    "total": "合計距離：5,000m",
    ...
  },
  "period": "5",
  "practiceTime": "120",
  "distanceType": "S"
}
```

period / practiceTime / distanceType をコンテキストとして渡すと、期別・時間別の検証（例: 耐乳酸期120分の距離チェック）が有効になります。

## 検証サマリー（サンプル実行結果）

- **改善前サンプル**（テンプレート由来）: 不適合 4 件
- **改善後想定サンプル**: 不適合 0 件
- **耐乳酸期サンプル**: 不適合 0 件

→ 今回のルール追加により、適合度が向上する設計になっています。

※ AI（GPT）の生成品質は実行ごとに変動するため、実際の精度向上は上記手順で複数回検証して確認してください。
