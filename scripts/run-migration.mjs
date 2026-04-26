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

/** 直接接続(db.xxx:5432)を Pooler 接続に変換。EHOSTUNREACH 対策 */
function toPoolerUrls(url) {
  const m = url.match(/postgresql:\/\/([^:]+):([^@]+)@db\.([a-z0-9]+)\.supabase\.co:5432\/(.+)/);
  if (!m) return [];
  const [, , password, projectRef, db] = m;
  const regions = ['ap-northeast-1', 'us-east-1', 'eu-west-1'];
  return regions.map(
    (r) => `postgresql://postgres.${projectRef}:${encodeURIComponent(password)}@aws-0-${r}.pooler.supabase.com:6543/${db}`
  );
}

/** Pooler URL のリージョン別バリエーション（Tenant or user not found 対策） */
function getPoolerRegionVariants(url) {
  const m = url.match(/postgresql:\/\/([^:]+):([^@]+)@(aws-0-[a-z0-9-]+\.pooler\.supabase\.com:6543\/(.+))/);
  if (!m) return [];
  const [, user, password, hostAndDb] = m;
  const regions = ['ap-northeast-1', 'us-east-1', 'eu-west-1', 'ap-southeast-1'];
  const variants = [];
  for (const r of regions) {
    const host = `aws-0-${r}.pooler.supabase.com:6543`;
    const db = hostAndDb.split('/').pop();
    variants.push(`postgresql://${user}:${password}@${host}/${db}`);
    // パスワードが [xxx] 形式（プレースホルダー）の場合、括弧なしも試す
    if (/^\[.+\]$/.test(password)) {
      const bare = password.slice(1, -1);
      variants.push(`postgresql://${user}:${encodeURIComponent(bare)}@${host}/${db}`);
    }
  }
  return variants;
}

/** パスワードの [ ] を除去したURL（プレースホルダー誤り対策） */
function getUrlWithoutBracketPlaceholder(url) {
  const m = url.match(/postgresql:\/\/([^:]+):([^@]+)@(.+)/);
  if (!m) return null;
  const [, user, password, rest] = m;
  if (password.startsWith('[') && password.endsWith(']')) {
    const clean = password.slice(1, -1);
    return `postgresql://${user}:${encodeURIComponent(clean)}@${rest}`;
  }
  return null;
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

  const poolerUrls = toPoolerUrls(DATABASE_URL);

  const poolerVariants = getPoolerRegionVariants(DATABASE_URL);

  const client = new pg.default.Client({ connectionString: DATABASE_URL });
  try {
    await client.connect();
  } catch (connectErr) {
    const isTenant = connectErr.message?.includes('Tenant or user not found');
    const isUnreachable = connectErr.message?.includes('EHOSTUNREACH') || connectErr.code === 'EHOSTUNREACH';

    if (isTenant && poolerVariants.length > 1) {
      console.log('→ リージョンが合わない可能性があるため、別リージョンを試します...');
      try {
        await client.end();
      } catch {}
      let lastErr;
      for (const url of poolerVariants) {
        if (url === DATABASE_URL) continue;
        const c = new pg.default.Client({ connectionString: url });
        try {
          await c.connect();
          await runMigrations(c, files, migrationsDir, readdirSync, readFileSync);
          return;
        } catch (e2) {
          lastErr = e2;
          try {
            await c.end();
          } catch {}
        }
      }
      console.error('❌ 別リージョンも失敗:', lastErr?.message);
    } else if (isUnreachable && poolerUrls.length > 0) {
      console.log('→ 直接接続が失敗したため、Pooler 接続に切り替えます...');
      try {
        await client.end();
      } catch {}
      let lastErr;
      for (const poolerUrl of poolerUrls) {
        const c = new pg.default.Client({ connectionString: poolerUrl });
        try {
          await c.connect();
          await runMigrations(c, files, migrationsDir, readdirSync, readFileSync);
          return;
        } catch (e2) {
          lastErr = e2;
          try {
            await c.end();
          } catch {}
        }
      }
      console.error('❌ Pooler 接続も失敗:', lastErr?.message);
    }

    if (isTenant) {
      console.error(`
💡 ヒント: パスワードを確認してください。
   - [YOUR-PASSWORD] はプレースホルダーです。実際のDBパスワードに置き換えてください。
   - Supabase Dashboard → Settings → Database → Reset database password で再設定可能
   - Connection string で「Transaction」を選択し、表示されたURIをそのままコピー
`);
    }
    console.error('❌ エラー:', connectErr.message);
    process.exit(1);
  }

  await runMigrations(client, files, migrationsDir, readdirSync, readFileSync);
}

async function runMigrations(client, files, migrationsDir, readdirSync, readFileSync) {

  try {
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
