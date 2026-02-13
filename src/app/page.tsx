'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession, signIn } from 'next-auth/react';
import {
  generateTrainingMenu,
  type TrainingInput,
  type TrainingResult,
} from '@/lib/rt/generator';
import { menuTemplates9Fallback } from '@/lib/rt/menu-templates-9-fallback';
import { useViewMode } from './viewMode';
import { MenuSheet } from '@/components/MenuSheet';

/** クイック用テンプレ（API不要・常にメニュー生成可能） */
const QUICK_TEMPLATES = {
  S: [...menuTemplates9Fallback.S],
  M: [...menuTemplates9Fallback.M],
  D: [...menuTemplates9Fallback.D],
};

const SAVED_INPUT_KEY_PREFIX = 'rt-swimlab-saved-input';

function savedInputKey(userId: string): string {
  return `${SAVED_INPUT_KEY_PREFIX}-${userId}`;
}

const EMPTY_INPUT: TrainingInput = {
  period: '',
  stroke: 'Fr',
  gender: '',
  age: '',
  distanceType: '',
  level: '',
  purpose: '',
  condition: '',
  practiceTime: '',
  volumeUp: '',
};

function isTrainingInput(obj: unknown): obj is TrainingInput {
  if (!obj || typeof obj !== 'object') return false;
  const keys: (keyof TrainingInput)[] = [
    'period', 'stroke', 'gender', 'age', 'distanceType',
    'level', 'purpose', 'condition', 'practiceTime', 'volumeUp',
  ];
  return keys.every((k) => typeof (obj as Record<string, unknown>)[k] === 'string');
}

function loadSavedInput(key: string): TrainingInput {
  if (typeof window === 'undefined' || !key) return EMPTY_INPUT;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return EMPTY_INPUT;
    const parsed = JSON.parse(raw) as unknown;
    if (isTrainingInput(parsed)) return parsed;
  } catch {
    /* ignore */
  }
  return EMPTY_INPUT;
}

