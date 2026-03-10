/**
 * コンテンツ読み込み（サーバー専用）
 * - content/common/ … カスタム・クイック両方で参照
 * - content/quick/  … クイック作成のみで参照（PDF・JSON・md等）
 * 対応形式: .md / .txt / .json / .pdf（PDFはテキスト抽出）
 */

import type { Dirent } from 'fs';
import fs from 'fs/promises';
import path from 'path';

const ALLOWED_EXT = ['.md', '.txt', '.json', '.pdf'];
const PROJECT_ROOT = process.cwd();

/** プロンプト用ファイル名（common 内で別読み。このファイルは getCommonContent からは除外する） */
const PROMPT_FILES = ['prompt.pdf', 'prompt.md', 'prompt.txt'];
/** 設定ファイル（getCommonContent から除外） */
const CONFIG_FILES = ['web-sources.json'];

async function extractPdfText(fullPath: string): Promise<string> {
  try {
    const buf = await fs.readFile(fullPath);
    if (!buf || !Buffer.isBuffer(buf) || buf.length === 0) return '';
    const { PDFParse } = await import('pdf-parse');
    const parser = new PDFParse({ data: buf });
    try {
      const result = await parser.getText();
      const text = result?.text?.trim() ?? '';
      return typeof text === 'string' ? text : '';
    } finally {
      await parser.destroy();
    }
  } catch {
    return '';
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
        !CONFIG_FILES.includes(e.name) &&
        ALLOWED_EXT.includes(path.extname(e.name).toLowerCase())
    )
    .map((e) => e.name)
    .sort();
  const parts: string[] = [];
  for (const name of files) {
    try {
      const fullPath = path.join(dir, name);
      const raw = await readFileAsText(fullPath, name);
      if (raw.trim()) parts.push(`--- ${name}\n${raw.trim()}`);
    } catch {
      /* 1ファイル失敗しても他を続ける */
    }
  }
  return parts.join('\n\n');
}

/**
 * コーチ思想（高代コーチ50問インタビュー）
 * カスタム作成時に思想の土台として注入。
 */
export async function getProtocolContent(): Promise<string> {
  const fullPath = path.join(PROJECT_ROOT, 'docs', 'COACH_INTERVIEW_50_QA.md');
  return fs.readFile(fullPath, 'utf-8').catch(() => '');
}

/**
 * プロトコル＝ジェネレート（RT_MENU_GENERATION_RULES_JA.md）
 * 期別ルール・強度・構造・出力形式の正式定義。演習内容の質を担保する正本。
 */
