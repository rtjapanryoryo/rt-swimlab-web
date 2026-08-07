'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { useProfile } from '@/contexts/ProfileContext';
import {
  generateTrainingMenu,
  type TrainingInput,
  type TrainingResult,
} from '@/lib/rt/generator';
import { menuTemplates9Fallback } from '@/lib/rt/menu-templates-9-fallback';
import { useViewMode } from '@/app/viewMode';
import { MenuSheet } from '@/components/MenuSheet';
import { PracticeVolumeField } from '@/components/PracticeVolumeField';
import { PurposeField } from '@/components/PurposeField';
import { isQuickDistanceValid } from '@/lib/rt/distance-time-validation';
import { calcUsageStatus, IS_DEMO_PERIOD, MAINTENANCE_MODE } from '@/lib/plan-limits';
import Link from 'next/link';

/** クイック用テンプレ（API不要・常にメニュー生成可能） */
const QUICK_TEMPLATES = {
  S: [...menuTemplates9Fallback.S],
  M: [...menuTemplates9Fallback.M],
  D: [...menuTemplates9Fallback.D],
};

const SAVED_INPUT_KEY_PREFIX = 'rt-swimlab-saved-input';

const RACE_EVENT_OPTIONS = [
  { value: 'Fr_50m', label: '自由形 50m', stroke: 'Fr' },
  { value: 'Fr_100m', label: '自由形 100m', stroke: 'Fr' },
  { value: 'Fr_200m', label: '自由形 200m', stroke: 'Fr' },
  { value: 'Ba_50m', label: '背泳ぎ 50m', stroke: 'Ba' },
  { value: 'Ba_100m', label: '背泳ぎ 100m', stroke: 'Ba' },
  { value: 'Br_50m', label: '平泳ぎ 50m', stroke: 'Br' },
  { value: 'Br_100m', label: '平泳ぎ 100m', stroke: 'Br' },
  { value: 'Fly_50m', label: 'バタフライ 50m', stroke: 'Fly' },
  { value: 'Fly_100m', label: 'バタフライ 100m', stroke: 'Fly' },
  { value: 'IM_100m', label: '個人メドレー 100m', stroke: 'IM' },
  { value: 'IM_200m', label: '個人メドレー 200m', stroke: 'IM' },
  { value: 'IM_400m', label: '個人メドレー 400m', stroke: 'IM' },
] as const;

function strokeFromRaceEvent(raceEvent: string): string | null {
  return RACE_EVENT_OPTIONS.find((option) => option.value === raceEvent)?.stroke ?? null;
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
  generationMode: 'standard',
  poolLength: 'short_course',
  raceEvent: 'Fr_50m',
  raceEvent2: '',
  bestTime: '',
  explanationLevel: 'technical',
  mainSetTime: '30',
};

function isTrainingInput(obj: unknown): obj is TrainingInput {
  if (!obj || typeof obj !== 'object') return false;
  const keys: (keyof TrainingInput)[] = [
    'period', 'stroke', 'distance', 'age', 'distanceType',
    'level', 'condition', 'practiceTime',
  ];
  const optionalKeys: (keyof TrainingInput)[] = [
    'generationMode', 'poolLength', 'raceEvent', 'raceEvent2', 'bestTime',
    'explanationLevel', 'mainSetTime',
  ];
  const record = obj as Record<string, unknown>;
  return (
    keys.every((k) => typeof record[k] === 'string') &&
    optionalKeys.every((k) => record[k] === undefined || typeof record[k] === 'string')
  );
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
    if (isTrainingInput(parsed)) {
      const next = { ...EMPTY_INPUT, ...parsed } as TrainingInput;
      // 説明レベル切替は廃止し、用語は専用ページで確認する運用に統一します。
      next.explanationLevel = 'technical';
      // 旧UIの自由入力値は使わず、生成時にサーバーが登録済みベストタイムを取得します。
      next.bestTime = '';
      const derivedStroke = strokeFromRaceEvent(next.raceEvent ?? '');
      if (derivedStroke) next.stroke = derivedStroke;
      return next;
    }
  } catch {
    /* ignore */
  }
  return EMPTY_INPUT;
}

