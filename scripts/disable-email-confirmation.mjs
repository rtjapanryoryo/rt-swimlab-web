#!/usr/bin/env node
/**
 * Supabase Cloud でメール確認（Confirm email）をオフにする
 * Management API を使用。Personal Access Token が必要。
 *
 * 使い方:
 *   SUPABASE_ACCESS_TOKEN=sbp_xxx npm run supabase:disable-email-confirm
 *
 * トークン取得: https://supabase.com/dashboard/account/tokens
 */
import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.resolve(__dirname, '..', '.env.ai') });

const token = process.env.SUPABASE_ACCESS_TOKEN?.trim();
const ref = process.env.PROJECT_REF?.trim() || extractRefFromUrl(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL);

function extractRefFromUrl(url) {
  if (!url) return null;
  const m = url.match(/https:\/\/([a-z0-9]+)\.supabase\.co/);
  return m ? m[1] : null;
}

async function main() {
  if (!token) {
    console.error('❌ SUPABASE_ACCESS_TOKEN が未設定です。');
    console.error('   https://supabase.com/dashboard/account/tokens でトークンを作成し、');
    console.error('   SUPABASE_ACCESS_TOKEN=sbp_xxx で実行してください。\n');
    process.exit(1);
  }
  if (!ref) {
    console.error('❌ PROJECT_REF が未設定です。');
    console.error('   SUPABASE_URL を設定するか、PROJECT_REF=jxhjxbmnzoqnoaehkbwh のように指定してください。\n');
    process.exit(1);
  }

  const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/config/auth`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ mailer_autoconfirm: true }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error('❌ API エラー:', res.status, text);
    process.exit(1);
  }

  console.log('✅ メール確認をオフにしました（mailer_autoconfirm: true）');
  console.log('   登録後すぐログインできるようになります。\n');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
