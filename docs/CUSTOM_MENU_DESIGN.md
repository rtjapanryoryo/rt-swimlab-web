# カスタムメニュー生成：コード設計（APIキー・思想フル活用）

## 設計目標

1. **APIキー（AI）の最大活用** … プロンプト設計でモデルの能力を引き出し、一貫した高品質出力を得る
2. **思想のフル活用** … RT_MENU_GENERATION_RULES_JA.md を唯一の正本として、実際にAIに渡す
3. **10条件の完全反映** … 全入力が設計の根拠となり、漏れなく反映される

---

## 情報の流れ（3つの柱）

```
┌─────────────────────────────────────────────────────────────────┐
│  1. プロトコル（思想）                                            │
│     docs/RT_MENU_GENERATION_RULES_JA.md を実際に読み込み          │
│     → システムプロンプトの冒頭に注入（最優先）                      │
└─────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────┐
│  2. 共有参照資料（辞書）                                          │
│     content/common/ 内の .md / .txt / .json                        │
│     → 実施例・パターン・用語をAIに提供                             │
└─────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────┐
│  3. 環境条件（10項目）                                            │
│     buildConditionInstructions で組み立て                          │
│     → ユーザープロンプトで注入。この条件から設計を導く             │
└─────────────────────────────────────────────────────────────────┘
                                    ↓
                              gpt-4o-mini
                                    ↓
                           JSONメニュー出力
```

---

## 実装変更一覧

### 1. プロトコル読み込みの追加

**content.ts** に `getProtocolContent()` を追加：

```typescript
/** プロトコル＝ジェネレート（docs/RT_MENU_GENERATION_RULES_JA.md） */
export async function getProtocolContent(): Promise<string> {
  const fullPath = path.join(PROJECT_ROOT, 'docs', 'RT_MENU_GENERATION_RULES_JA.md');
  return fs.readFile(fullPath, 'utf-8').catch(() => '');
}
```

- `docs/RT_MENU_GENERATION_RULES_JA.md` を直接読み込む
- 無ければ空文字で継続（後方互換）

---

### 2. システムプロンプトの組み立て順

** route.ts** の systemContent 構築を次の順序に変更：

```typescript
// 1. プロトコル（思想）※最優先。これがAIの判断基準
const protocolContent = await getProtocolContent();
if (protocolContent) {
  systemContent += '【プロトコル＝ジェネレート（必ず従うこと）】\n' + protocolContent + '\n\n---\n\n';
}

// 2. 共有参照資料（辞書）
if (commonContent) {
  systemContent += '【共有参照資料（内容パターン・実施例）】\n' + commonContent + '\n\n---\n\n';
}

// 3. 出力形式・補足ルール（軽量。プロトコルと重複しない部分のみ）
systemContent += CORE_SYSTEM_PROMPT;  // 出力JSON形式、必須チェック等
```

- `SYSTEM_PROMPT` から「思想」部分を削除し、プロトコルに集約
- 残すのは「出力形式・JSONキー・必須チェック」など、プロトコルにない補足のみ

---

### 3. プロンプトの簡素化と分離

**route.ts** の `SYSTEM_PROMPT` を `CORE_SYSTEM_PROMPT` にリネームし、内容を削る：

- 削除：指導思想、期の定義、Mainルール、強度目安など（プロトコルから読む）
- 残す：役割説明、出力形式、JSONスキーマ、必須カスタマイズ（intention/coachingPoint/caution）

例：

```typescript
const CORE_SYSTEM_PROMPT = `あなたはRT-japanの競泳専門AIコーチです。
上記の【プロトコル＝ジェネレート】に必ず従い、入力10条件から練習メニューを設計してください。
推測での捏造は禁止。サークル等は資料・条件に基づく値のみ使用。

【出力】
- 必ず指定のJSONオブジェクト1つのみ。説明文は不要。
- intention / coachingPoint / caution は10条件に合わせてカスタマイズすること。
- プロトコルの構造・種目ルール・強度ルールを厳守すること。`;
```

---

### 4. ユーザープロンプトの構成

```typescript
const userPrompt = `【入力10条件（すべてを設計の根拠とすること）】
1. 期: ${period}
2. 種目: ${stroke}
...
10. ボリュームUP: ${volumeUp}

【反映ルール（各条件から導く設計指針）】
${conditionInstructions}

【出力形式】
（JSONスキーマ）
`;
```

- 10条件と反映ルールを明示
- 「この条件からどう導くか」をAIに意識させる

---

### 5. モデル設定の検討

| 設定 | 現状 | 検討 |
|------|------|------|
| model | gpt-4o-mini | キー単価を許容するなら gpt-4o で精度向上 |
| temperature | 0.6 | 多様性と再現性のバランス。0.5〜0.7 で調整 |
| response_format | json_object | 維持 |
| max_tokens | 規定値 | プロトコル分を考慮し、2048〜4096 を明示指定 |

---

### 6. エラーハンドリング

- プロトコル読み込み失敗 → 空のまま継続（既存のハードコードルールにフォールバック可能）
- プロトコルが空かつ common も空 → 警告ログを出すが、CORE_SYSTEM_PROMPT だけでも生成継続

---

## ファイル変更まとめ

| ファイル | 変更内容 |
|----------|----------|
| `src/lib/rt/content.ts` | `getProtocolContent()` 追加 |
| `src/app/api/custom-menu/route.ts` | プロトコル読み込み、systemContent 構築順、SYSTEM_PROMPT の整理 |
| `content/common/` | 共通メニュー辞書（.md 等）を配置すると、より効果的 |

---

## 期待効果

1. **思想の一元化** … RT_MENU_GENERATION_RULES_JA.md を編集するだけで、AIの判断基準を更新できる
2. **ドキュメントと実装の一致** … 「正本」が実際に参照される
3. **出力品質の向上** … 思想・辞書・条件の3つが揃い、一貫したメニュー design が可能になる
4. **保守性** … ルール変更はドキュメントだけ。コード変更を最小限に抑えられる
