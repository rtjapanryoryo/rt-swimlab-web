#!/usr/bin/env node
/**
 * Supabase 環境変数の反映をターミナルから確認・修復
 * npm run fix:supabase で実行
 */
import { readFileSync, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const envPath = path.join(root, '.env.ai');

const REQUIRED = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
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

function main() {
  console.log('\n--- Supabase 環境変数 診断 ---\n');

  if (!existsSync(envPath)) {
    console.log('❌ .env.ai が存在しません。');
    console.log('\n次のコマンドを実行してください:\n');
    console.log('  npm run setup:env:interactive\n');
    process.exit(1);
  }

  const values = parseEnv(readFileSync(envPath, 'utf8'));
  const missing = REQUIRED.filter((k) => !(values[k] || '').trim());
  const ok = REQUIRED.filter((k) => (values[k] || '').trim());

  if (missing.length > 0) {
    console.log('❌ 不足している変数:\n');
    missing.forEach((k) => console.log('   ', k));
    console.log('\n次のコマンドで対話的に入力するか:\n');
    console.log('  npm run setup:env:interactive\n');
    console.log('または引数で設定:\n');
    console.log('  npm run set:env -- NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co \\');
    console.log('    NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...\n');
    process.exit(1);
  }

  console.log('✅ 必要な4変数は設定済み:\n');
  ok.forEach((k) => {
    const v = values[k];
    const preview = v.length > 30 ? v.slice(0, 30) + '...' : v;
    console.log('   ', k, '=', preview);
  });

  console.log('\n--- 反映手順 ---\n');
  console.log('1. いったん開発サーバーを停止 (Ctrl+C)');
  console.log('2. 以下で起動（.env.ai を確実に読み込む）:\n');
  console.log('   npm run dev\n');
  console.log('3. ブラウザで http://localhost:3000/signup を開き登録を試す\n');
}

main();
