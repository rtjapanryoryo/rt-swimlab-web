'use client';

import { useMemo, useState } from 'react';
import { generateTrainingMenu, type TrainingInput, type TrainingResult } from '@/lib/rt/generator';
import { useViewMode } from './viewMode';

type MenuRow = {
  type: string;        // タイプ（W-up, ドリル, キックなど）
  distance: string;    // 距離（m）
  sets: string;        // 本数
  setCount: string;    // セット数
  cycle: string;       // サイクル（間隔）
  content: string;     // 内容
  power: string;       // 強度
  total: string;       // Total（合計距離）
};

function normalizeDash(v?: string | null) {
  const s = (v ?? '').trim();
  return s.length ? s : '-';
}

function parseToRow(label: string, raw: string): MenuRow {
  const text = (raw ?? '').trim();

  let type = label;
  let distance = '-';
  let sets = '-';
  let setCount = '-';
  let cycle = '-';
  let power = '-';
  let total = '-';

  // 強度を抽出
  const powerMatch = text.match(/\((A1|A2|EN1|EN2|EN3|EN4|AN1|AN2|AN3|AN)\)/i);
  if (powerMatch?.[1]) power = powerMatch[1].toUpperCase();

  // スタイル（FR/Ba/Br/Fly/IM/S/K/P）を抽出
  const styleMatch = text.match(/\b(FR|Fr|Ba|Br|Fly|IM|S|K|P)\b/);
  const style = styleMatch?.[1] || '-';

  // 距離を抽出（例: 200m, 50m）
  const distMatch = text.match(/(\d+)\s*m/);
  if (distMatch?.[1]) distance = distMatch[1];

  // 本数×距離のパターンを抽出（例: 4×50m → sets=4, distance=50）
  const setsDistMatch = text.match(/(\d+)\s*[×x]\s*(\d+)\s*m/);
  if (setsDistMatch) {
    sets = setsDistMatch[1];
    if (!distMatch) distance = setsDistMatch[2]; // 距離がまだ設定されていない場合
    setCount = setsDistMatch[1];
  }

  // セット数のみ（例: 8×100m → setCount=8）
  const setOnlyMatch = text.match(/(\d+)\s*[×x]/);
  if (setOnlyMatch && !setsDistMatch) {
    setCount = setOnlyMatch[1];
  }

  // サイクル（間隔）を抽出
  const timeMatch = text.match(/\b(\d{2}:\d{2})\b/);
  if (timeMatch?.[1]) {
    cycle = timeMatch[1];
  } else {
    const atMatch = text.match(/@(\d+)\s*秒/);
    if (atMatch?.[1]) cycle = `${atMatch[1]}秒`;
  }

  // Total計算（距離 × セット数）
  if (distance !== '-' && setCount !== '-') {
    const dist = parseInt(distance, 10);
    const count = parseInt(setCount, 10);
    if (!isNaN(dist) && !isNaN(count)) {
      total = `${(dist * count).toLocaleString()}m`;
    } else if (distance !== '-') {
      total = distance + 'm';
    }
  } else if (distance !== '-') {
    total = distance + 'm';
  }

  // 内容（元のテキストを保持、ただし簡潔に）
  let content = text;
  // 強度表記とサイクル表記は残すが、見やすく整理
  content = content.trim();

  return {
    type: normalizeDash(type),
    distance: normalizeDash(distance),
    sets: normalizeDash(sets),
    setCount: normalizeDash(setCount),
    cycle: normalizeDash(cycle),
    content: normalizeDash(content),
    power: normalizeDash(power),
    total: normalizeDash(total),
  };
}

