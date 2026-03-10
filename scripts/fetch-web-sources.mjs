#!/usr/bin/env node
/**
 * B: 事前スクレイプ
 * content/common/web-sources.json の URL を取得し、
 * content/common/web-sourced.md に保存する。
 * カスタム生成時に getCommonContent で自動読み込みされる。
 *
 * 使い方: node scripts/fetch-web-sources.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');
const SOURCES_PATH = path.join(PROJECT_ROOT, 'content', 'common', 'web-sources.json');
const OUTPUT_PATH = path.join(PROJECT_ROOT, 'content', 'common', 'web-sourced.md');

async function fetchUrl(url) {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; RT-SwimLab/1.0)' },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return { url, ok: false, status: res.status };
    const html = await res.text();
    const text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 8000);
    return { url, ok: true, text };
  } catch (e) {
    return { url, ok: false, error: String(e) };
  }
}

async function main() {
  let config;
  try {
    const raw = fs.readFileSync(SOURCES_PATH, 'utf-8');
    config = JSON.parse(raw);
  } catch (e) {
    console.error('web-sources.json を読み込めません:', e.message);
    process.exit(1);
  }

  const urls = (config.urls || []).filter((u) => u.enabled);
  if (urls.length === 0) {
    console.log('enabled: true のURLがありません。web-sources.json を編集してください。');
    fs.writeFileSync(OUTPUT_PATH, '# Web取得コンテンツ\n\n（参照URLが未設定です。content/common/web-sources.json で enabled: true を指定してください）\n', 'utf-8');
    return;
  }

  const parts = ['# Web取得コンテンツ（演習内容の参照用）\n\n'];
  for (const { url, label } of urls) {
    const result = await fetchUrl(url);
    if (result.ok) {
      parts.push(`## ${label || url}\n\n${result.text}\n\n---\n\n`);
      console.log('OK:', url);
    } else {
      parts.push(`## ${label || url}\n\n（取得失敗: ${result.status || result.error}）\n\n---\n\n`);
      console.error('FAIL:', url, result.status || result.error);
    }
  }

  fs.writeFileSync(OUTPUT_PATH, parts.join(''), 'utf-8');
  console.log('→', OUTPUT_PATH);
}

main().catch(console.error);
