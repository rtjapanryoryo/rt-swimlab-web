#!/usr/bin/env node
/**
 * ターミナルから KEY=value で .env.ai を設定
 *
 * 使用例:
 *   node scripts/set-env.mjs NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
 *   node scripts/set-env.mjs KEY1=val1 KEY2=val2
 *   npm run set:env -- NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
 */
import { readFileSync, writeFileSync, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const envPath = path.join(root, '.env.ai');

const knownKeys = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'OPENAI_API_KEY',
];

function parseEnv(content) {
  const result = {};
  const lines = content.split('\n');
  for (const line of lines) {
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

function serializeEnv(values) {
  const groups = {
    supabase: [
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    ],
    openai: ['OPENAI_API_KEY'],
  };
  let out = `# RT swim lab 環境変数
# scripts/set-env.mjs で設定。Git に含まれません。

# Supabase
`;
  for (const k of groups.supabase) {
    out += `${k}=${values[k] || ''}\n`;
  }
  out += `\n# OpenAI（任意）
`;
  for (const k of groups.openai) {
    out += `${k}=${values[k] || ''}\n`;
  }
  const other = Object.keys(values).filter(
    (k) => !knownKeys.includes(k) && values[k]
  );
  if (other.length) {
    out += `\n# その他\n`;
    for (const k of other) {
      out += `${k}=${values[k]}\n`;
    }
  }
  return out;
}

function main() {
  const args = process.argv.slice(2);
  const updates = {};
  for (const arg of args) {
    const eq = arg.indexOf('=');
    if (eq > 0) {
      const key = arg.slice(0, eq).trim();
      const val = arg.slice(eq + 1).trim();
      if (key) updates[key] = val;
    }
  }

  if (Object.keys(updates).length === 0) {
    console.log('使い方: node scripts/set-env.mjs KEY=value [KEY2=value2 ...]');
    console.log('例: node scripts/set-env.mjs NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co');
    process.exit(1);
  }

  let values = {};
  if (existsSync(envPath)) {
    values = parseEnv(readFileSync(envPath, 'utf8'));
  }
  Object.assign(values, updates);

  writeFileSync(envPath, serializeEnv(values), 'utf8');
  console.log('✅ .env.ai を更新しました:', Object.keys(updates).join(', '));
}

main();