/** ✅ カード表示（スマホ向け） */
function MenuCard({ row }: { row: MenuRow }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const contentTruncated = row.content.length > 40 && !isExpanded;

  return (
    <div
      className="app-card p-4 cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => setIsExpanded(!isExpanded)}
    >
      {/* (1) タイプ */}
      <div className="font-semibold text-gray-900 text-sm mb-2">{row.type}</div>

      {/* (2) 距離・本数・セット数・サイクル（横並び） */}
      <div className="flex items-center flex-wrap gap-2 mb-2 text-xs text-gray-600">
        {row.distance !== '-' && (
          <span className="tabular-nums">距離: {row.distance}m</span>
        )}
        {row.sets !== '-' && (
          <span className="tabular-nums">本数: {row.sets}</span>
        )}
        {row.setCount !== '-' && (
          <span className="tabular-nums">セット: {row.setCount}</span>
        )}
        {row.cycle !== '-' && (
          <span>サイクル: {row.cycle}</span>
        )}
      </div>

      {/* (3) 内容（メイン） */}
      <div className="mt-2 text-gray-700 text-sm leading-relaxed">
        {contentTruncated ? (
          <>
            {row.content.substring(0, 40)}...
            <span className="text-blue-600 text-xs ml-1">タップで全文表示</span>
          </>
        ) : (
          row.content
        )}
      </div>

      {/* (4) 強度 と Total（最下段に横並び） */}
      <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
        {row.power !== '-' && (
          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700">
            {row.power}
          </span>
        )}
        {row.total !== '-' && (
          <span className="text-xs text-gray-600 font-semibold tabular-nums">
            Total: {row.total}
          </span>
        )}
      </div>
    </div>
  );
}

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
    circleMethod: '',
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

  const tableRows: MenuRow[] = useMemo(() => {
    if (!result) return [];
    const rows: MenuRow[] = [];
    rows.push(parseToRow('W-up', result.warmUp));
    rows.push(parseToRow('ドリル', result.drill));
    rows.push(parseToRow('キック', result.kick));
    rows.push(parseToRow('プル', result.pull));
    rows.push(parseToRow('プレメイン', result.preMain));
    if (result.rest) rows.push(parseToRow('休憩', result.rest));
    rows.push(parseToRow('メイン', result.main));
    rows.push(parseToRow('下', result.down));
    return rows;
  }, [result]);

  // ✅ PDF生成：対象エリアだけキャプチャしてPDF化
  const exportPDFBlob = async (): Promise<Blob> => {
    const el = document.getElementById('menu-capture');
    if (!el) throw new Error('PDF化する要素が見つかりません');

    setIsExporting(true);

    const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
      import('html2canvas'),
      import('jspdf'),
    ]);

    const canvas = await html2canvas(el, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
    });

    const imgData = canvas.toDataURL('image/png');

    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let y = 0;
    let remaining = imgHeight;

    pdf.addImage(imgData, 'PNG', 0, y, imgWidth, imgHeight);
    remaining -= pageHeight;

    while (remaining > 0) {
      pdf.addPage();
      y = -(imgHeight - remaining);
      pdf.addImage(imgData, 'PNG', 0, y, imgWidth, imgHeight);
      remaining -= pageHeight;
    }

    const blob = pdf.output('blob') as Blob;
    setIsExporting(false);
    return blob;
  };

  const handleDownloadPDF = async () => {
    try {
      const blob = await exportPDFBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `RT-menu_${new Date().toISOString().slice(0, 10)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      alert('PDF出力に失敗しました（コンソールを確認してください）');
      setIsExporting(false);
    }
  };

  const handleSharePDF = async () => {
    try {
      const blob = await exportPDFBlob();

      const file = new File([blob], `RT-menu_${new Date().toISOString().slice(0, 10)}.pdf`, {
        type: 'application/pdf',
      });

      const nav = navigator as any;
      if (nav.share && nav.canShare?.({ files: [file] })) {
        await nav.share({
          title: 'RT-japan 練習メニュー',
          text: '今日の練習メニューPDFです',
          files: [file],
        });
      } else {
        await handleDownloadPDF();
      }
    } catch (e) {
      console.error(e);
      alert('共有に失敗しました（コンソールを確認してください）');
      setIsExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        <header className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            RT-japan 水泳練習メニュー自動生成
          </h1>
          <p className="text-gray-600">立石諒が監修の指導哲学に基づく練習メニュー</p>
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
                type="number"
                inputMode="numeric"
                min="1"
                max="120"
                value={input.age}
                onChange={(e) => handleInputChange('age', e.target.value)}
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

            {/* 10. サークル記入方法 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                10. サークル記入方法
              </label>
              <select
                value={input.circleMethod}
                onChange={(e) => handleInputChange('circleMethod', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">選択してください</option>
                <option value="1">① すべてにサークルを入れる</option>
                <option value="2">② 必要なところだけ入れる（推奨）</option>
                <option value="3">③ サークルはいらない</option>
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
              <div className="flex items-center gap-2">
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
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">【目的】</h2>
                <p className="text-gray-700">{result.purpose}</p>
              </div>

              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">トレーニング内容</h2>

                {/* ✅ 表示モードで切替 */}
                {viewMode === 'table' ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-left border-collapse text-[11px]">
                      <thead>
                        <tr className="text-gray-600 border-b bg-gray-50">
                          <th className="py-2 px-2 font-semibold text-left whitespace-nowrap">タイプ</th>
                          <th className="py-2 px-2 font-semibold text-right whitespace-nowrap tabular-nums w-16">距離</th>
                          <th className="py-2 px-2 font-semibold text-right whitespace-nowrap tabular-nums w-12">本数</th>
                          <th className="py-2 px-2 font-semibold text-right whitespace-nowrap tabular-nums w-16">セット数</th>
                          <th className="py-2 px-2 font-semibold text-center whitespace-nowrap w-20">サイクル</th>
                          <th className="py-2 px-2 font-semibold text-left min-w-[200px]">内容</th>
                          <th className="py-2 px-2 font-semibold text-center whitespace-nowrap w-16">強度</th>
                          <th className="py-2 px-2 font-semibold text-right whitespace-nowrap tabular-nums w-20">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tableRows.map((r, idx) => (
                          <tr key={idx} className="border-b last:border-b-0 hover:bg-gray-50">
                            <td className="py-2 px-2 font-semibold text-gray-900 whitespace-nowrap">{r.type}</td>
                            <td className="py-2 px-2 text-gray-700 text-right tabular-nums whitespace-nowrap">
                              {r.distance !== '-' ? `${r.distance}m` : '-'}
                            </td>
                            <td className="py-2 px-2 text-gray-700 text-right tabular-nums whitespace-nowrap">{r.sets}</td>
                            <td className="py-2 px-2 text-gray-700 text-right tabular-nums whitespace-nowrap">{r.setCount}</td>
                            <td className="py-2 px-2 text-gray-700 text-center whitespace-nowrap">{r.cycle}</td>
                            <td className="py-2 px-2 text-gray-700">
                              <div className="truncate max-w-[200px]" title={r.content}>
                                {r.content}
                              </div>
                            </td>
                            <td className="py-2 px-2 text-gray-900 text-center whitespace-nowrap">
                              {r.power !== '-' && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100">
                                  {r.power}
                                </span>
                              )}
                            </td>
                            <td className="py-2 px-2 text-gray-700 text-right tabular-nums whitespace-nowrap font-semibold">
                              {r.total}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3">
                    {tableRows.map((r, idx) => (
                      <MenuCard key={idx} row={r} />
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">総距離</h2>
                <p className="text-gray-700">{result.total}</p>
              </div>

              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">詳細情報</h2>
                <div className="space-y-3">
                  <div>
                    <span className="font-medium text-gray-700">練習意図: </span>
                    <span className="text-gray-600">{result.intention}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">指導ポイント: </span>
                    <span className="text-gray-600">{result.coachingPoint}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">注意点: </span>
                    <span className="text-gray-600">{result.caution}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">期待される効果: </span>
                    <span className="text-gray-600">{result.expectedEffect}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
