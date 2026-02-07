'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import {
  generateTrainingMenu,
  type TrainingInput,
  type TrainingResult,
} from '@/lib/rt/generator';
import { useViewMode } from './viewMode';
import { MenuSheet } from '@/components/MenuSheet';

const SAVED_INPUT_KEY_PREFIX = 'rt-swimlab-saved-input';

function savedInputKey(userId: string): string {
  return `${SAVED_INPUT_KEY_PREFIX}-${userId}`;
}

const EMPTY_INPUT: TrainingInput = {
  period: '',
  stroke: '',
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

  const [result, setResult] = useState<TrainingResult | null>(null);
  const [apiMenuText, setApiMenuText] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [openaiConfigured, setOpenaiConfigured] = useState<boolean | null>(null);
  const [openaiReason, setOpenaiReason] = useState<string | undefined>(undefined);

  // ログインユーザーごとに前回入力を復元（個々の形・2回目以降）
  const userKey = session?.user?.email ?? session?.user?.id ?? '';
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

  useEffect(() => {
    fetch('/api/generate-menu')
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
  };

  const isFormValid = () => {
    return Object.values(input).every((v) => (v ?? '') !== '');
  };

  const generateMenuWithAI = async () => {
    setIsGenerating(true);
    setApiError(null);
    setApiMenuText(null);
    setResult(null);
    try {
      const res = await fetch('/api/generate-menu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      const text = await res.text();
      let data: { error?: string; missingItems?: string[]; result?: unknown; menu?: string };
      try {
        data = JSON.parse(text);
      } catch {
        setApiError(res.status === 401 ? 'ログインが必要です。' : 'メニュー生成に失敗しました。');
        return;
      }
      if (!res.ok) {
        const msg = data.missingItems?.length
          ? `${data.error || '入力が不足しています'}\n不足項目: ${data.missingItems.join('、')}`
          : (data.error || 'メニュー生成に失敗しました');
        setApiError(msg);
        return;
      }
      if (data.result && typeof data.result === 'object') {
        setResult(data.result as TrainingResult);
        setApiMenuText(null);
      } else {
        setResult(null);
        setApiMenuText(data.menu ?? '');
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'メニュー生成に失敗しました';
      setApiError(msg.startsWith('Unexpected token') ? 'ログインが必要です。' : msg);
    } finally {
      setIsGenerating(false);
    }
  };

  const generateMenuLocal = async () => {
    setApiMenuText(null);
    setApiError(null);
    let common = '';
    let local = '';
    let quickAlgorithm = '';
    try {
      const res = await fetch('/api/content');
      const text = await res.text();
      if (res.ok) {
        try {
          const data = JSON.parse(text) as { common?: string; local?: string; quickAlgorithm?: string };
          common = data.common ?? '';
          local = data.local ?? '';
          quickAlgorithm = data.quickAlgorithm ?? '';
        } catch {
          /* HTML 等が返った場合は空のまま */
        }
      }
    } catch {
      /* コンテンツ取得失敗時は空のままクイック作成 */
    }
    const r = generateTrainingMenu(input, {
      commonContent: common,
      localContent: local,
      quickAlgorithmContent: quickAlgorithm,
    });
    setResult(r);
  };

  const exportPDFBlob = async (): Promise<Blob> => {
    const el = document.getElementById('menu-capture');
    if (!el) throw new Error('PDF化する要素が見つかりません');

    setIsExporting(true);
    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
      ]);

      el.scrollIntoView({ behavior: 'auto', block: 'start' });
      await new Promise((r) => setTimeout(r, 150));

      const opts = {
        scale: 1.5,
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
      }

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let remaining = imgHeight;
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      remaining -= pageHeight;

      while (remaining > 0) {
        pdf.addPage();
        const y = -(imgHeight - remaining);
        pdf.addImage(imgData, 'PNG', 0, y, imgWidth, imgHeight);
        remaining -= pageHeight;
      }

      return pdf.output('blob') as Blob;
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadPDF = async () => {
    try {
      const blob = await exportPDFBlob();
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

  const handleSharePDF = async () => {
    try {
      const blob = await exportPDFBlob();
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
        await handleDownloadPDF();
      }
    } catch (e) {
      if ((e as Error)?.name === 'AbortError') return; // ユーザーが共有をキャンセル
      console.error(e);
      try {
        await handleDownloadPDF();
      } catch {
        alert('共有・PDF出力に失敗しました。もう一度お試しください。');
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        <header className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            RT swim lab
          </h1>
          <p className="text-gray-600">立石諒と高城直基が監修の指導哲学に基づく練習メニュー</p>
        </header>

        {/* 入力 */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">入力（必須10項目）</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 1. 期 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">1. 期</label>
              <select
                value={input.period}
                onChange={(e) => handleInputChange('period', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">選択してください</option>
                <option value="1">① リカバリー期</option>
                <option value="2">② 基礎形成期</option>
                <option value="3">③ 発展形成期</option>
                <option value="4">④ 強化期①</option>
                <option value="5">⑤ 強化期②</option>
                <option value="6">⑥ 調整期</option>
                <option value="7">⑦ テーパー期</option>
              </select>
            </div>

            {/* 2. 種目 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">2. 種目</label>
              <select
                value={input.stroke}
                onChange={(e) => handleInputChange('stroke', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">選択してください</option>
                <option value="Fr">Fr（自由形）</option>
                <option value="Ba">Ba（背泳ぎ）</option>
                <option value="Br">Br（平泳ぎ）</option>
                <option value="Fly">Fly（バタフライ）</option>
                <option value="IM">IM（個人メドレー）</option>
              </select>
            </div>

            {/* 3. 性別 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">3. 性別</label>
              <select
                value={input.gender}
                onChange={(e) => handleInputChange('gender', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">選択してください</option>
                <option value="男">男</option>
                <option value="女">女</option>
              </select>
            </div>

            {/* 4. 年齢（スクロール選択で入力エラーを防止） */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">4. 年齢</label>
              <select
                value={input.age}
                onChange={(e) => handleInputChange('age', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              <label className="block text-sm font-medium text-gray-700 mb-1">5. 距離タイプ</label>
              <select
                value={input.distanceType}
                onChange={(e) => handleInputChange('distanceType', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">選択してください</option>
                <option value="S">S（スプリント）</option>
                <option value="M">M（ミドル）</option>
                <option value="D">D（ディスタンス）</option>
              </select>
            </div>

            {/* 6. レベル */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">6. レベル</label>
              <select
                value={input.level}
                onChange={(e) => handleInputChange('level', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              <label className="block text-sm font-medium text-gray-700 mb-1">7. 目的</label>
              <select
                value={input.purpose}
                onChange={(e) => handleInputChange('purpose', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              <label className="block text-sm font-medium text-gray-700 mb-1">8. 状況</label>
              <select
                value={input.condition}
                onChange={(e) => handleInputChange('condition', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              <label className="block text-sm font-medium text-gray-700 mb-1">9. 練習時間</label>
              <select
                value={input.practiceTime}
                onChange={(e) => handleInputChange('practiceTime', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">選択してください</option>
                <option value="60">60分</option>
                <option value="90">90分</option>
                <option value="120">120分</option>
              </select>
            </div>

            {/* 10. ボリュームを上げたい項目 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                10. ボリュームを上げたい項目
              </label>
              <select
                value={input.volumeUp}
                onChange={(e) => handleInputChange('volumeUp', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">選択してください</option>
                <option value="ドリル">ドリル</option>
                <option value="キック">キック</option>
                <option value="プル">プル</option>
                <option value="プレメイン">プレメイン</option>
                <option value="メイン">メイン</option>
              </select>
            </div>
          </div>

          {/* API状態: 利用可能かどうか表示 */}
          {openaiConfigured !== null && (
            <p className="mt-2 text-sm text-gray-600">
              {openaiConfigured ? (
                <span className="text-green-700">OpenAI API: 利用可能（カスタム作成が使えます）</span>
              ) : (
                <span className="text-amber-700">
                  OpenAI API: 未設定（
                  {(openaiReason === 'placeholder' && '.env.local の OPENAI_API_KEY を本物のキーに差し替え、サーバーを再起動してください') ||
                    (openaiReason === 'missing' && '.env.local に OPENAI_API_KEY= を追加し、サーバーを再起動してください') ||
                    '.env.local の OPENAI_API_KEY を設定し、サーバーを再起動してください'}
                  ）
                </span>
              )}
            </p>
          )}

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={generateMenuWithAI}
              disabled={!isFormValid() || isGenerating}
              className="w-full md:w-auto px-6 py-3 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isGenerating ? '生成中...' : 'カスタム作成'}
            </button>
            <button
              onClick={generateMenuLocal}
              disabled={!isFormValid()}
              className="w-full md:w-auto px-6 py-3 border border-gray-300 bg-white text-gray-700 font-semibold rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              クイック作成
            </button>
          </div>
        </div>

        {/* 出力 */}
        {apiError && (
          <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4 mb-4">
            {apiError}
          </div>
        )}
        {(apiMenuText || result) && (
          <div className="space-y-4">
            {/* ツールバー: 表示切替（構造化データ時） + PDF/共有 */}
            <div className="bg-white rounded-lg shadow-md p-4 flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
              <div className="flex items-center gap-2 flex-wrap">
                {result && (
                  <>
                    <span className="text-sm text-gray-600">表示:</span>
                    <button
                      onClick={() => setViewMode('table')}
                      className={`px-3 py-1 rounded-md border text-sm ${
                        viewMode === 'table'
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-gray-700 border-gray-300'
                      }`}
                    >
                      テーブル
                    </button>
                    <button
                      onClick={() => setViewMode('card')}
                      className={`px-3 py-1 rounded-md border text-sm ${
                        viewMode === 'card'
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-gray-700 border-gray-300'
                      }`}
                    >
                      カード
                    </button>
                  </>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleDownloadPDF}
                  disabled={isExporting}
                  className="px-4 py-2 rounded-md border border-gray-300 bg-white hover:bg-gray-50 text-gray-900 disabled:opacity-50"
                >
                  {isExporting ? 'PDF生成中...' : 'PDFダウンロード'}
                </button>
                <button
                  onClick={handleSharePDF}
                  disabled={isExporting}
                  className="px-4 py-2 rounded-md bg-gray-900 text-white hover:bg-black disabled:opacity-50"
                >
                  {isExporting ? '共有準備中...' : '共有'}
                </button>
              </div>
            </div>

            {/* PDFキャプチャ対象 */}
            <div id="menu-capture" className="space-y-4">
              {apiMenuText ? (
                <div className="bg-white rounded-lg shadow-md p-6">
                  <pre className="whitespace-pre-wrap font-sans text-sm text-gray-800 leading-relaxed">
                    {apiMenuText}
                  </pre>
                </div>
              ) : result ? (
                viewMode === 'table' ? (
                  <div className="p-6">
                    <MenuSheet input={input} result={result} />
                  </div>
                ) : (
                  <div className="p-6">
                    <MenuSheet input={input} result={result} isCardView />
                  </div>
                )
              ) : null}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
