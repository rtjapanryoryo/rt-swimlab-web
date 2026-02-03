/**
 * 共通・ローカル専用コンテンツの読み込み（サーバー専用）
 * - content/common/ … AI・ローカル両方で参照
 * - content/local/  … ローカル生成のみで参照
 * 対応形式: .md / .txt / .json / .pdf（PDFはテキスト抽出）
 */

import type { Dirent } from 'fs';
import fs from 'fs/promises';
import path from 'path';
import { PDFParse } from 'pdf-parse';

const ALLOWED_EXT = ['.md', '.txt', '.json', '.pdf'];
const PROJECT_ROOT = process.cwd();

async function extractPdfText(fullPath: string): Promise<string> {
  const buf = await fs.readFile(fullPath);
  const parser = new PDFParse({ data: buf });
  try {
    const result = await parser.getText();
    return result?.text?.trim() ?? '';
  } finally {
    await parser.destroy();
  }
}

async function readFileAsText(fullPath: string, name: string): Promise<string> {
  const ext = path.extname(name).toLowerCase();
  if (ext === '.pdf') {
    return extractPdfText(fullPath);
  }
  return fs.readFile(fullPath, 'utf-8').catch(() => '');
}

async function readDirAsText(dirPath: string): Promise<string> {
  let entries: Dirent[];
  try {
    entries = await fs.readdir(dirPath, { withFileTypes: true });
  } catch {
    return '';
  }
  const files = entries
    .filter((e) => e.isFile() && ALLOWED_EXT.includes(path.extname(e.name).toLowerCase()))
    .map((e) => e.name)
    .sort();
  const parts: string[] = [];
  for (const name of files) {
    const fullPath = path.join(dirPath, name);
    const raw = await readFileAsText(fullPath, name);
    if (raw.trim()) parts.push(`--- ${name}\n${raw.trim()}`);
  }
  return parts.join('\n\n');
}

/**
 * 共通コンテンツ（AI・ローカル両方で使用）
 */
export async function getCommonContent(): Promise<string> {
  const dir = path.join(PROJECT_ROOT, 'content', 'common');
  return readDirAsText(dir);
}

/**
 * ローカル専用コンテンツ（ローカル生成のみで使用）
 */
export async function getLocalContent(): Promise<string> {
  const dir = path.join(PROJECT_ROOT, 'content', 'local');
  return readDirAsText(dir);
}

/**
 * 両方取得（APIでまとめて返す用）
 */
export async function getAllContent(): Promise<{ common: string; local: string }> {
  const [common, local] = await Promise.all([getCommonContent(), getLocalContent()]);
  return { common, local };
}