function normalizeTrainingInput(input: Partial<TrainingInput>): TrainingInput {
  const next = { ...EMPTY_INPUT, ...input } as TrainingInput;
  // 旧データの値は受け取りますが、新しい生成では専門用語中心に統一します。
  next.explanationLevel = 'technical';
  next.bestTime = '';
  const derivedStroke = strokeFromRaceEvent(next.raceEvent ?? '');
  if (derivedStroke) next.stroke = derivedStroke;
  return next;
}

export type MenuGeneratorPanelProps = {
  embedded?: boolean;
  onSaved?: () => void;
  planId?: string;
  initialValues?: Partial<TrainingInput>;
};

export default function MenuGeneratorPanel(props?: MenuGeneratorPanelProps) {
  const { embedded, onSaved, planId, initialValues } = props ?? {};
  const { user, loading: sessionStatus } = useAuth();
  const { profile } = useProfile();
  const { viewMode, setViewMode } = useViewMode();

  const usageStatus = calcUsageStatus({
    planId: 'free',
    customCountTotal: profile?.custom_count ?? 0,
    customCountThisMonth: profile?.custom_count_this_month ?? 0,
  });

  const [mode, setMode] = useState<'quick' | 'custom'>(initialValues ? 'custom' : 'quick');
  const [customStep, setCustomStep] = useState<1 | 2>(1);
  const [input, setInput] = useState<TrainingInput>(initialValues ? normalizeTrainingInput(initialValues) : EMPTY_INPUT);
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
  const [isSavingMenu, setIsSavingMenu] = useState(false);
  const [menuSavedAt, setMenuSavedAt] = useState<Date | null>(null);

  // レース日からトレーニング期を自動サジェスト
  const [raceDate, setRaceDate] = useState<string>('');
  useEffect(() => {
    const stored = localStorage.getItem('rt-race-date');
    if (stored) setRaceDate(stored);
  }, []);
  const raceDaysLeft = raceDate ? Math.ceil((new Date(raceDate).getTime() - Date.now()) / 86400000) : null;
  const suggestedPeriodFromRace: string | null = (() => {
    if (raceDaysLeft === null || raceDaysLeft < 0) return null;
    if (raceDaysLeft <= 7)   return '7';
    if (raceDaysLeft <= 21)  return '6';
    if (raceDaysLeft <= 42)  return '5';
    if (raceDaysLeft <= 70)  return '4';
    if (raceDaysLeft <= 105) return '3';
    if (raceDaysLeft <= 140) return '2';
    return '1';
  })();
  const PERIOD_SHORT_LABELS: Record<string, string> = {
    '1': 'リカバリー', '2': '基礎形成', '3': '発展形成',
    '4': '強化(SL)', '5': '強化(AN)', '6': '調整期', '7': 'テーパー',
  };

  const LOADING_MESSAGES = [
    'reading...',
    'designing...',
    'calibrating...',
    'optimizing...',
    'finalizing...',
  ];
  const isCustomGenerationDisabled =
    MAINTENANCE_MODE ||
    openaiConfigured === false ||
    (!IS_DEMO_PERIOD && usageStatus.isLimitReached);
  const customGenerationDisabledTitle = MAINTENANCE_MODE
    ? 'カスタム生成は本リリース準備中です'
    : openaiConfigured === false
      ? 'カスタム生成はOPENAI_API_KEY設定後に利用できます'
      : undefined;

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


  // 距離の整合：無効な組み合わせなら距離をリセット
  // Quick = 距離タイプ×練習時間、Custom = 距離タイプのみ
  useEffect(() => {
    if (!input.distance) return;
    if (mode !== 'quick') return;
    const valid = isQuickDistanceValid(input.distance, input.distanceType, input.practiceTime);
    if (!valid) {
      setInput((prev) => ({ ...prev, distance: '' }));
    }
  }, [mode, input.distanceType, input.distance, input.practiceTime]);

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
    setInput((prev) => {
      const next = { ...prev, [field]: value };
      if (field === 'raceEvent') {
        const derivedStroke = strokeFromRaceEvent(value);
        if (derivedStroke) next.stroke = derivedStroke;
        if (next.raceEvent2 === value) next.raceEvent2 = '';
      }
      const nextType = field === 'distanceType' ? value : prev.distanceType;
      const nextTime = field === 'practiceTime' ? value : prev.practiceTime;
      if (mode === 'quick' && prev.distance) {
        const valid = isQuickDistanceValid(prev.distance, nextType, nextTime);
        if (!valid) next.distance = '';
      }
      return next;
    });
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
    !!input.raceEvent &&
    !!input.age &&
    !!input.level &&
    !!input.condition;

  /** カスタム用：8項目すべての必須チェック */
  const isCustomFormValid = () =>
    isCustomStep1Valid() &&
    !!input.period &&
    !!input.mainSetTime;

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
    poolLength: input.poolLength ?? 'short_course',
    explanationLevel: 'technical',
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
      const payload: Record<string, unknown> = {
        ...input,
        stroke: input.stroke || 'Fr',
        // custom生成では旧来の全体練習ボリュームを使わず、メインセット時間から本数を算出します。
        distance: '',
        distanceType: '',
        practiceTime: '',
        ...(planId ? { plan_id: planId } : {}),
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

  /** メニューをテキスト形式でクリップボードにコピー */
  const [copyDone, setCopyDone] = useState(false);
  const handleCopyText = async () => {
    if (!result) return;
    const LABELS: Record<string, string> = {
      warmUp: 'W-up', drill: 'Drill', kick: 'Kick', pull: 'Pull',
      preMain: 'Pre-Main', dive: 'Dive', rest: 'Rest', main: 'Main', down: 'Down',
    };
    const activeInput = resultSource === 'quick' ? buildQuickInput() : input;
    const lines: string[] = [];
    lines.push(`■ RT swim lab 練習メニュー`);
    lines.push(`日付: ${new Date().toLocaleDateString('ja-JP')}`);
    if (activeInput.period) lines.push(`期: ${activeInput.period}`);
    if (resultSource === 'custom') {
      const mainEvent1 = RACE_EVENT_OPTIONS.find((option) => option.value === activeInput.raceEvent)?.label;
      const mainEvent2 = RACE_EVENT_OPTIONS.find((option) => option.value === activeInput.raceEvent2)?.label;
      if (mainEvent1) lines.push(`メイン種目1: ${mainEvent1}`);
      if (mainEvent2) lines.push(`メイン種目2: ${mainEvent2}`);
      if (activeInput.mainSetTime) lines.push(`メインセット時間: ${activeInput.mainSetTime}分`);
    } else {
      if (activeInput.stroke) lines.push(`種目: ${activeInput.stroke}`);
      if (activeInput.distance) lines.push(`距離: ${activeInput.distance}m`);
    }
    lines.push('');
    for (const key of ['warmUp', 'drill', 'kick', 'pull', 'preMain', 'dive', 'rest', 'main', 'down']) {
      const val = (result as unknown as Record<string, string>)[key];
      if (val && val.trim()) lines.push(`${LABELS[key] ?? key}: ${val}`);
    }
    lines.push('');
    lines.push(result.total ?? '');
    if (result.intention) { lines.push(''); lines.push(`【今日の狙い】\n${result.intention}`); }
    if (result.coachingPoint) { lines.push(''); lines.push(`【指導ポイント】\n${result.coachingPoint}`); }
    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      setCopyDone(true);
      setTimeout(() => setCopyDone(false), 2000);
    } catch { /* ignore */ }
  };

  /** PDFを直接ダウンロード保存 */
  const handleDownloadPDF = async (captureId: string) => {
    try {
      const blob = await exportPDFBlob(captureId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `RT-menu_${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (e) {
      console.error('PDF download error:', e);
      // フォールバック：新しいタブで開く
      await handleOpenPDFInNewTab(captureId);
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


  return (
    <div className={embedded ? 'py-4' : 'min-h-screen bg-gradient-to-b from-cyan-50 via-teal-50 to-sky-100 py-8 px-4'}>
      <div className="max-w-5xl mx-auto">
        {!embedded && (
        <header className="mb-10 text-center no-print relative">
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2 tracking-tight">
            RT swim lab
          </h1>
          <p className="text-slate-600 text-base md:text-lg">立石諒と高城直基が監修の指導哲学に基づく練習メニュー</p>
        </header>
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
              カスタム（9項目）
            </button>
          </div>
          <p className="text-sm text-slate-500 mb-5">
            {mode === 'quick' ? '4項目でテンプレートから適正なメニューを1件抽出。すぐに表示されます。' : 'メイン種目と時間をもとに、あなた専用のメインセットを1案生成します。'}
          </p>
          <div className="mb-5 flex justify-end">
            <Link href="/guide/menu-terms" className="text-sm font-semibold text-cyan-700 underline decoration-cyan-300 underline-offset-4 hover:text-cyan-900">
              水泳メニュー用語を確認
            </Link>
          </div>

          {/* レース日サジェスト */}
          {suggestedPeriodFromRace && (
            <div className="mb-4 px-4 py-3 rounded-2xl bg-cyan-50 border border-cyan-200 flex items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-cyan-700">🏁 レースまで {raceDaysLeft}日</span>
                <span className="text-[11px] text-slate-500 ml-2">推奨期: {PERIOD_SHORT_LABELS[suggestedPeriodFromRace]}</span>
              </div>
              <button
                type="button"
                onClick={() => handleInputChange('period', suggestedPeriodFromRace)}
                className="text-xs font-bold px-3 py-1 rounded-xl bg-cyan-500 text-white hover:bg-cyan-600 transition-colors flex-shrink-0"
              >
                適用
              </button>
            </div>
          )}

          {mode === 'quick' && (
            <>
              <h2 className="text-lg font-semibold text-slate-900 mb-4">基本条件（4項目）</h2>
              <div className="space-y-5">
                <PurposeField
                  value={input.period}
                  onChange={(v) => handleInputChange('period', v)}
                  itemNumber="1"
                />
                <PracticeVolumeField
                  distanceType={input.distanceType}
                  distance={input.distance}
                  practiceTime={input.practiceTime}
                  onDistanceTypeChange={(v) => handleInputChange('distanceType', v)}
                  onDistanceChange={(v) => handleInputChange('distance', v)}
                  onPracticeTimeChange={(v) => handleInputChange('practiceTime', v)}
                  itemNumberPrefix="2."
                  mode="quick"
                />
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
                  <h2 className="text-lg font-semibold text-slate-900 mb-4">ステップ1: 基本条件（7項目）</h2>
                  <div className="mb-5 space-y-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">1. 生成モード</label>
                      <div className="grid grid-cols-2 gap-2 rounded-2xl bg-white p-1.5 border border-slate-200">
                        <button
                          type="button"
                          onClick={() => handleInputChange('generationMode', 'standard')}
                          className={`py-2.5 px-3 rounded-xl text-sm font-semibold transition-all ${input.generationMode !== 'sprint_50m' ? 'bg-gradient-to-r from-cyan-500 to-teal-500 text-white shadow-lg shadow-cyan-500/20' : 'text-slate-600 hover:bg-slate-50'}`}
                        >
                          通常メニュー
                        </button>
                        <button
                          type="button"
                          onClick={() => handleInputChange('generationMode', 'sprint_50m')}
                          className={`py-2.5 px-3 rounded-xl text-sm font-semibold transition-all ${input.generationMode === 'sprint_50m' ? 'bg-gradient-to-r from-cyan-500 to-teal-500 text-white shadow-lg shadow-cyan-500/20' : 'text-slate-600 hover:bg-slate-50'}`}
                        >
                          50m特化
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">2. メイン種目1</label>
                      <select value={input.raceEvent || 'Fr_50m'} onChange={(e) => handleInputChange('raceEvent', e.target.value)} className="w-full px-3 py-2.5 border-2 border-slate-200 rounded-2xl bg-white focus:outline-none focus:ring-2 focus:ring-cyan-400/30 focus:border-cyan-400">
                        {RACE_EVENT_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                      <p className="text-[11px] text-slate-400 mt-1">メインセットの中心として取り組む種目を選びます。</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">3. メイン種目2（任意）</label>
                      <select value={input.raceEvent2 || ''} onChange={(e) => handleInputChange('raceEvent2', e.target.value)} className="w-full px-3 py-2.5 border-2 border-slate-200 rounded-2xl bg-white focus:outline-none focus:ring-2 focus:ring-cyan-400/30 focus:border-cyan-400">
                        <option value="">指定しない</option>
                        {RACE_EVENT_OPTIONS.filter((option) => option.value !== input.raceEvent).map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                      <p className="text-[11px] text-slate-400 mt-1">選択した場合は、Main 1とMain 2に分けて構成します。</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">4. 年齢</label>
                      <select value={input.age} onChange={(e) => handleInputChange('age', e.target.value)} className="w-full px-3 py-2.5 border-2 border-slate-200 rounded-2xl bg-white focus:outline-none focus:ring-2 focus:ring-cyan-400/30 focus:border-cyan-400">
                        <option value="">選択してください</option>
                        <option value="小学生（〜12歳）">小学生（〜12歳）</option>
                        <option value="中学生（13〜15歳）">中学生（13〜15歳）</option>
                        <option value="高校生（16〜18歳）">高校生（16〜18歳）</option>
                        <option value="大学生・マスターズ（19〜29歳）">大学生・マスターズ（19〜29歳）</option>
                        <option value="マスターズ（30〜39歳）">マスターズ（30〜39歳）</option>
                        <option value="マスターズ（40歳以上）">マスターズ（40歳以上）</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">5. レベル</label>
                      <select value={input.level} onChange={(e) => handleInputChange('level', e.target.value)} className="w-full px-3 py-2.5 border-2 border-slate-200 rounded-2xl bg-white focus:outline-none focus:ring-2 focus:ring-cyan-400/30 focus:border-cyan-400">
                        <option value="">選択してください</option>
                        <option value="トップ選手（代表・全国入賞）">トップ選手（代表・全国入賞）</option>
                        <option value="競技選手（地区〜全国 / マスターズ記録挑戦）">競技選手（地区〜全国 / マスターズ記録挑戦）</option>
                        <option value="クラブ選手（育成〜県大会 / マスターズ大会参加）">クラブ選手（育成〜県大会 / マスターズ大会参加）</option>
                        <option value="一般スイマー（定期練習 / マスターズ継続）">一般スイマー（定期練習 / マスターズ継続）</option>
                        <option value="フィットネス（健康・運動目的 / マスターズ健康）">フィットネス（健康・運動目的 / マスターズ健康）</option>
                        <option value="初心者（基礎習得中）">初心者（基礎習得中）</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">6. 状況</label>
                      <select value={input.condition} onChange={(e) => handleInputChange('condition', e.target.value)} className="w-full px-3 py-2.5 border-2 border-slate-200 rounded-2xl bg-white focus:outline-none focus:ring-2 focus:ring-cyan-400/30 focus:border-cyan-400">
                        <option value="">選択してください</option>
                        <option value="絶好調（ピーク・調子最高）">絶好調（ピーク・調子最高）</option>
                        <option value="良好（通常コンディション）">良好（通常コンディション）</option>
                        <option value="軽疲労（体が少し重い）">軽疲労（体が少し重い）</option>
                        <option value="筋疲労（ウェイト・陸トレ後）">筋疲労（ウェイト・陸トレ後）</option>
                        <option value="疲労残り（試合・合宿翌日）">疲労残り（試合・合宿翌日）</option>
                        <option value="月経期">月経期</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">7. プール種別</label>
                      <select value={input.poolLength || 'short_course'} onChange={(e) => handleInputChange('poolLength', e.target.value)} className="w-full px-3 py-2.5 border-2 border-slate-200 rounded-2xl bg-white focus:outline-none focus:ring-2 focus:ring-cyan-400/30 focus:border-cyan-400">
                        <option value="short_course">短水路</option>
                        <option value="long_course">長水路</option>
                      </select>
                    </div>
                    <div>
                      <p className="block text-sm font-medium text-slate-700 mb-1">ベストタイムの使用</p>
                      <div className="rounded-2xl border-2 border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-600">
                        <p>メイン種目とプール種別に一致する登録済み記録を自動で使用します。</p>
                        <p className="mt-1 text-xs text-slate-500">記録がない場合は、安全側のRestを表示します。</p>
                        <Link href="/mypage/best-times" className="mt-2 inline-flex font-semibold text-cyan-700 underline decoration-cyan-300 underline-offset-4 hover:text-cyan-900">
                          ベストタイムを確認・登録
                        </Link>
                      </div>
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
                  <h2 className="text-lg font-semibold text-slate-900 mb-4">ステップ2: メインセット計画（2項目）</h2>
                  <p className="text-sm text-slate-600 mb-4">今日の狙いとメインセットに使える時間から、本数と合計距離を調整します。</p>
                  <div className="space-y-5">
                    <PurposeField
                      value={input.period}
                      onChange={(v) => handleInputChange('period', v)}
                      itemNumber="8"
                    />
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">9. メインセット時間</label>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                        {(['20', '30', '45', '60'] as const).map((minutes) => (
                          <button
                            key={minutes}
                            type="button"
                            onClick={() => handleInputChange('mainSetTime', minutes)}
                            className={`h-12 rounded-xl border-2 text-sm font-semibold transition-colors ${input.mainSetTime === minutes ? 'border-cyan-500 bg-cyan-50 text-cyan-800' : 'border-slate-200 bg-white text-slate-700 hover:border-cyan-300'}`}
                          >
                            {minutes}分
                          </button>
                        ))}
                      </div>
                      <p className="mt-2 text-xs text-slate-500">ウォームアップとクールダウンを除いた、メインセットに使える時間です。</p>
                    </div>
                  </div>
                  <div className="mt-6 flex flex-wrap gap-3 items-center">
                    <button onClick={() => setCustomStep(1)} className="px-6 py-3 border border-slate-200 bg-white text-slate-700 font-semibold rounded-xl shadow-sm hover:bg-slate-50">
                      戻る
                    </button>
                    <button onClick={generateMenuWithAI} disabled={!isCustomFormValid() || customIsGenerating || isCustomGenerationDisabled} className="px-8 py-4 bg-gradient-to-r from-cyan-500 to-teal-500 text-white font-bold rounded-2xl shadow-lg shadow-cyan-500/25 hover:from-cyan-600 hover:to-teal-600 disabled:from-slate-400 disabled:to-slate-400 disabled:cursor-not-allowed transition-all" title={customGenerationDisabledTitle}>
                      {customIsGenerating ? '生成中...' : 'AIでメニューを生成'}
                    </button>
                    {/* 残り回数表示 */}
                    {IS_DEMO_PERIOD ? (
                      <span className="text-xs text-slate-400">デモ期間中 · 無制限</span>
                    ) : usageStatus.isLimitReached ? (
                      <Link href="/mypage/subscription" className="text-xs text-amber-600 font-semibold underline underline-offset-2">
                        上限に達しました · プランを確認
                      </Link>
                    ) : usageStatus.remaining !== null ? (
                      <span className="text-xs text-slate-400">
                        残り {usageStatus.remaining} 回
                        {usageStatus.planId === 'free' ? '（累計）' : '（今月）'}
                      </span>
                    ) : null}
                  </div>
                  {MAINTENANCE_MODE && (
                    <p className="mt-3 text-sm text-amber-700">
                      カスタム生成は本リリース準備中です。クイック生成の画面確認はこのまま行えます。
                    </p>
                  )}
                </>
              )}

              {!MAINTENANCE_MODE && openaiConfigured === false && (
                <p className="mt-4 text-sm text-amber-700">
                  OpenAI APIが未設定のため、カスタム生成は現在利用できません。
                  {(openaiReason === 'placeholder' && ' OPENAI_API_KEYを本番用のキーに差し替えてください。') || (openaiReason === 'missing' && ' OPENAI_API_KEYを設定してください。') || ' OPENAI_API_KEYを確認してください。'}
                </p>
              )}
            </>
          )}
        </div>
        </>
        )}

        {/* カスタム生成中：ローディング */}
        {customIsGenerating && (
          <div className="generate-loading-in fixed inset-0 z-50 flex items-center justify-center overflow-hidden">
            {/* 背景：水をイメージしたグラデーション + 波パターン */}
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-100 via-teal-50 to-sky-100" aria-hidden />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_110%_70%_at_50%_20%,rgba(6,182,212,0.18),transparent_50%)]" aria-hidden />
            <div className="generate-loading-waves absolute inset-0 opacity-[0.15]" aria-hidden />
            <div className="relative flex flex-col items-center gap-8 px-6 py-8">
              {/* 水の雫風オーブ + 回転リング（泳ぎを連想する流線） */}
              <div className="relative flex items-center justify-center -mt-2">
                <svg className="generate-loading-ring h-24 w-24 md:h-28 md:w-28 text-cyan-400/70" viewBox="0 0 64 64" fill="none">
                  <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="100 76" className="generate-loading-ring-dash" />
                </svg>
                <div className="generate-loading-orb absolute h-9 w-9 md:h-11 md:w-11 rounded-full bg-gradient-to-br from-cyan-400 via-teal-400 to-teal-500 shadow-xl shadow-cyan-500/35 ring-4 ring-cyan-200/40" />
              </div>
              <div className="text-center space-y-1.5">
                <p className="generate-loading-wave text-slate-700 font-mono font-semibold tracking-widest text-base md:text-lg lowercase">
                  {LOADING_MESSAGES[loadingMessageIndex]}
                </p>
                <p className="text-slate-400 text-xs tracking-widest uppercase">generating your menu</p>
              </div>
              {/* ステップドット */}
              <div className="flex items-center gap-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <span
                    key={i}
                    className="generate-loading-pill h-1.5 rounded-full bg-cyan-400/60"
                    style={{ width: i === loadingMessageIndex ? '2rem' : '0.375rem', transition: 'width 0.4s ease', opacity: i === loadingMessageIndex ? 1 : 0.3 }}
                  />
                ))}
              </div>
              {/* プログレスバー */}
              <div className="w-full max-w-[280px] h-1.5 overflow-hidden rounded-full bg-cyan-100/90 shadow-inner">
                <div className="generate-loading-progress h-full w-1/3 rounded-full bg-gradient-to-r from-transparent via-cyan-500 to-teal-500 shadow-sm" />
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
                  onClick={() => handleDownloadPDF('menu-capture')}
                  disabled={isExporting}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 text-white hover:from-cyan-600 hover:to-teal-600 disabled:opacity-50 font-semibold text-sm shadow-lg shadow-cyan-500/25 transition-all"
                >
                  {isExporting ? 'PDF生成中...' : 'PDF保存'}
                </button>
                <button
                  type="button"
                  onClick={handleCopyText}
                  className="px-4 py-2 rounded-xl border-2 border-slate-200 bg-white text-slate-700 hover:border-cyan-300 hover:text-cyan-700 font-semibold text-sm transition-all"
                >
                  {copyDone ? '✓ コピー済み' : 'テキストコピー'}
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
            {/* コーチに相談する導線 */}
            <div className="mt-4 p-4 rounded-2xl bg-gradient-to-r from-cyan-50 to-teal-50 border border-cyan-200/60 flex items-center justify-between gap-4 no-print">
              <div>
                <p className="text-sm font-bold text-slate-800">このメニューについてコーチに相談する</p>
                <p className="text-xs text-slate-500 mt-0.5">目標設定・強度調整など、無料でご相談いただけます</p>
              </div>
              <Link
                href="/mypage/counseling"
                className="shrink-0 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 text-white text-xs font-bold shadow-lg shadow-cyan-500/20 hover:from-cyan-400 hover:to-teal-400 transition-all"
              >
                無料相談
              </Link>
            </div>

            <div className="flex flex-wrap justify-center gap-3 pt-6 pb-2 no-print">
              {/* 同じ条件で再生成（カスタムのみ） */}
              {resultSource === 'custom' && mode === 'custom' && (
                <button
                  type="button"
                  onClick={() => {
                    setResult(null);
                    setApiMenuText(null);
                    generateMenuWithAI();
                  }}
                  disabled={customIsGenerating}
                  className="px-6 py-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-teal-500 text-white font-semibold hover:from-cyan-600 hover:to-teal-600 disabled:opacity-50 shadow-lg shadow-cyan-500/25 transition-all"
                >
                  この条件で再生成
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setShowForm(true);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="px-6 py-3 rounded-2xl border-2 border-slate-200 bg-white text-slate-700 font-semibold hover:bg-cyan-50 hover:border-cyan-200 focus:outline-none focus:ring-2 focus:ring-cyan-400/30 transition-all shadow-sm"
              >
                条件を変えて作り直す
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
