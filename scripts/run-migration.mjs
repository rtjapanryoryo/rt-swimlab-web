#!/usr/bin/env node
/**
 * profiles / generation_logs マイグレーションを実行
 * 使い方: DATABASE_URL を設定して npm run db:migrate
 *
 * DATABASE_URL の取得:
 * Supabase Dashboard → Settings → Database → Connection string → URI
 * 例: postgresql://postgres.[project-ref]:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres
 */
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { config } from 'dotenv';

const root = process.cwd();
const r1 = config({ path: resolve(root, '.env.ai') });
const r2 = config({ path: resolve(root, '.env.local') });
const parsed = { ...r1?.parsed, ...r2?.parsed };

let DATABASE_URL =
  process.env.DATABASE_URL ||
  process.env.SUPABASE_DB_URL ||
  parsed?.DATABASE_URL ||
  parsed?.SUPABASE_DB_URL;
if (!DATABASE_URL && existsSync(resolve(root, '.env.ai'))) {
  const raw = readFileSync(resolve(root, '.env.ai'), 'utf-8');
  const m = raw.match(/DATABASE_URL\s*=\s*(?:"([^"]*)"|'([^']*)'|(\S+))/);
  if (m) DATABASE_URL = (m[1] ?? m[2] ?? m[3] ?? '').trim();
}
if (!DATABASE_URL) {
  console.error(`
❌ DATABASE_URL が未設定です。

Supabase Dashboard で取得:
  1. https://supabase.com/dashboard を開く
  2. プロジェクト選択 → Settings → Database
  3. Connection string の「URI」をコピー
  4. .env.ai に追加: DATABASE_URL="postgresql://..."

例:
  DATABASE_URL="postgresql://postgres.xxxxx:YOUR_PASSWORD@aws-0-us-east-1.pooler.supabase.com:6543/postgres"
`);
  process.exit(1);
}

async function run() {
  let pg;
  try {
    pg = await import('pg');
  } catch {
    console.error('❌ pg パッケージが必要です。実行: npm install pg');
    process.exit(1);
  }

  const migrationsDir = resolve(process.cwd(), 'supabase/migrations');
  const { readdirSync } = await import('fs');
  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  const client = new pg.default.Client({ connectionString: DATABASE_URL });
  try {
    await client.connect();

    for (const f of files) {
      const sqlPath = resolve(migrationsDir, f);
      const sql = readFileSync(sqlPath, 'utf-8');
      console.log(`→ ${f} 実行中...`);
      await client.query(sql);
      console.log(`   ✅ 完了`);
    }

    console.log('→ 既存ユーザーを profiles に登録...');
    await client.query(`
      INSERT INTO public.profiles (id, role, display_name)
      SELECT id, 'user', COALESCE(raw_user_meta_data->>'full_name', email)
      FROM auth.users
      ON CONFLICT (id) DO NOTHING;
    `);
    console.log('✅ 既存ユーザー登録完了');

    const { rows } = await client.query('SELECT id, email FROM auth.users LIMIT 5');
    if (rows.length > 0) {
      console.log('\n📋 登録ユーザー (admin にしたい UUID をコピー):');
      rows.forEach((r) => console.log(`   ${r.id}  ${r.email || ''}`));
      console.log('\n管理者にする SQL:');
      console.log(`   UPDATE public.profiles SET role = 'admin' WHERE id = 'ここにUUID';`);
    }
  } catch (err) {
    console.error('❌ エラー:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
