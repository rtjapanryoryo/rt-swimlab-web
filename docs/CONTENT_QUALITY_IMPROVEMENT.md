# 演習内容の質向上・情報ソースの拡充

## 現状の情報ソース（生成時にAIへ渡しているもの）

| 順序 | ソース | 内容 |
|------|--------|------|
| 1 | COACH_INTERVIEW_50_QA.md | 高代コーチの思想（50問インタビュー） |
| 2 | content/common/prompt.* | 追加プロンプト（あれば） |
| 3 | content/common/*.md | menu-dictionary、swimming-science-references、custom-period-rules |
| 4 | CORE_SYSTEM_PROMPT | RT_MENU_GENERATION_RULES の要約版（ハードコード） |

**※ RT_MENU_GENERATION_RULES_JA.md の正式全文は現状読み込まれていない**（CORE_SYSTEM_PROMPT が簡略版）

---

## 1. 過去に入っている情報の活用強化

### 実装可能な改善

1. **RT_MENU_GENERATION_RULES_JA.md を正式に読み込む**
   - プロトコル＝ジェネレートの正本をそのまま渡す
   - 期別ルール・強度表記・構造の詳細がAIに届く

2. **参照順序・重み付けの最適化**
   - 思想（COACH_INTERVIEW）→ プロトコル（RT_MENU）→ 辞書・実施例 の順で一貫させる
   - 「演習内容の具体性」を辞書とプロトコルから優先して参照する指示を強化

3. **content/common の拡充**
   - menu-dictionary に種目・期別の実施例を追加
   - 高代コーチの思想に即した「良い練習」の具体例をテキストで追加

---

## 2. 現在のネット上の情報の活用

### 選択肢と実現可能性

| 方式 | 実現可能性 | 必要なもの | 備考 |
|------|-----------|------------|------|
| **A. Web検索API連携** | ◎ 可能 | Serper / Bing / Tavily 等のAPIキー | 生成時に「水泳 発展形成期 ドリル」等で検索し、結果をプロンプトに追加 |
| **B. 事前にスクレイプしたコンテンツ** | ◎ 可能 | スクリプト + content への配置 | 定期的にRT公式サイトや参考URLを取得し、.md に保存。getCommonContent で読み込む |
| **C. RAG（ベクトル検索）** | △ 中程度 | Supabase pgvector 等 | ウェブコンテンツを埋め込み、クエリに応じて類似ドキュメントを取得。初期構築の工数が大きい |

### 推奨アプローチ

**短期（すぐ実装）:** A または B  
- **A** … APIキー追加で、生成都度の検索結果を参照可能  
- **B** … 外部API不要。参照したいURLを指定し、手動または定期実行で content を更新  

**中期:** content/common に「最新の水泳ドリル・練習事例」を随時追加する運用

---

## 実装済み（2025年3月）

- [x] **過去の情報強化** … RT_MENU_GENERATION_RULES_JA.md を正式読み込み。
- [x] **A: Web検索API（Serper）** … SERPER_API_KEY 設定時、期・種目・距離タイプに応じた専門的英語クエリで検索。結果をプロンプトに追加。
- [x] **B: 事前スクレイプ** … `content/common/web-sources.json` で URL を指定し、`npm run web:fetch` で取得。`web-sourced.md` に保存され getCommonContent で自動読み込み。

---

## A: 専門的クエリの最適化

汎用検索（例: 「水泳 発展形成期 ドリル」）ではなく、以下の専門用語で検索：

| 期 | クエリ例 |
|----|----------|
| 発展形成 | swimming development phase EN2 EN3 transition main set |
| 発展形成 | swim technique drill progression SKPS catch-up fingertip drag |
| スピード持久 | swimming speed endurance VO2max lactate threshold set |
| 耐乳酸 | swimming lactate tolerance anaerobic set design elite |

**用語**: EN1/EN2/EN3、AN1/AN2、DPS、SKPS、catch-up、early vertical forearm、lactate threshold、polarized training、taper 等。

---

## B: スクレイプ手順

1. `content/common/web-sources.json` を編集
2. 参照したい URL を追加し `enabled: true` に設定
3. `npm run web:fetch` を実行
4. `content/common/web-sourced.md` が生成され、カスタム生成時に参照される
