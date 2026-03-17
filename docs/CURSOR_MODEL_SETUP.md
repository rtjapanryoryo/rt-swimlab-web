# Cursor モデル設定ガイド

「そのときに使える最高性能のモデル」を使うための設定手順。

---

## 設定方法（UI）

1. **Cursor メニュー** → **Settings** → **Cursor Settings**
2. **Models** セクションを開く
3. 以下を「最上位のモデル」に設定：
   - **Chat model**: Claude Opus 4.6 / Claude 3.7 Sonnet 等（利用可能な中で最上位）
   - **Composer model**（Agent）: 同上

4. **モデル切り替え**：
   - AI 入力欄の下にある **モデル選択ドロップダウン**（⌘/ でも表示）
   - その場で即時切り替え可能

---

## 利用可能な主なモデル（2024年頃）

| プロバイダ | モデル | 用途 |
|-----------|--------|------|
| Anthropic | Claude Opus 4.6 | 複雑なタスク・高品質 |
| Anthropic | Claude 3.7 Sonnet | 日常利用・コストと性能のバランス |
| OpenAI | GPT-4o, o1, o3-mini | 汎用・推論重視 |
| Google | Gemini 3 Pro | 汎用 |
| Cursor | cursor-small | 無料枠 |

---

## 推奨設定

- **Chat**: Claude Opus 4.6 または Claude 3.7 Sonnet
- **Composer（Agent）**: 同上

※プラン・利用状況によって利用可能モデルは異なります。

---

## 注意

- モデル選択は **settings.json では設定不可**（Cursor UI のみ）
- 選択したモデルはセッション間で保持される
