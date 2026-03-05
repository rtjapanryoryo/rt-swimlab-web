# 環境変数クイックスタート

## 1. テンプレートから作成

### 対話式（ターミナルから入力）

```bash
npm run setup:env:interactive
```

各変数をターミナルで順に入力し、.env.ai に保存されます。

### 引数で一括設定

```bash
npm run set:env -- NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

複数の `KEY=value` を空白区切りで指定できます。

### テンプレートコピー

```bash
npm run setup:env
```

または手動で:

```bash
cp .env.ai.example .env.ai
```

## 2. 値を入れる

`.env.ai` を開き、`=` の右側に値を記入してください。

### Supabase（必須）

| 行 | 変数名 | 入れる値 |
|----|--------|----------|
| 1 | `NEXT_PUBLIC_SUPABASE_URL` | `https://xxxxx.supabase.co`（Project URL） |
| 2 | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon (public) キー（長い JWT 文字列） |
| 3 | `SUPABASE_URL` | 1 と同様 |
| 4 | `SUPABASE_SERVICE_ROLE_KEY` | service_role キー |

**取得先:** supabase.com → プロジェクト → Settings → API

### OpenAI（任意・カスタム作成のみ）

| 行 | 変数名 | 入れる値 |
|----|--------|----------|
| 5 | `OPENAI_API_KEY` | `sk-proj-xxxxx` |

## 3. 記入例

```
NEXT_PUBLIC_SUPABASE_URL=https://jxhjxbmnzoqxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xxxx
SUPABASE_URL=https://jxhjxbmnzoqxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xxxx
OPENAI_API_KEY=sk-proj-xxxx
```

- クォート不要
- `=` の前後にスペースを入れない
- 行末に余分なスペースを入れない

## 4. 起動

```bash
npm run dev
```

## 5. 確認・診断

設定が正しく反映されているか確認:

```bash
npm run fix:supabase
```

- 4変数が設定されていれば OK と表示
- 不足があれば追加手順を表示
- その後 `npm run dev` で起動し、/signup で登録を試す
