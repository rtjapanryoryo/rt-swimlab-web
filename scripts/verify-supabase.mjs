#!/usr/bin/env node
/**
 * Supabase 接続確認スクリプト
 * .env.ai のキーが正しく設定されているか検証
 */
import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';

config({ path: resolve(process.cwd(), '.env.ai') });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('\n=== Supabase 接続確認 ===\n');

const checks = [
  { name: 'NEXT_PUBLIC_SUPABASE_URL', ok: !!url?.trim(), value: url ? `${url.slice(0, 40)}...` : '(未設定)' },
  { name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', ok: !!anonKey?.trim(), value: anonKey ? `***${anonKey.slice(-8)}` : '(未設定)' },
];

let allOk = true;
for (const c of checks) {
  const status = c.ok ? '✓' : '✗';
  console.log(`${status} ${c.name}: ${c.value}`);
  if (!c.ok) allOk = false;
}

if (!allOk) {
  console.log('\n→ 不足している変数があります。.env.ai を確認してください。\n');
  process.exit(1);
}

console.log('\n接続テスト中...');

try {
  const supabase = createClient(url, anonKey);
  const { data, error } = await supabase.from('menus').select('id').limit(1);
  if (error) {
    console.log('✗ 接続エラー:', error.message);
    if (error.code === '42P01') {
      console.log('  → menus テーブルが存在しません。supabase-setup.sql を実行してください。');
    }
    process.exit(1);
  }
  console.log('✓ 接続成功（menus テーブルにアクセスできました）');
} catch (e) {
  console.log('✗ エラー:', e.message);
  process.exit(1);
}

console.log('\n=== 確認完了 ===\n');
