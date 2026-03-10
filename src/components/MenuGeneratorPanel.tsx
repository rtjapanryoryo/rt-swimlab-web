'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/components/AuthProvider';
import {
  generateTrainingMenu,
  type TrainingInput,
  type TrainingResult,
} from '@/lib/rt/generator';
import { menuTemplates9Fallback } from '@/lib/rt/menu-templates-9-fallback';
import { useViewMode } from '@/app/viewMode';
import { MenuSheet } from '@/components/MenuSheet';
import { DistanceTimeField } from '@/components/DistanceTimeField';
import Link from 'next/link';

/** クイック用テンプレ（API不要・常にメニュー生成可能） */
const QUICK_TEMPLATES = {
  S: [...menuTemplates9Fallback.S],
  M: [...menuTemplates9Fallback.M],
  D: [...menuTemplates9Fallback.D],
};

const SAVED_INPUT_KEY_PREFIX = 'rt-swimlab-saved-input';

/** LINEで共有する際の本番URL（openExternalBrowser=1 で外部ブラウザ起動） */
const LINE_SHARE_BASE_URL = 'https://rt-swimlab-web-tl3a.vercel.app';

/** LINE内ブラウザ（WebView）かどうか。PDF保存・印刷が制限される */
function isLineInAppBrowser(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  return /Line\//i.test(ua) || /\/IAB\b/i.test(ua);
}

function savedInputKey(userId: string): string {
  return `${SAVED_INPUT_KEY_PREFIX}-${userId}`;
}

const EMPTY_INPUT: TrainingInput = {
  period: '',
  stroke: 'Fr',
  distance: '',
  age: '',
  distanceType: '',
  level: '',
  condition: '',
  practiceTime: '',
};

function isTrainingInput(obj: unknown): obj is TrainingInput {
  if (!obj || typeof obj !== 'object') return false;
  const keys: (keyof TrainingInput)[] = [
    'period', 'stroke', 'distance', 'age', 'distanceType',
    'level', 'condition', 'practiceTime',
  ];
  return keys.every((k) => typeof (obj as Record<string, unknown>)[k] === 'string');
}

function loadSavedInput(key: string): TrainingInput {
  if (typeof window === 'undefined' || !key) return EMPTY_INPUT;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return EMPTY_INPUT;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    // 旧データ（gender）→ 新形式（distance）のマイグレーション
    if (parsed && typeof parsed === 'object' && 'gender' in parsed && !('distance' in parsed)) {
      const { gender: _g, ...rest } = parsed;
      parsed.distance = '4000';
      delete parsed.gender;
    }
    if (isTrainingInput(parsed)) return parsed as TrainingInput;
  } catch {
    /* ignore */
  }
  return EMPTY_INPUT;
}

export type MenuGeneratorPanelProps = { embedded?: boolean; onSaved?: () => void };

