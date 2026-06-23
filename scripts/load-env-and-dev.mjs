#!/usr/bin/env node
/**
 * ローカル開発用の起動スクリプト。
 *
 * .env.local と .env.ai を読み込んでから Next.js dev server を起動します。
 * 既存運用に合わせて、同じキーがある場合は .env.ai を優先します。
 */
import { config } from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const envLocalPath = path.join(root, '.env.local');
const envAiPath = path.join(root, '.env.ai');

if (fs.existsSync(envLocalPath)) {
  config({
    path: envLocalPath,
    override: false,
  });
}

const result = config({
  path: envAiPath,
  override: true,
});

const required = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
];
const missing = required.filter((key) => !(process.env[key] || '').trim());

if (result.error && result.error.code !== 'ENOENT') {
  console.error('[load-env] .env.ai の読み込みに失敗しました:', result.error.message);
}

if (missing.length > 0) {
  console.warn('\n[load-env] 認証ページの確認に必要な Supabase 環境変数が未設定です:');
  missing.forEach((key) => console.warn('  -', key));
  console.warn('\n  ログイン後ページを確認する前に .env.ai または .env.local へ設定してください。\n');
} else {
  console.log('[load-env] ローカル環境変数を読み込みました。Next.js dev server を起動します。');
}

const extraArgs = process.argv.slice(2);
const command = process.platform === 'win32' ? 'cmd.exe' : 'npx';
const args = process.platform === 'win32'
  ? ['/d', '/s', '/c', ['npx.cmd', 'next', 'dev', ...extraArgs].join(' ')]
  : ['next', 'dev', ...extraArgs];

const child = spawn(command, args, {
  stdio: 'inherit',
  env: { ...process.env },
  cwd: root,
});

child.on('exit', (code) => {
  process.exit(code ?? 0);
});
