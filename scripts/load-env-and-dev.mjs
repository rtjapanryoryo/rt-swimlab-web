#!/usr/bin/env node
/**
 * ローカル開発用: .env.ai を読み込んでから next dev を起動
 * process.env に確実に反映させ、子プロセス（next dev）に継承する
 */
import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const envPath = path.join(root, '.env.ai');

// 1. .env.ai を読み込み（override: true で既存を上書き）
const result = config({
  path: envPath,
  override: true,
});

const required = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
];
const missing = required.filter((k) => !(process.env[k] || '').trim());

if (result.error && result.error.code !== 'ENOENT') {
  console.error('[load-env] .env.ai の読み込みエラー:', result.error.message);
}

if (missing.length > 0) {
  console.warn('\n⚠️  認証に必要な環境変数が未設定です:');
  missing.forEach((k) => console.warn('   -', k));
  console.warn('\n  .env.ai に追記し、Supabase の値を入れてください。');
  console.warn('  テンプレート: cp .env.ai.example .env.ai\n');
} else {
  console.log('[load-env] .env.ai を読み込みました（認証設定OK）');
}

// 2. next dev を起動（現在の process.env を継承）
const child = spawn('npx', ['next', 'dev', ...process.argv.slice(2)], {
  stdio: 'inherit',
  env: { ...process.env },
  cwd: root,
});

child.on('exit', (code) => {
  process.exit(code ?? 0);
});
