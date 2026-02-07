/**
 * 共通・ローカル専用コンテンツの読み込み（サーバー専用）
 * - content/common/ … カスタム・クイック両方で参照
 * - content/local/  … クイック作成のみで参照（quick-algorithm.md は別取得）
 * 対応形式: .md / .txt / .json / .pdf（PDFはテキスト抽出）
 */

import type { Dirent } from 'fs';
import fs from 'fs/promises';
import path from 'path';
import { PDFParse } from 'pdf-parse';

const ALLOWED_EXT = ['.md', '.txt', '.json', '.pdf'];
const PROJECT_ROOT = process.cwd();

/** プロンプト用ファイル名（common 内で別読み。このファイルは getCommonContent からは除外する） */
const PROMPT_FILES = ['prompt.pdf', 'prompt.md', 'prompt.txt'];

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
 * 共通コンテンツ（カスタム・クイック両方で使用）
 * prompt.pdf / prompt.md / prompt.txt はプロンプト専用のため除外する。
 */
export async function getCommonContent(): Promise<string> {
  const dir = path.join(PROJECT_ROOT, 'content', 'common');
  let entries: Dirent[];
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return '';
  }
  const files = entries
    .filter(
      (e) =>
        e.isFile() &&
        !PROMPT_FILES.includes(e.name) &&
        ALLOWED_EXT.includes(path.extname(e.name).toLowerCase())
    )
    .map((e) => e.name)
    .sort();
  const parts: string[] = [];
  for (const name of files) {
    const fullPath = path.join(dir, name);
    const raw = await readFileAsText(fullPath, name);
    if (raw.trim()) parts.push(`--- ${name}\n${raw.trim()}`);
  }
  return parts.join('\n\n');
}

/**
 * プロンプト用コンテンツ（content/common/prompt.pdf または .md / .txt）
 * カスタム作成時にシステムプロンプトの先頭に挿入される。PDFで載せたい場合に利用。
 */
export async function getPromptContent(): Promise<string> {
  const dir = path.join(PROJECT_ROOT, 'content', 'common');
  for (const name of PROMPT_FILES) {
    const fullPath = path.join(dir, name);
    try {
      const raw = await readFileAsText(fullPath, name);
      if (raw?.trim()) return raw.trim();
    } catch {
      /* 次の候補を試す */
    }
  }
  return '';
}

const QUICK_ALGORITHM_FILES = ['quick-algorithm.md', 'quick-algorithm.pdf'];

/**
 * ローカル専用コンテンツ（ローカル生成のみで使用）
 * quick-algorithm.md / quick-algorithm.pdf はクイック専用アルゴリズム用のため除外して返す。
 */
export async function getLocalContent(): Promise<string> {
  const dir = path.join(PROJECT_ROOT, 'content', 'local');
  let entries: Dirent[];
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return '';
  }
  const files = entries
    .filter(
      (e) =>
        e.isFile() &&
        !QUICK_ALGORITHM_FILES.includes(e.name) &&
        ALLOWED_EXT.includes(path.extname(e.name).toLowerCase())
    )
    .map((e) => e.name)
    .sort();
  const parts: string[] = [];
  for (const name of files) {
    const fullPath = path.join(dir, name);
    const raw = await readFileAsText(fullPath, name);
    if (raw.trim()) parts.push(`--- ${name}\n${raw.trim()}`);
  }
  return parts.join('\n\n');
}

/**
 * クイック作成専用アルゴリズム（content/local/quick-algorithm.md または .pdf）
 * .md を優先し、なければ .pdf のテキストを抽出して返す。クイック作成時にジェネレータに渡される。
 */
export async function getQuickAlgorithmContent(): Promise<string> {
  const dir = path.join(PROJECT_ROOT, 'content', 'local');
  for (const name of QUICK_ALGORITHM_FILES) {
    const fullPath = path.join(dir, name);
    try {
      const raw = await readFileAsText(fullPath, name);
      if (raw?.trim()) return raw.trim();
    } catch {
      /* 次の候補を試す */
    }
  }
  return '';
}

/**
 * 両方取得（APIでまとめて返す用）
 * common / local / quickAlgorithm を返す。
 */
export async function getAllContent(): Promise<{
  common: string;
  local: string;
  quickAlgorithm: string;
}> {
  const [common, local, quickAlgorithm] = await Promise.all([
    getCommonContent(),
    getLocalContent(),
    getQuickAlgorithmContent(),
  ]);
  return { common, local, quickAlgorithm };
}