export async function getRTMenuProtocolContent(): Promise<string> {
  const fullPath = path.join(PROJECT_ROOT, 'docs', 'RT_MENU_GENERATION_RULES_JA.md');
  return fs.readFile(fullPath, 'utf-8').catch(() => '');
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

const QUICK_DIR = path.join(PROJECT_ROOT, 'content', 'quick');
const QUICK_ALGORITHM_FILES = ['quick-algorithm.md', 'quick-algorithm.pdf'];
const QUICK_EXCLUDE_FILES = ['menu-templates-9.json', 'menu-template-1sample.json', 'quick-settings.json', ...QUICK_ALGORITHM_FILES];

/**
 * クイック用その他コンテンツ（content/quick 内のアルゴリズム・テンプレJSON以外）
 */
export async function getLocalContent(): Promise<string> {
  let entries: Dirent[];
  try {
    entries = await fs.readdir(QUICK_DIR, { withFileTypes: true });
  } catch {
    return '';
  }
  const files = entries
    .filter(
      (e) =>
        e.isFile() &&
        !QUICK_EXCLUDE_FILES.includes(e.name) &&
        ALLOWED_EXT.includes(path.extname(e.name).toLowerCase())
    )
    .map((e) => e.name)
    .sort();
  const parts: string[] = [];
  for (const name of files) {
    const fullPath = path.join(QUICK_DIR, name);
    const raw = await readFileAsText(fullPath, name);
    if (raw.trim()) parts.push(`--- ${name}\n${raw.trim()}`);
  }
  return parts.join('\n\n');
}

/**
 * クイック作成専用コンテンツ（content/quick 内のPDF等）
 * quick-algorithm.pdf / .md を優先。なければフォルダ内の最初の .pdf（例: 9通り.pdf）を使用。
 */
export async function getQuickAlgorithmContent(): Promise<string> {
  for (const name of QUICK_ALGORITHM_FILES) {
    const fullPath = path.join(QUICK_DIR, name);
    try {
      const raw = await readFileAsText(fullPath, name);
      if (raw?.trim()) return raw.trim();
    } catch {
      /* 次の候補を試す */
    }
  }
  let entries: Dirent[];
  try {
    entries = await fs.readdir(QUICK_DIR, { withFileTypes: true });
  } catch {
    return '';
  }
  const pdfs = entries
    .filter((e) => e.isFile() && path.extname(e.name).toLowerCase() === '.pdf')
    .map((e) => e.name)
    .sort();
  for (const name of pdfs) {
    const fullPath = path.join(QUICK_DIR, name);
    try {
      const raw = await readFileAsText(fullPath, name);
      if (raw?.trim()) return raw.trim();
    } catch {
      /* 次 */
    }
  }
  return '';
}

/** クイックメニュー用設定（content/quick/quick-settings.json）。セクション順など。 */
const DEFAULT_SECTION_ORDER = [
  'warmUp', 'drill', 'kick', 'pull', 'rest', 'preMain', 'dive', 'main', 'down',
];

export async function getQuickSettings(): Promise<{
  sectionOrder: string[];
  sectionLabels?: Record<string, string>;
}> {
  const fullPath = path.join(QUICK_DIR, 'quick-settings.json');
  try {
    const raw = await fs.readFile(fullPath, 'utf-8');
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return { sectionOrder: [...DEFAULT_SECTION_ORDER] };
    const obj = parsed as Record<string, unknown>;
    const order = Array.isArray(obj.sectionOrder) && obj.sectionOrder.length > 0
      ? (obj.sectionOrder as string[])
      : [...DEFAULT_SECTION_ORDER];
    const sectionLabels =
      obj.sectionLabels && typeof obj.sectionLabels === 'object' && !Array.isArray(obj.sectionLabels)
        ? (obj.sectionLabels as Record<string, string>)
        : undefined;
    return { sectionOrder: order, sectionLabels };
  } catch {
    /* ignore */
  }
  return { sectionOrder: [...DEFAULT_SECTION_ORDER] };
}

/** 9通りメニューテンプレ（content/quick/menu-templates-9.json）。PDFをJSON化したもの。 */
export async function getMenuTemplates9(): Promise<{
  S: unknown[];
  M: unknown[];
  D: unknown[];
} | null> {
  const fullPath = path.join(QUICK_DIR, 'menu-templates-9.json');
  try {
    const raw = await fs.readFile(fullPath, 'utf-8');
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return null;
    const o = parsed as Record<string, unknown>;
    const S = Array.isArray(o.S) ? o.S : [];
    const M = Array.isArray(o.M) ? o.M : [];
    const D = Array.isArray(o.D) ? o.D : [];
    if (S.length === 0 && M.length === 0 && D.length === 0) return null;
    return { S, M, D };
  } catch {
    return null;
  }
}

/**
 * 両方取得（APIでまとめて返す用）
 * common / local / quickAlgorithm / menuTemplates9 を返す。
 */
export async function getAllContent(): Promise<{
  common: string;
  local: string;
  quickAlgorithm: string;
  menuTemplates9: { S: unknown[]; M: unknown[]; D: unknown[] } | null;
}> {
  const [common, local, quickAlgorithm, menuTemplates9] = await Promise.all([
    getCommonContent(),
    getLocalContent(),
    getQuickAlgorithmContent(),
    getMenuTemplates9(),
  ]);
  return { common, local, quickAlgorithm, menuTemplates9: menuTemplates9 ?? null };
}
