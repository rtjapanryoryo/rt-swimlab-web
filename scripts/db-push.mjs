#!/usr/bin/env node
/**
 * supabase/migrations/*.sql を Supabase Management API 経由で実行
 *
 * 使い方:
 *   SUPABASE_ACCESS_TOKEN=... node scripts/db-push.mjs
 *
 * SUPABASE_ACCESS_TOKEN の取得:
 *   https://supabase.com/dashboard/account/tokens
 *   → 「Generate new token」でトークンを生成
 */

import { readFileSync, readdirSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

// .env.ai から環境変数を読む
const envPath = resolve(root, '.env.ai');
if (existsSync(envPath)) {
  const envRaw = readFileSync(envPath, 'utf-8');
  for (const line of envRaw.split('\n')) {
    const m = line.match(/^([A-Z_]+)\s*=\s*"?([^"\n]*)"?\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

const PROJECT_REF = 'lpzrrblueipqhgtttzlw';
const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;

if (!ACCESS_TOKEN) {
  console.error(`
❌ SUPABASE_ACCESS_TOKEN が未設定です。

取得方法:
  1. https://supabase.com/dashboard/account/tokens を開く
  2. 「Generate new token」でトークンを生成
  3. .env.ai に追加:
     SUPABASE_ACCESS_TOKEN="sbp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

または一時的に実行する場合:
  SUPABASE_ACCESS_TOKEN="sbp_xxx..." node scripts/db-push.mjs
`);
  process.exit(1);
}

async function runSQL(sql) {
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: sql }),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
  }

  return res.json();
}

async function main() {
  const migrationsDir = resolve(root, 'supabase/migrations');
  const files = readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  console.log(`📦 ${files.length}件のマイグレーションを実行します\n`);

  for (const file of files) {
    const sql = readFileSync(resolve(migrationsDir, file), 'utf-8');
    process.stdout.write(`→ ${file} ... `);
    try {
      await runSQL(sql);
      console.log('✅');
    } catch (err) {
      // 既に存在するテーブル等のエラーは無視
      if (
        err.message.includes('already exists') ||
        err.message.includes('duplicate') ||
        err.message.includes('DuplicateTable')
      ) {
        console.log('⏭ スキップ（既に存在）');
      } else {
        console.log('❌');
        console.error('   エラー:', err.message.slice(0, 200));
      }
    }
  }

  console.log('\n✅ マイグレーション完了');
}

main().catch(err => {
  console.error('❌ 予期しないエラー:', err.message);
  process.exit(1);
});
