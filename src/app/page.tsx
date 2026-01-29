'use client';

import { useState } from 'react';
import { generateTrainingMenu, type TrainingInput, type TrainingResult } from '@/lib/rt/generator';
import { useViewMode } from './viewMode';
import { MenuSheet } from '@/components/MenuSheet';

export default function Home() {
  const { viewMode, setViewMode } = useViewMode();

  const [input, setInput] = useState<TrainingInput>({
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
  });

  const [result, setResult] = useState<TrainingResult | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleInputChange = (field: keyof TrainingInput, value: string) => {
    setInput((prev) => ({ ...prev, [field]: value }));
  };

  const isFormValid = () => {
    return Object.values(input).every((v) => (v ?? '') !== '');
  };

  const generateMenu = async () => {
    setIsGenerating(true);
    await new Promise((resolve) => setTimeout(resolve, 100));
    const r = generateTrainingMenu(input);
    setResult(r);
    setIsGenerating(false);
  };

  // PDF生成：menu-capture をキャプチャして PDF 化
  const exportPDFBlob = async (): Promise<Blob> => {
    const el = document.getElementById('menu-capture');
    if (!el) throw new Error('PDF化する要素が見つかりません');

    setIsExporting(true);
    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
      ]);

      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        scrollX: 0,
        scrollY: 0,
        windowWidth: el.scrollWidth,
        windowHeight: el.scrollHeight,
      });

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
      console.error(e);
      alert('PDF出力に失敗しました（コンソールを確認してください）');
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
        alert('共有・PDF出力に失敗しました（コンソールを確認してください）');
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

            {/* 4. 年齢 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">4. 年齢</label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={input.age}
                onChange={(e) =>
                  handleInputChange('age', e.target.value.replace(/[^0-9]/g, ''))
                }
                placeholder="例: 20"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
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
                <option value="A">A</option>
                <option value="B">B</option>
                <option value="C">C</option>
                <option value="D">D</option>
                <option value="M1">M1（記録狙い）</option>
                <option value="M2">M2（大会出場）</option>
                <option value="M3">M3（泳力向上）</option>
                <option value="M4">M4（健康志向）</option>
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
                <option value="通常">通常</option>
                <option value="疲労">疲労</option>
                <option value="調整">調整</option>
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

          <div className="mt-6">
            <button
              onClick={generateMenu}
              disabled={!isFormValid() || isGenerating}
              className="w-full md:w-auto px-6 py-3 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isGenerating ? '生成中...' : 'メニュー生成'}
            </button>
          </div>
        </div>

        {/* 出力 */}
        {result && (
          <div className="space-y-4">
            {/* ✅ 表示切替 + PDF/共有 */}
            <div className="bg-white rounded-lg shadow-md p-4 flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
              <div className="flex items-center gap-2 flex-wrap">
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

            {/* ✅ PDFキャプチャ対象（ここだけPDFになる） */}
            <div id="menu-capture" className="space-y-4">
              {/* テーブル表示 */}
              {viewMode === 'table' ? (
                <div className="p-6">
                  <MenuSheet input={input} result={result} />
                </div>
              ) : (
                /* カード表示（同じ内容をカード形式で） */
                <div className="p-6">
                  <MenuSheet input={input} result={result} isCardView />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