export default function Home() {
  const { data: session, status: sessionStatus } = useSession();
  const { viewMode, setViewMode } = useViewMode();

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
  const user = session?.user as { email?: string | null; id?: string | null } | undefined;
  const userKey = user?.email ?? user?.id ?? '';
  useEffect(() => {
    if (sessionStatus !== 'authenticated' || !userKey) return;
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

  const isFormValid = () => {
    return Object.values(input).every((v) => (v ?? '') !== '');
  };

  const fallbackToQuickMenu = () => {
    const effectiveInput: TrainingInput = {
      ...input,
      distanceType: input.distanceType === 'S' || input.distanceType === 'M' || input.distanceType === 'D' ? input.distanceType : 'M',
    };
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
      const res = await fetch('/api/custom-menu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
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
    const effectiveInput: TrainingInput = {
      ...input,
      stroke: input.stroke || 'Fr',
      distanceType: input.distanceType === 'S' || input.distanceType === 'M' || input.distanceType === 'D' ? input.distanceType : 'M',
    };
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

  const handleDownloadPDF = async (captureId: string) => {
    try {
      const blob = await exportPDFBlob(captureId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `RT-menu_${new Date().toISOString().slice(0, 10)}.pdf`;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      if (a.parentNode) a.parentNode.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 100);
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
        await handleDownloadPDF(captureId);
      }
    } catch (e) {
      if ((e as Error)?.name === 'AbortError') return; // ユーザーが共有をキャンセル
      console.error(e);
      try {
        await handleDownloadPDF(captureId);
      } catch {
        alert('共有・PDF出力に失敗しました。もう一度お試しください。');
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-slate-50/95 to-slate-100 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        <header className="mb-10 text-center no-print">
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2 tracking-tight">
            RT swim lab
          </h1>
          <p className="text-slate-600 text-base md:text-lg">立石諒と高城直基が監修の指導哲学に基づく練習メニュー</p>
        </header>

        {/* 入力（メニュー生成後は非表示） */}
        {showForm && (
        <>
        <div id="input-form" className="panel-premium p-6 md:p-8 mb-6">
          <h2 className="text-xl font-semibold text-slate-900 mb-5 flex items-center gap-2">
            <span className="w-1 h-6 bg-slate-400/70 rounded-full" />
            入力（必須10項目）
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 1. 期 */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">1. 期</label>
              <select
                value={input.period}
                onChange={(e) => handleInputChange('period', e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-white/80 focus:outline-none focus:ring-2 focus:ring-slate-400/40 focus:border-slate-300 transition-colors"
              >
                <option value="">選択してください</option>
                <option value="1">① リカバリー期</option>
                <option value="2">② 基礎形成期</option>
                <option value="3">③ 発展形成期</option>
                <option value="4">④ 強化期 (スピード持久力)</option>
                <option value="5">⑤ 強化期 (対乳酸)</option>
                <option value="6">⑥ 調整期</option>
                <option value="7">⑦ テーパー期</option>
              </select>
            </div>

            {/* 2. 種目（無記入にしない：Fr/Ba/Br/Fly/IM） */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">2. 種目</label>
              <select
                value={input.stroke || 'Fr'}
                onChange={(e) => handleInputChange('stroke', e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-white/80 focus:outline-none focus:ring-2 focus:ring-slate-400/40 focus:border-slate-300 transition-colors"
              >
                <option value="Fr">Fr（自由形）</option>
                <option value="Ba">Ba（背泳ぎ）</option>
                <option value="Br">Br（平泳ぎ）</option>
                <option value="Fly">Fly（バタフライ）</option>
                <option value="IM">メドレー</option>
              </select>
            </div>

            {/* 3. 性別 */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">3. 性別</label>
              <select
                value={input.gender}
                onChange={(e) => handleInputChange('gender', e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-white/80 focus:outline-none focus:ring-2 focus:ring-slate-400/40 focus:border-slate-300 transition-colors"
              >
                <option value="">選択してください</option>
                <option value="男">男</option>
                <option value="女">女</option>
              </select>
            </div>

            {/* 4. 年齢（スクロール選択で入力エラーを防止） */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">4. 年齢</label>
              <select
                value={input.age}
                onChange={(e) => handleInputChange('age', e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-white/80 focus:outline-none focus:ring-2 focus:ring-slate-400/40 focus:border-slate-300 transition-colors"
              >
                <option value="">選択してください</option>
                {Array.from({ length: 94 }, (_, i) => 6 + i).map((n) => (
                  <option key={n} value={String(n)}>
                    {n}歳
                  </option>
                ))}
              </select>
            </div>

            {/* 5. 距離タイプ */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">5. 距離タイプ</label>
              <select
                value={input.distanceType}
                onChange={(e) => handleInputChange('distanceType', e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-white/80 focus:outline-none focus:ring-2 focus:ring-slate-400/40 focus:border-slate-300 transition-colors"
              >
                <option value="">選択してください</option>
                <option value="S">S（スプリント）</option>
                <option value="M">M（ミドル）</option>
                <option value="D">D（ディスタンス）</option>
              </select>
            </div>

            {/* 6. レベル */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">6. レベル</label>
              <select
                value={input.level}
                onChange={(e) => handleInputChange('level', e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-white/80 focus:outline-none focus:ring-2 focus:ring-slate-400/40 focus:border-slate-300 transition-colors"
              >
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

            {/* 7. 目的 */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">7. 目的</label>
              <select
                value={input.purpose}
                onChange={(e) => handleInputChange('purpose', e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-white/80 focus:outline-none focus:ring-2 focus:ring-slate-400/40 focus:border-slate-300 transition-colors"
              >
                <option value="">選択してください</option>
                <option value="技術">技術</option>
                <option value="スピード">スピード</option>
                <option value="対乳酸">対乳酸</option>
                <option value="持久">持久</option>
                <option value="レースペース">レースペース</option>
                <option value="回復">回復</option>
              </select>
            </div>

            {/* 8. 状況 */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">8. 状況</label>
              <select
                value={input.condition}
                onChange={(e) => handleInputChange('condition', e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-white/80 focus:outline-none focus:ring-2 focus:ring-slate-400/40 focus:border-slate-300 transition-colors"
              >
                <option value="">選択してください</option>
                <option value="良好">良好</option>
                <option value="軽疲労">軽疲労</option>
                <option value="筋疲労（筋トレ後）">筋疲労（筋トレ後）</option>
                <option value="疲労残り（メイン翌日）">疲労残り（メイン翌日）</option>
                <option value="月経期">月経期</option>
              </select>
            </div>

            {/* 9. 練習時間 */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">9. 練習時間</label>
              <select
                value={input.practiceTime}
                onChange={(e) => handleInputChange('practiceTime', e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-white/80 focus:outline-none focus:ring-2 focus:ring-slate-400/40 focus:border-slate-300 transition-colors"
              >
                <option value="">選択してください</option>
                <option value="60">60分</option>
                <option value="90">90分</option>
                <option value="120">120分</option>
              </select>
            </div>

            {/* 10. ボリュームアップ項目 */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                10. ボリュームアップ項目
              </label>
              <select
                value={input.volumeUp}
                onChange={(e) => handleInputChange('volumeUp', e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-white/80 focus:outline-none focus:ring-2 focus:ring-slate-400/40 focus:border-slate-300 transition-colors"
              >
                <option value="">選択してください</option>
                <option value="Drill">Drill</option>
                <option value="Kick">Kick</option>
                <option value="Pull">Pull</option>
                <option value="Pre-Main">Pre-Main</option>
                <option value="Main">Main</option>
              </select>
            </div>
          </div>

          {/* API未設定時のみ表示（利用可能のときは何も出さない） */}
          {openaiConfigured === false && (
            <p className="mt-2 text-sm text-amber-700">
              OpenAI API: 未設定（
              {(openaiReason === 'placeholder' && 'OPENAI_API_KEY を本物のキーに差し替えてください') ||
                (openaiReason === 'missing' && '.env.local に OPENAI_API_KEY=あなたのキー を追加してください') ||
                'OPENAI_API_KEY を設定してください'}
              ）。設定後は必ず開発サーバーを再起動（npm run dev のやり直し）してください。キーはクォートで囲まないでください。
            </p>
          )}

        </div>

        {/* 生成ボタン */}
        <div className="mb-6 flex flex-wrap gap-3">
          <button
            onClick={generateMenuLocal}
            className="px-6 py-3 border border-slate-200 bg-white text-slate-700 font-semibold rounded-xl shadow-sm hover:bg-slate-50 hover:shadow-md hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-400/50 transition-all"
          >
            クイック作成
          </button>
          <button
            onClick={generateMenuWithAI}
            disabled={!isFormValid() || customIsGenerating || openaiConfigured === false}
            className="px-6 py-3 bg-slate-800 text-white font-semibold rounded-xl shadow-md hover:bg-slate-900 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-slate-500/50 disabled:bg-slate-400 disabled:cursor-not-allowed transition-all"
            title={openaiConfigured === false ? 'カスタム作成はOPENAI_API_KEY設定後に利用できます' : undefined}
          >
            {customIsGenerating ? '生成中...' : 'カスタム作成'}
          </button>
        </div>
        </>
        )}

        {/* カスタム生成中：全画面アニメーション */}
        {customIsGenerating && (
          <div className="generate-loading-in fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-slate-100 via-white to-sky-50/80">
            <div className="generate-loading-shimmer absolute inset-0 bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.5)_50%,transparent_100%)] bg-[length:200%_100%]" />
            <div className="relative flex flex-col items-center gap-8 px-6">
              {/* 波アイコン（大きく） */}
              <div className="flex items-center justify-center gap-4">
                <svg className="h-12 w-12 text-sky-500/80 md:h-14 md:w-14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 12c2-2 4-4 6-4s4 2 6 4 4 4 6 4" />
                  <path d="M2 16c2-2 4-4 6-4s4 2 6 4 4 4 6 4" />
                  <path d="M2 8c2-2 4-4 6-4s4 2 6 4 4 4 6 4" className="generate-loading-pulse" style={{ animationDelay: '0s' }} />
                </svg>
                <div className="flex gap-2">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="generate-loading-wave h-3 w-3 rounded-full bg-slate-500 md:h-4 md:w-4"
                      style={{ animationDelay: `${i * 0.15}s` }}
                    />
                  ))}
                </div>
                <svg className="h-12 w-12 text-sky-500/80 md:h-14 md:w-14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 12c2-2 4-4 6-4s4 2 6 4 4 4 6 4" />
                  <path d="M2 16c2-2 4-4 6-4s4 2 6 4 4 4 6 4" />
                  <path d="M2 8c2-2 4-4 6-4s4 2 6 4 4 4 6 4" className="generate-loading-pulse" style={{ animationDelay: '0.3s' }} />
                </svg>
              </div>
              <p className="text-slate-700 font-medium tracking-wide text-lg md:text-xl">
                {LOADING_MESSAGES[loadingMessageIndex]}
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                {['W-up', 'Drill', 'Kick', 'Main'].map((label, i) => (
                  <span
                    key={label}
                    className="generate-loading-pulse rounded-xl bg-slate-100/90 px-4 py-2 text-sm font-medium text-slate-600 md:px-5 md:py-2.5 md:text-base"
                    style={{ animationDelay: `${i * 0.2}s` }}
                  >
                    {label}
                  </span>
                ))}
              </div>
              {/* プログレスバー風アニメーション */}
              <div className="w-full max-w-sm h-2 rounded-full bg-slate-200/80 overflow-hidden relative">
                <div className="generate-loading-progress absolute inset-y-0 w-1/3 rounded-full bg-gradient-to-r from-sky-300/50 to-sky-500/70" />
              </div>
            </div>
          </div>
        )}

        {/* エラー表示 */}
        {apiError && (
          <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4 mb-4 space-y-3">
            <p>{apiError}</p>
            {apiErrorKind === 'login_required' && (
              <button
                type="button"
                onClick={() => signIn('google', { callbackUrl: typeof window !== 'undefined' ? window.location.href : '/' })}
                className="px-4 py-2 bg-white border border-gray-300 rounded-md font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Googleでログイン
              </button>
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
                      className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-all ${viewMode === 'table' ? 'bg-slate-800 text-white border-slate-800 shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                    >
                      テーブル
                    </button>
                    <button
                      onClick={() => setViewMode('card')}
                      className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-all ${viewMode === 'card' ? 'bg-slate-800 text-white border-slate-800 shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                    >
                      カード
                    </button>
                  </>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-900 font-medium text-sm shadow-sm transition-all"
                >
                  印刷
                </button>
                <button
                  onClick={() => handleDownloadPDF('menu-capture')}
                  disabled={isExporting}
                  className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-900 disabled:opacity-50 font-medium text-sm shadow-sm transition-all"
                >
                  {isExporting ? 'PDF生成中...' : 'PDFダウンロード'}
                </button>
                <button
                  onClick={() => handleSharePDF('menu-capture')}
                  disabled={isExporting}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-white hover:bg-slate-900 disabled:opacity-50 font-medium text-sm shadow-md transition-all"
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
                    <MenuSheet input={input} result={result} source={resultSource ?? 'custom'} sectionOrder={sectionOrder ?? undefined} sectionLabels={sectionLabels ?? undefined} />
                  </div>
                ) : (
                  <div className="p-6 bg-white rounded-lg shadow-md">
                    <MenuSheet input={input} result={result} source={resultSource ?? 'custom'} isCardView sectionOrder={sectionOrder ?? undefined} sectionLabels={sectionLabels ?? undefined} />
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
                className="px-6 py-3 rounded-xl border border-slate-200 bg-white text-slate-700 font-semibold hover:bg-slate-50 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-400/50 transition-all shadow-sm"
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
