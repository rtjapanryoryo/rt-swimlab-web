#!/usr/bin/env node
/**
 * supabase link を .env.ai の DATABASE_URL からパスワードを取得して実行
 * 対話入力による "failed to scan line" を回避
 */
import { config } from 'dotenv';
import { resolve } from 'path';
import { spawn } from 'child_process';

config({ path: resolve(process.cwd(), '.env.ai') });

const url = process.env.DATABASE_URL || '';
const m = url.match(/postgresql:\/\/[^:]+:([^@]+)@/);
const password = m ? decodeURIComponent(m[1]) : '';

if (!password) {
  console.error('❌ .env.ai の DATABASE_URL からパスワードを取得できませんでした。');
  process.exit(1);
}

const child = spawn('npx', ['supabase', 'link', '--project-ref', 'lpzrrblueipqhgtttzlw', '--password', password], {
  stdio: 'inherit',
  shell: false,
});

child.on('exit', (code) => process.exit(code ?? 0));
