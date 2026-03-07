#!/usr/bin/env node
/**
 * ターミナルから対話的に .env.ai を設定
 * npm run setup:env:interactive で実行
 */
import { createInterface } from 'readline';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const envPath = path.join(root, '.env.ai');

const vars = [
  {
    key: 'NEXT_PUBLIC_SUPABASE_URL',
    label: 'NEXT_PUBLIC_SUPABASE_URL (Project URL)',
    hint: 'https://xxxxx.supabase.co',
    required: true,
  },
  {
    key: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    label: 'NEXT_PUBLIC_SUPABASE_ANON_KEY (anon public キー)',
    hint: 'eyJhbGciOi... で始まる長い文字列',
    required: true,
  },
  {
    key: 'OPENAI_API_KEY',
    label: 'OPENAI_API_KEY (任意・カスタム作成のみ)',
    hint: 'sk-proj-... または Enter でスキップ',
    required: false,
  },
];

function parseEnv(content) {
  const result = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq > 0) {
      const key = trimmed.slice(0, eq).trim();
      const val = trimmed.slice(eq + 1).trim();
      result[key] = val;
    }
  }
  return result;
}

function prompt(rl, text) {
  return new Promise((resolve) => {
    rl.question(text, resolve);
  });
}

async function main() {
  let existing = {};
  if (existsSync(envPath)) {
    existing = parseEnv(readFileSync(envPath, 'utf8'));
    console.log('既存の .env.ai を読み込みました。Enter で現在の値を維持\n');
  } else {
    console.log('.env.ai がありません。新規作成します。\n');
  }

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const values = { ...existing };

  for (const v of vars) {
    const current = existing[v.key];
    const defaultHint = current ? `[現在: ${current.slice(0, 20)}...]` : '';
    const input = await prompt(
      rl,
      `${v.label}\n  ヒント: ${v.hint} ${defaultHint}\n  > `
    );
    const val = input.trim();
    if (val) values[v.key] = val;
    else if (v.required && !values[v.key]) {
      console.log('  ⚠ 必須項目です。後で .env.ai を編集してください。\n');
    }
  }

  rl.close();

  // 既存の .env.ai から他の行を保持（当該キー以外）
  let otherLines = [];
  if (existsSync(envPath)) {
    const content = readFileSync(envPath, 'utf8');
    const keysToReplace = new Set(vars.map((v) => v.key));
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      if (trimmed.startsWith('#')) {
        otherLines.push(line);
        continue;
      }
      const eq = trimmed.indexOf('=');
      if (eq > 0 && !keysToReplace.has(trimmed.slice(0, eq).trim())) {
        otherLines.push(line);
      }
    }
  }

  const body = `# RT swim lab 環境変数
# 編集可。Git に含まれません。

# Supabase
NEXT_PUBLIC_SUPABASE_URL=${values.NEXT_PUBLIC_SUPABASE_URL || ''}
NEXT_PUBLIC_SUPABASE_ANON_KEY=${values.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''}

# OpenAI（任意）
OPENAI_API_KEY=${values.OPENAI_API_KEY || ''}
${otherLines.length ? '\n# その他\n' + otherLines.join('\n') : ''}
`;

  writeFileSync(envPath, body, 'utf8');
  console.log('\n✅ .env.ai を保存しました。');
  console.log('   npm run dev で起動してください。\n');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