export default function MenuGeneratorPanel(props?: MenuGeneratorPanelProps) {
  const { embedded, onSaved } = props ?? {};
  const { user, loading: sessionStatus } = useAuth();
  const { viewMode, setViewMode } = useViewMode();

  const [mode, setMode] = useState<'quick' | 'custom'>('quick');
  const [customStep, setCustomStep] = useState<1 | 2>(1);
  const [input, setInput] = useState<TrainingInput>(EMPTY_INPUT);
  const [hydrated, setHydrated] = useState(false);

  // 共通表示（最後に押した方で上書き）
  const [result, setResult] = useState<TrainingResult | null>(null);
  const [apiMenuText, setApiMenuText] = useState<string | null>(null);
  const [resultSource, setResultSource] = useState<'quick' | 'custom' | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [apiErrorKind, setApiErrorKind] = useState<'login_required' | 'retry' | 'unexpected' | null>(null);
  const [customIsGenerating, setCustomIsGenerating] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [openaiConfigured, setOpenaiConfigured] = useState<boolean | null>(null);
  const [openaiReason, setOpenaiReason] = useState<string | undefined>(undefined);
  const [sectionOrder, setSectionOrder] = useState<string[] | null>(null);
  const [sectionLabels, setSectionLabels] = useState<Record<string, string> | null>(null);
  const [showForm, setShowForm] = useState(true);
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);
  const [isInLineBrowser, setIsInLineBrowser] = useState(false);
  const [lineUrlCopied, setLineUrlCopied] = useState(false);
  const [isSavingMenu, setIsSavingMenu] = useState(false);
  const [menuSavedAt, setMenuSavedAt] = useState<Date | null>(null);

  const LOADING_MESSAGES = [
    '条件を分析しています...',
    'メニューを組み立てています...',
    '強度と距離を調整しています...',
    '仕上げています...',
  ];

  useEffect(() => {
    if (!customIsGenerating) return;
    const id = setInterval(() => {
      setLoadingMessageIndex((i) => (i + 1) % LOADING_MESSAGES.length);
    }, 2500);
    return () => clearInterval(id);
  }, [customIsGenerating]);

  useEffect(() => {
    if (customIsGenerating) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [customIsGenerating]);

  useEffect(() => {
    setIsInLineBrowser(isLineInAppBrowser());
  }, []);

  useEffect(() => {
    setMenuSavedAt(null);
  }, [result, apiMenuText]);

  // ログイン時はメニュー生成後に自動で生成ログに保存
  const lastSavedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!user || (!result && !apiMenuText)) return;
    const key = JSON.stringify({ r: result ? 'r' : '', a: apiMenuText ? 'a' : '' });
    if (lastSavedRef.current === key) return;
    lastSavedRef.current = key;
    (async () => {
      try {
        const res = await fetch('/api/menus', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            input: { ...input },
            result: result ? { ...result } : { rawText: apiMenuText },
            source: resultSource ?? (apiMenuText ? 'custom' : 'quick'),
          }),
          credentials: 'include',
        });
        const data = (await res.json()) as {
          created_at?: string;
          total_usage_count?: number;
          quick_count?: number;
          custom_count?: number;
        };
        if (res.ok && data.created_at) {
          setMenuSavedAt(new Date(data.created_at));
          onSaved?.();
          window.dispatchEvent(
            new CustomEvent('menu-saved', {
              detail: {
                total_usage_count: data.total_usage_count,
                quick_count: data.quick_count,
                custom_count: data.custom_count,
              },
            })
          );
        }
      } catch {
        lastSavedRef.current = null;
      }
    })();
  }, [user, result, apiMenuText, input, resultSource, onSaved]);

  // クイックメニュー用セクション順・ラベル（quick-settings.json）
  useEffect(() => {
    fetch('/api/quick-settings', { credentials: 'include' })
      .then(async (r) => {
        if (!r.ok) return null;
        const ct = r.headers.get('content-type') ?? '';
        if (!ct.includes('application/json')) return null;
        try {
          return (await r.json()) as { sectionOrder?: string[]; sectionLabels?: Record<string, string> };
        } catch {
          return null;
        }
      })
      .then((data) => {
        if (data) {
          if (Array.isArray(data.sectionOrder) && data.sectionOrder.length > 0) {
            setSectionOrder(data.sectionOrder);
          }
          if (data.sectionLabels && typeof data.sectionLabels === 'object') {
            setSectionLabels(data.sectionLabels);
          }
        }
      })
      .catch(() => {});
  }, []);

  // ログインユーザーごとに前回入力を復元（個々の形・2回目以降）
  const userKey = user?.email ?? user?.id ?? '';
  useEffect(() => {
    if (sessionStatus || !userKey) return;
    const key = savedInputKey(userKey);
    const saved = loadSavedInput(key);
    setInput(saved);
    setHydrated(true);
  }, [sessionStatus, userKey]);

  // 入力変更を debounce して、そのユーザー用キーで localStorage に保存
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!hydrated || !userKey) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      try {
        localStorage.setItem(savedInputKey(userKey), JSON.stringify(input));
      } catch {
        /* quota / private mode */
      }
      saveTimeoutRef.current = null;
    }, 400);
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [input, hydrated, userKey]);

  // 未設定判定はサーバー側の env のみで行う（/api/health）。フロントで process.env は参照しない。
  useEffect(() => {
    fetch('/api/health')
      .then(async (r) => {
        const text = await r.text();
        try {
          return JSON.parse(text) as { openaiConfigured?: boolean; openaiReason?: string };
        } catch {
          return { openaiConfigured: false };
        }
      })
      .then((data) => {
        setOpenaiConfigured(data.openaiConfigured === true);
        setOpenaiReason(data.openaiReason);
      })
      .catch(() => setOpenaiConfigured(false));
  }, []);

  const handleInputChange = (field: keyof TrainingInput, value: string) => {
    setInput((prev) => ({ ...prev, [field]: value }));
    setApiError(null);
    setApiErrorKind(null);
  };

  /** クイック用：4項目の必須チェック */
  const isQuickFormValid = () =>
    !!(
      input.period &&
      input.distance &&
      (input.distanceType === 'S' || input.distanceType === 'M' || input.distanceType === 'D') &&
      input.practiceTime
    );

  /** カスタム用：ステップ1（種目・年齢・レベル・状況）の必須チェック */
  const isCustomStep1Valid = () =>
    !!(input.stroke || 'Fr') &&
    !!input.age &&
    !!input.level &&
    !!input.condition;

  /** カスタム用：8項目すべての必須チェック */
  const isCustomFormValid = () =>
    isCustomStep1Valid() &&
    isQuickFormValid();

  /** クイック用：4項目＋デフォルトでテンプレートから1件抽出 */
  const buildQuickInput = (): TrainingInput => ({
    period: input.period,
    stroke: 'Fr',
    distance: input.distance,
    age: '18',
    distanceType: input.distanceType === 'S' || input.distanceType === 'M' || input.distanceType === 'D' ? input.distanceType : 'M',
    level: '中級（育成クラス〜県大会）',
    condition: '良好',
    practiceTime: input.practiceTime,
  });

  const fallbackToQuickMenu = () => {
    const effectiveInput = buildQuickInput();
    const r = generateTrainingMenu(effectiveInput, { menuTemplates9: QUICK_TEMPLATES });
    setResult(r ?? null);
    setApiMenuText(null);
    setResultSource('quick');
    setApiError(null);
    setApiErrorKind(null);
  };

  const generateMenuWithAI = async () => {
    setCustomIsGenerating(true);
    setLoadingMessageIndex(0);
    setApiError(null);
    setApiErrorKind(null);
    try {
      const payload = {
        ...input,
        stroke: input.stroke || 'Fr',
      };
      const res = await fetch('/api/custom-menu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        redirect: 'manual',
        credentials: 'include',
      });
      if (res.status === 401) {
        setApiError('ログインが必要です');
        setApiErrorKind('login_required');
        return;
      }
      const contentType = res.headers.get('content-type') ?? '';
      if (!contentType.includes('application/json')) {
        await res.text();
        setApiError('想定外の応答。再読み込みしてください');
        setApiErrorKind('unexpected');
        return;
      }
      const text = await res.text();
      let data: { error?: string; missingItems?: string[]; result?: unknown; menu?: string };
      try {
        data = JSON.parse(text) as { error?: string; missingItems?: string[]; result?: unknown; menu?: string };
      } catch {
        setApiError('想定外の応答。再読み込みしてください');
        setApiErrorKind('unexpected');
        return;
      }
      if (!res.ok) {
        if (res.status >= 500) {
          setApiError('現在生成できません。再試行してください');
          setApiErrorKind('retry');
        } else {
          const msg = data.error ?? `エラー（${res.status}）`;
          const missing = data.missingItems?.length
            ? `${msg} 不足: ${data.missingItems.join('・')}`
            : msg;
          setApiError(missing);
          setApiErrorKind(null);
        }
        return;
      }
      if (data.error && !data.result && !data.menu) {
        setApiError(data.error);
        setApiErrorKind(null);
        return;
      }
      setApiError(null);
      setApiErrorKind(null);
      setResultSource('custom');
      if (data.result && typeof data.result === 'object') {
        setResult(data.result as TrainingResult);
        setApiMenuText(null);
        setShowForm(false);
      } else if (data.menu) {
        setResult(null);
        setApiMenuText(data.menu);
        setShowForm(false);
      } else {
        setApiError('メニューを取得できませんでした。APIの応答形式を確認してください。');
        setApiErrorKind(null);
      }
    } catch (e) {
      console.error('[generateMenuWithAI]', e);
      setApiError('現在生成できません。再試行してください');
      setApiErrorKind('retry');
      return;
    } finally {
      setCustomIsGenerating(false);
    }
  };

  const generateMenuLocal = async () => {
    setApiError(null);
    setApiErrorKind(null);
    const effectiveInput = buildQuickInput();
    let templates: { S: unknown[]; M: unknown[]; D: unknown[] } = QUICK_TEMPLATES;
    try {
      const res = await fetch('/api/quick-templates');
      if (res.ok) {
        const ct = res.headers.get('content-type') ?? '';
        if (ct.includes('application/json')) {
          const data = (await res.json()) as {
            S?: unknown[];
            M?: unknown[];
            D?: unknown[];
            settings?: { sectionOrder?: string[]; sectionLabels?: Record<string, string> };
          };
          if (Array.isArray(data.S) && Array.isArray(data.M) && Array.isArray(data.D) && (data.S.length > 0 || data.M.length > 0 || data.D.length > 0)) {
            templates = { S: data.S, M: data.M, D: data.D };
          }
          if (Array.isArray(data.settings?.sectionOrder) && data.settings.sectionOrder.length > 0) {
            setSectionOrder(data.settings.sectionOrder);
          }
          if (data.settings?.sectionLabels && typeof data.settings.sectionLabels === 'object') {
            setSectionLabels(data.settings.sectionLabels);
          }
        }
      }
    } catch {
      /* 取得できなければ埋め込みテンプレのまま */
    }
    const r = generateTrainingMenu(effectiveInput, { menuTemplates9: templates });
    setResult(r ?? null);
    setApiMenuText(null);
    setResultSource('quick');
    setShowForm(false);
  };

  /** PDF用：指定文字の前後に半角スペースを追加（視認性向上） */
  const addSpacesForPdf = (element: HTMLElement): (() => void) => {
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    const nodes: Text[] = [];
    let node: Text | null;
    while ((node = walker.nextNode() as Text | null)) {
      if (node?.textContent) nodes.push(node);
    }
    const originals = new Map<Text, string>();
    for (const n of nodes) {
      let t = n.textContent ?? '';
      originals.set(n, t);
      t = t
        .replace(/（/g, ' （ ')
        .replace(/）/g, ' ） ')
        .replace(/、/g, ' 、 ')
        .replace(/～/g, ' ～ ')
        .replace(/~/g, ' ~ ')
        .replace(/×/g, ' × ')
        .replace(/(\d)[-\−](\d)/g, '$1 - $2')
        .replace(/(\d)～(\d)/g, '$1 ～ $2')
        .replace(/(\d)~(\d)/g, '$1 ~ $2');
      n.textContent = t;
    }
    return () => {
      for (const n of nodes) {
        n.textContent = originals.get(n) ?? n.textContent;
      }
    };
  };

  const exportPDFBlob = async (captureId: string): Promise<Blob> => {
    const el = document.getElementById(captureId);
    if (!el) throw new Error('PDF化する要素が見つかりません');

    setIsExporting(true);
    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
      ]);

      el.scrollIntoView({ behavior: 'auto', block: 'start' });
      await new Promise((r) => setTimeout(r, 200));

      const restore = addSpacesForPdf(el as HTMLElement);
      await new Promise((r) => setTimeout(r, 50));

      const opts = {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        imageTimeout: 0,
      };
      let canvas: HTMLCanvasElement;
      try {
        canvas = await html2canvas(el, opts);
      } catch (h2cErr) {
        console.warn('html2canvas failed, retry without images', h2cErr);
        canvas = await html2canvas(el, {
          ...opts,
          scale: 1,
          ignoreElements: (node) => node.tagName === 'IMG',
        });
      } finally {
        restore();
      }

      if (canvas.width === 0 || canvas.height === 0) {
        throw new Error('キャプチャ範囲が空です。画面をスクロールしてメニューを表示してから再度お試しください。');
      }
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      let imgWidth = pageWidth;
      let imgHeight = (canvas.height * imgWidth) / canvas.width;

      if (imgHeight > pageHeight) {
        const scale = pageHeight / imgHeight;
        imgWidth *= scale;
        imgHeight *= scale;
      }
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);

      return pdf.output('blob') as Blob;
    } finally {
      setIsExporting(false);
    }
  };

  /** メニューをDBに保存（ログイン時のみ） */
  const handleSaveMenu = async () => {
    if (!result && !apiMenuText) return;
    setIsSavingMenu(true);
    setMenuSavedAt(null);
    try {
      const res = await fetch('/api/menus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: { ...input },
          result: result ? { ...result } : { rawText: apiMenuText },
          source: resultSource ?? (apiMenuText ? 'custom' : 'quick'),
        }),
        credentials: 'include',
      });
      const data = (await res.json()) as {
        id?: string;
        created_at?: string;
        error?: string;
        message?: string;
        total_usage_count?: number;
        quick_count?: number;
        custom_count?: number;
      };
      if (!res.ok) {
        if (res.status === 401) alert('ログインが必要です。');
        else alert(data.message ?? '保存に失敗しました。');
        return;
      }
      setMenuSavedAt(data.created_at ? new Date(data.created_at) : new Date());
      window.dispatchEvent(
        new CustomEvent('menu-saved', {
          detail: {
            total_usage_count: data.total_usage_count,
            quick_count: data.quick_count,
            custom_count: data.custom_count,
          },
        })
      );
    } catch (e) {
      console.error('[handleSaveMenu]', e);
      alert('保存に失敗しました。');
    } finally {
      setIsSavingMenu(false);
    }
  };

  /** PDFを別タブで開く（開いた画面から保存可能） */
  const handleOpenPDFInNewTab = async (captureId: string) => {
    try {
      const blob = await exportPDFBlob(captureId);
      const url = URL.createObjectURL(blob);
      const w = window.open(url, '_blank', 'noopener');
      if (!w) {
        alert('ポップアップがブロックされました。ブラウザの設定で許可するか、URLをコピーしてブラウザで開いてください。');
        window.prompt('以下のURLをコピーしてブラウザで開いてください:', url);
      }
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (e) {
      console.error('PDF export error:', e);
      alert('PDFの生成に失敗しました。もう一度お試しください。');
    }
  };

  const handleSharePDF = async (captureId: string) => {
    try {
      const blob = await exportPDFBlob(captureId);
      const file = new File([blob], `RT-menu_${new Date().toISOString().slice(0, 10)}.pdf`, {
        type: 'application/pdf',
      });

      type NavWithShare = {
        share?: (data: ShareData) => Promise<void>;
        canShare?: (data?: ShareData) => boolean;
      };
      const nav = navigator as unknown as NavWithShare;
      if (nav.share && nav.canShare?.({ files: [file] })) {
        await nav.share({
          title: 'RT swim lab 練習メニュー',
          text: '今日の練習メニューPDFです',
          files: [file],
        });
      } else {
        await handleOpenPDFInNewTab(captureId);
      }
    } catch (e) {
      if ((e as Error)?.name === 'AbortError') return; // ユーザーが共有をキャンセル
      console.error(e);
      try {
        await handleOpenPDFInNewTab(captureId);
      } catch {
        alert('共有・PDF出力に失敗しました。もう一度お試しください。');
      }
    }
  };

  return (
    <div className={embedded ? 'py-4' : 'min-h-screen bg-gradient-to-b from-cyan-50 via-teal-50 to-sky-100 py-8 px-4'}>
      <div className="max-w-5xl mx-auto">
        {!embedded && (
        <header className="mb-10 text-center no-print relative">
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2 tracking-tight">
            RT swim lab
          </h1>
          <p className="text-slate-600 text-base md:text-lg">立石諒と高城直基が監修の指導哲学に基づく練習メニュー</p>
          <button
            type="button"
            onClick={async () => {
              const base = typeof window !== 'undefined' && !window.location.origin.includes('localhost')
                ? window.location.origin
                : LINE_SHARE_BASE_URL;
              const url = `${base}/?openExternalBrowser=1`;
              try {
                await navigator.clipboard.writeText(url);
                setLineUrlCopied(true);
                setTimeout(() => setLineUrlCopied(false), 3000);
              } catch {
                window.prompt('以下のURLをコピーしてLINEで送ってください:', url);
              }
            }}
            className="mt-3 text-sm text-slate-500 hover:text-slate-700 underline underline-offset-2"
            title="LINEで送る際はこのURLを使うと、外部ブラウザで開きPDF保存が確実になります"
          >
            {lineUrlCopied ? '✓ コピーしました' : 'LINEで共有する（URLコピー）'}
          </button>
        </header>
        )}

        {/* LINE内ブラウザ検出時：PDF保存・印刷が制限されるため案内（埋め込み時は非表示） */}
        {!embedded && isInLineBrowser && (
          <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200 no-print">
            <p className="font-medium text-amber-900 mb-2">
              LINE内で表示中です。PDF保存・印刷を確実に行うには、ブラウザで開いてください。
            </p>
            <div className="flex flex-wrap gap-2 items-center">
              <button
                type="button"
                onClick={async () => {
                  const base = typeof window !== 'undefined' && !window.location.origin.includes('localhost')
                    ? window.location.origin
                    : LINE_SHARE_BASE_URL;
                  const url = `${base}/?openExternalBrowser=1`;
                  try {
                    await navigator.clipboard.writeText(url);
                    setLineUrlCopied(true);
                    setTimeout(() => setLineUrlCopied(false), 3000);
                  } catch {
                    window.prompt('以下のURLをコピーしてLINEで送り、再度タップしてください:', url);
                  }
                }}
                className="px-4 py-2 rounded-lg bg-amber-600 text-white font-medium text-sm hover:bg-amber-700 transition-colors"
              >
                {lineUrlCopied ? 'コピーしました' : 'ブラウザ用URLをコピー'}
              </button>
              <span className="text-sm text-amber-800">
                または 右上の ⋮ → 「Safariで開く」「Chromeで開く」を選択
              </span>
            </div>
          </div>
        )}

        {/* 入力（メニュー生成後は非表示） */}
        {showForm && (
        <>
        <div id="input-form" className="panel-premium p-6 md:p-8 mb-6">
          {/* モード切替：クイック | カスタム（ジム風） */}
          <div className="flex rounded-2xl bg-slate-100/80 p-1.5 gap-1 mb-5">
            <button
              type="button"
              onClick={() => { setMode('quick'); setCustomStep(1); setApiError(null); }}
              className={`flex-1 py-3 px-4 rounded-xl text-sm font-semibold transition-all ${mode === 'quick' ? 'bg-gradient-to-r from-cyan-500 to-teal-500 text-white shadow-lg shadow-cyan-500/25' : 'text-slate-600 hover:bg-white hover:text-slate-900'}`}
            >
              クイック（4項目）
            </button>
            <button
              type="button"
              onClick={() => { setMode('custom'); setCustomStep(1); setApiError(null); }}
              className={`flex-1 py-3 px-4 rounded-xl text-sm font-semibold transition-all ${mode === 'custom' ? 'bg-gradient-to-r from-cyan-500 to-teal-500 text-white shadow-lg shadow-cyan-500/25' : 'text-slate-600 hover:bg-white hover:text-slate-900'}`}
            >
              カスタム（8項目）
            </button>
          </div>
          <p className="text-sm text-slate-500 mb-5">
            {mode === 'quick' ? '4項目でテンプレートから適正なメニューを1件抽出。すぐに表示されます。' : '8項目でAIが種目・年齢・状況に合わせてあなた専用のメニューを生成します。'}
          </p>

          {mode === 'quick' && (
            <>
              <h2 className="text-lg font-semibold text-slate-900 mb-4">基本条件（4項目）</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">1. 目的</label>
                  <select value={input.period} onChange={(e) => handleInputChange('period', e.target.value)} className="w-full px-3 py-2.5 border-2 border-slate-200 rounded-2xl bg-white focus:outline-none focus:ring-2 focus:ring-cyan-400/30 focus:border-cyan-400">
                    <option value="">選択してください</option>
                    <option value="1">① リカバリー期</option>
                    <option value="2">② 基礎形成期</option>
                    <option value="3">③ 発展形成期</option>
                    <option value="4">④ 強化期 (スピード持久力)</option>
                    <option value="5">⑤ 強化期 (耐乳酸)</option>
                    <option value="6">⑥ 調整期</option>
                    <option value="7">⑦ テーパー期</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">2. 距離タイプ</label>
                  <select value={input.distanceType} onChange={(e) => handleInputChange('distanceType', e.target.value)} className="w-full px-3 py-2.5 border-2 border-slate-200 rounded-2xl bg-white focus:outline-none focus:ring-2 focus:ring-cyan-400/30 focus:border-cyan-400">
                    <option value="">選択してください</option>
                    <option value="S">S（スプリント）</option>
                    <option value="M">M（ミドル）</option>
                    <option value="D">D（ディスタンス）</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <DistanceTimeField
                    distance={input.distance}
                    practiceTime={input.practiceTime}
                    onDistanceChange={(v) => handleInputChange('distance', v)}
                    onPracticeTimeChange={(v) => handleInputChange('practiceTime', v)}
                    distanceLabel="3. 距離"
                    practiceTimeLabel="4. 練習時間"
                  />
                </div>
              </div>
              <div className="mt-6">
                <button onClick={generateMenuLocal} disabled={!isQuickFormValid()} className="px-8 py-4 bg-gradient-to-r from-cyan-500 to-teal-500 text-white font-bold rounded-2xl shadow-lg shadow-cyan-500/25 hover:from-cyan-600 hover:to-teal-600 disabled:from-slate-400 disabled:to-slate-400 disabled:cursor-not-allowed transition-all">
                  メニューを生成
                </button>
              </div>
            </>
          )}

          {mode === 'custom' && (
            <>
              {/* ステップインジケーター */}
              <div className="flex items-center gap-2 mb-5">
                <span className={`flex h-9 w-9 items-center justify-center rounded-xl text-sm font-bold transition-all ${customStep >= 1 ? 'bg-gradient-to-r from-cyan-500 to-teal-500 text-white shadow-lg' : 'bg-slate-200 text-slate-500'}`}>1</span>
                <span className="h-1 flex-1 max-w-[48px] rounded-full bg-slate-200" />
                <span className={`flex h-9 w-9 items-center justify-center rounded-xl text-sm font-bold transition-all ${customStep >= 2 ? 'bg-gradient-to-r from-cyan-500 to-teal-500 text-white shadow-lg' : 'bg-slate-200 text-slate-500'}`}>2</span>
              </div>

              {customStep === 1 && (
                <>
                  <h2 className="text-lg font-semibold text-slate-900 mb-4">ステップ1: あなたについて（4項目）</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">1. 種目</label>
                      <select value={input.stroke || 'Fr'} onChange={(e) => handleInputChange('stroke', e.target.value)} className="w-full px-3 py-2.5 border-2 border-slate-200 rounded-2xl bg-white focus:outline-none focus:ring-2 focus:ring-cyan-400/30 focus:border-cyan-400">
                        <option value="Fr">Fr（自由形）</option>
                        <option value="Ba">Ba（背泳ぎ）</option>
                        <option value="Br">Br（平泳ぎ）</option>
                        <option value="Fly">Fly（バタフライ）</option>
                        <option value="IM">個人メドレー</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">2. 年齢</label>
                      <select value={input.age} onChange={(e) => handleInputChange('age', e.target.value)} className="w-full px-3 py-2.5 border-2 border-slate-200 rounded-2xl bg-white focus:outline-none focus:ring-2 focus:ring-cyan-400/30 focus:border-cyan-400">
                        <option value="">選択してください</option>
                        {Array.from({ length: 94 }, (_, i) => 6 + i).map((n) => <option key={n} value={String(n)}>{n}歳</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">3. レベル</label>
                      <select value={input.level} onChange={(e) => handleInputChange('level', e.target.value)} className="w-full px-3 py-2.5 border-2 border-slate-200 rounded-2xl bg-white focus:outline-none focus:ring-2 focus:ring-cyan-400/30 focus:border-cyan-400">
                        <option value="">選択してください</option>
                        <option value="全国大会入賞〜代表クラス">全国大会入賞〜代表クラス</option>
                        <option value="上級（選手クラス〜全国大会）">上級（選手クラス〜全国大会）</option>
                        <option value="中級（育成クラス〜県大会）">中級（育成クラス〜県大会）</option>
                        <option value="初級（4泳法完泳）">初級（4泳法完泳）</option>
                        <option value="マスターズ（記録狙い）">マスターズ（記録狙い）</option>
                        <option value="マスターズ（大会出場）">マスターズ（大会出場）</option>
                        <option value="マスターズ（泳力向上）">マスターズ（泳力向上）</option>
                        <option value="マスターズ（健康志向）">マスターズ（健康志向）</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">4. 状況</label>
                      <select value={input.condition} onChange={(e) => handleInputChange('condition', e.target.value)} className="w-full px-3 py-2.5 border-2 border-slate-200 rounded-2xl bg-white focus:outline-none focus:ring-2 focus:ring-cyan-400/30 focus:border-cyan-400">
                        <option value="">選択してください</option>
                        <option value="良好">良好</option>
                        <option value="軽疲労">軽疲労</option>
                        <option value="筋疲労（筋トレ後）">筋疲労（筋トレ後）</option>
                        <option value="疲労残り（メイン翌日）">疲労残り（メイン翌日）</option>
                        <option value="月経期">月経期</option>
                      </select>
                    </div>
                  </div>
                  <div className="mt-6">
                    <button onClick={() => setCustomStep(2)} disabled={!isCustomStep1Valid()} className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-teal-500 text-white font-semibold rounded-2xl shadow-lg shadow-cyan-500/25 hover:from-cyan-600 hover:to-teal-600 disabled:from-slate-400 disabled:to-slate-400 disabled:cursor-not-allowed transition-all">
                      次へ
                    </button>
                  </div>
                </>
              )}

              {customStep === 2 && (
                <>
                  <h2 className="text-lg font-semibold text-slate-900 mb-4">ステップ2: 練習計画（4項目）</h2>
                  <p className="text-sm text-slate-600 mb-4">今日の狙いと練習条件を入力してください。</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">5. 目的</label>
                      <select value={input.period} onChange={(e) => handleInputChange('period', e.target.value)} className="w-full px-3 py-2.5 border-2 border-slate-200 rounded-2xl bg-white focus:outline-none focus:ring-2 focus:ring-cyan-400/30 focus:border-cyan-400">
                        <option value="">選択してください</option>
                        <option value="1">① リカバリー期</option>
                        <option value="2">② 基礎形成期</option>
                        <option value="3">③ 発展形成期</option>
                        <option value="4">④ 強化期 (スピード持久力)</option>
                        <option value="5">⑤ 強化期 (耐乳酸)</option>
                        <option value="6">⑥ 調整期</option>
                        <option value="7">⑦ テーパー期</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">6. 距離タイプ</label>
                      <select value={input.distanceType} onChange={(e) => handleInputChange('distanceType', e.target.value)} className="w-full px-3 py-2.5 border-2 border-slate-200 rounded-2xl bg-white focus:outline-none focus:ring-2 focus:ring-cyan-400/30 focus:border-cyan-400">
                        <option value="">選択してください</option>
                        <option value="S">S（スプリント）</option>
                        <option value="M">M（ミドル）</option>
                        <option value="D">D（ディスタンス）</option>
                      </select>
                    </div>
                    <div className="sm:col-span-2">
                      <DistanceTimeField
                        distance={input.distance}
                        practiceTime={input.practiceTime}
                        onDistanceChange={(v) => handleInputChange('distance', v)}
                        onPracticeTimeChange={(v) => handleInputChange('practiceTime', v)}
                        distanceLabel="7. 距離"
                        practiceTimeLabel="8. 練習時間"
                      />
                    </div>
                  </div>
                  <div className="mt-6 flex flex-wrap gap-3">
                    <button onClick={() => setCustomStep(1)} className="px-6 py-3 border border-slate-200 bg-white text-slate-700 font-semibold rounded-xl shadow-sm hover:bg-slate-50">
                      戻る
                    </button>
                    <button onClick={generateMenuWithAI} disabled={!isCustomFormValid() || customIsGenerating || openaiConfigured === false} className="px-8 py-4 bg-gradient-to-r from-cyan-500 to-teal-500 text-white font-bold rounded-2xl shadow-lg shadow-cyan-500/25 hover:from-cyan-600 hover:to-teal-600 disabled:from-slate-400 disabled:to-slate-400 disabled:cursor-not-allowed transition-all" title={openaiConfigured === false ? 'カスタム作成はOPENAI_API_KEY設定後に利用できます' : undefined}>
                      {customIsGenerating ? '生成中...' : 'AIでメニューを生成'}
                    </button>
                  </div>
                </>
              )}

              {openaiConfigured === false && (
                <p className="mt-4 text-sm text-amber-700">
                  OpenAI API: 未設定（
                  {(openaiReason === 'placeholder' && 'OPENAI_API_KEY を本物のキーに差し替えてください') || (openaiReason === 'missing' && '.env.ai に OPENAI_API_KEY=あなたのキー を追加してください') || 'OPENAI_API_KEY を設定してください'}
                  ）。設定後は開発サーバーを再起動してください。
                </p>
              )}
            </>
          )}
        </div>
        </>
        )}

        {/* カスタム生成中：ワクワク感のあるポップなアニメーション */}
        {customIsGenerating && (
          <div className="generate-loading-in fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-cyan-50/95 via-white to-teal-50/95 backdrop-blur-sm">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_90%_60%_at_50%_35%,rgba(6,182,212,0.12),transparent_60%)]" aria-hidden />
            <div className="relative flex flex-col items-center gap-10 px-6">
              {/* 水の雫風オーブ + 回転リング */}
              <div className="relative flex items-center justify-center">
                <svg className="generate-loading-ring h-28 w-28 md:h-32 md:w-32 text-cyan-400/80" viewBox="0 0 64 64" fill="none">
                  <circle
                    cx="32"
                    cy="32"
                    r="28"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeDasharray="120 56"
                    className="generate-loading-ring-dash"
                  />
                </svg>
                <div className="generate-loading-orb absolute h-8 w-8 md:h-10 md:w-10 rounded-full bg-gradient-to-br from-cyan-400 to-teal-500 shadow-lg shadow-cyan-400/40" />
              </div>
              <div className="text-center space-y-1.5">
                <p className="generate-loading-wave text-slate-700 font-semibold tracking-wide text-base md:text-lg">
                  {LOADING_MESSAGES[loadingMessageIndex]}
                </p>
                <p className="text-slate-500 text-xs md:text-sm">まもなく完成します</p>
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                {['W-up', 'Drill', 'Kick', 'Main'].map((label, i) => (
                  <span
                    key={label}
                    className="generate-loading-pill rounded-2xl border-2 border-cyan-200/80 bg-white/90 px-4 py-2 text-xs font-semibold text-cyan-700/90 shadow-sm backdrop-blur-sm md:px-5 md:py-2.5 md:text-sm"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  >
                    {label}
                  </span>
                ))}
              </div>
              {/* プログレスバー */}
              <div className="w-full max-w-[260px] h-1 overflow-hidden rounded-full bg-cyan-100/80">
                <div className="generate-loading-progress h-full w-1/3 rounded-full bg-gradient-to-r from-transparent via-cyan-400 to-teal-400" />
              </div>
            </div>
          </div>
        )}

        {/* エラー表示 */}
        {apiError && (
          <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4 mb-4 space-y-3">
            <p>{apiError}</p>
            {apiErrorKind === 'login_required' && (
              <Link href="/login" className="inline-block px-4 py-2 bg-white border border-gray-300 rounded-md font-medium text-gray-700 hover:bg-gray-50">
                ログイン
              </Link>
            )}
            {apiErrorKind === 'retry' && (
              <button
                type="button"
                onClick={generateMenuWithAI}
                disabled={customIsGenerating}
                className="px-4 py-2 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              >
                再試行
              </button>
            )}
            {apiErrorKind === 'unexpected' && (
              <button
                type="button"
                onClick={() => typeof window !== 'undefined' && window.location.reload()}
                className="px-4 py-2 bg-white border border-gray-300 rounded-md font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                再読み込み
              </button>
            )}
          </div>
        )}
        {!showForm && (apiMenuText || result) && (
          <div className="space-y-5 w-full min-w-0">
            <div className="bg-white rounded-lg shadow-md p-4 flex flex-col md:flex-row gap-3 md:items-center md:justify-between no-print">
              <div className="flex items-center gap-2 flex-wrap">
                {result && (
                  <>
                    <span className="text-sm text-slate-500 font-medium">表示:</span>
                    <button
                      onClick={() => setViewMode('table')}
                      className={`px-3 py-1.5 rounded-xl border-2 text-sm font-semibold transition-all ${viewMode === 'table' ? 'bg-gradient-to-r from-cyan-500 to-teal-500 text-white border-transparent shadow-lg' : 'bg-white text-slate-600 border-slate-200 hover:bg-cyan-50 hover:border-cyan-200'}`}
                    >
                      テーブル
                    </button>
                    <button
                      onClick={() => setViewMode('card')}
                      className={`px-3 py-1.5 rounded-xl border-2 text-sm font-semibold transition-all ${viewMode === 'card' ? 'bg-gradient-to-r from-cyan-500 to-teal-500 text-white border-transparent shadow-lg' : 'bg-white text-slate-600 border-slate-200 hover:bg-cyan-50 hover:border-cyan-200'}`}
                    >
                      カード
                    </button>
                  </>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleOpenPDFInNewTab('menu-capture')}
                  disabled={isExporting}
                  className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-900 disabled:opacity-50 font-medium text-sm shadow-sm transition-all"
                  title="PDFを開いて保存"
                >
                  {isExporting ? 'PDF生成中...' : 'PDFを表示'}
                </button>
                <button
                  onClick={() => handleSharePDF('menu-capture')}
                  disabled={isExporting}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 text-white hover:from-cyan-600 hover:to-teal-600 disabled:opacity-50 font-semibold text-sm shadow-lg shadow-cyan-500/25 transition-all"
                >
                  {isExporting ? '共有準備中...' : '共有'}
                </button>
              </div>
            </div>
            <div id="menu-capture" className="space-y-4">
              {apiMenuText ? (
                <div className="bg-white rounded-lg shadow-md p-6">
                  <pre className="whitespace-pre-wrap font-sans text-sm text-gray-800 leading-relaxed">{apiMenuText}</pre>
                </div>
              ) : result ? (
                viewMode === 'table' ? (
                  <div className="p-6 bg-white rounded-lg shadow-md">
                    <MenuSheet input={resultSource === 'quick' ? buildQuickInput() : input} result={result} source={resultSource ?? 'custom'} sectionOrder={sectionOrder ?? undefined} sectionLabels={sectionLabels ?? undefined} />
                  </div>
                ) : (
                  <div className="p-6 bg-white rounded-lg shadow-md">
                    <MenuSheet input={resultSource === 'quick' ? buildQuickInput() : input} result={result} source={resultSource ?? 'custom'} isCardView sectionOrder={sectionOrder ?? undefined} sectionLabels={sectionLabels ?? undefined} />
                  </div>
                )
              ) : null}
            </div>
            <div className="flex justify-center pt-6 pb-2 no-print">
              <button
                type="button"
                onClick={() => {
                  setShowForm(true);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="px-6 py-3 rounded-2xl border-2 border-slate-200 bg-white text-slate-700 font-semibold hover:bg-cyan-50 hover:border-cyan-200 focus:outline-none focus:ring-2 focus:ring-cyan-400/30 transition-all shadow-sm"
              >
                もう一度作る
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
