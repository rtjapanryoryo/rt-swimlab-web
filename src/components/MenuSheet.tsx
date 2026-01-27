'use client';

import { useMemo } from 'react';
import type { TrainingInput, TrainingResult } from '@/lib/rt/generator';

type MenuSheetRow = {
  section: string;
  distance: string;
  count: string;
  sets: string;
  intensity: string;
  style: string;
  content: string;
  total: string;
  cycle: string;
};

function normalizeDash(v?: string | null) {
  const s = (v ?? '').trim();
  return s.length ? s : '-';
}

export function parseToSheetRow(section: string, raw: string): MenuSheetRow {
  const text = (raw ?? '').trim();
  if (!text) {
    return {
      section,
      distance: '-',
      count: '-',
      sets: '1',
      intensity: '-',
      style: '-',
      content: '-',
      total: '-',
      cycle: '-',
    };
  }

  let distance = '-';
  let count = '-';
  let sets = '1';
  let cycle = '-';
  let intensity = '-';
  let style = '-';
  let equipment = '-';
  let content = text;
  let total = '-';

  // 強度を抽出（A1, EN1, EN2, EN3, AN1, AN2など）→ 凡例番号（①〜⑦）にマッピング
  // 強度コードのパターンを明示的に指定（大文字小文字を区別しない）
  const intensityPatterns = [
    /\(AN1\)/i,
    /\(AN2\)/i,
    /\(AN3\)/i,
    /\(AN\)/i,
    /\(EN1\)/i,
    /\(EN2\)/i,
    /\(EN3\)/i,
    /\(EN4\)/i,
    /\(A1\)/i,
    /\(A2\)/i,
  ];
  
  // 強度コードから凡例番号へのマッピング
  const intensityToLegendMap: Record<string, string> = {
    A1: '①', // HR~120 (Easy, Relax formなど)
    A2: '①', // HR~120 (Easy, Relax formなど)
    EN1: '②', // HR120~140 (EN1)
    EN2: '③', // HR140~160 (EN2)
    EN3: '④', // HR160~180 (EN3)
    EN4: '④', // HR160~180 (EN3相当)
    AN1: '⑤', // HR Max (AN1 耐乳酸)
    AN2: '⑥', // HR Max (AN2 乳酸生成)
    AN3: '⑦', // パワーやスピードなど
    AN: '⑦', // パワーやスピードなど
  };
  
  // 各パターンを順にチェック
  for (const pattern of intensityPatterns) {
    const match = text.match(pattern);
    if (match) {
      // 括弧を除いた強度コードを抽出
      const code = match[0].replace(/[()]/g, '').toUpperCase();
      if (intensityToLegendMap[code]) {
        intensity = intensityToLegendMap[code];
        break;
      }
    }
  }

  // 種目/スタイルを抽出
  const styleMatch = text.match(/\b(FR|Fr|Ba|Br|Fly|IM|S|K|P)\b/);
  if (styleMatch?.[1]) {
    const styleCode = styleMatch[1].toUpperCase();
    const styleMap: Record<string, string> = {
      FR: 'FR',
      Fr: 'FR',
      Ba: 'Ba',
      Br: 'Br',
      Fly: 'Fly',
      IM: 'IM',
      S: 'Swim',
      K: 'Kick',
      P: 'Pull',
    };
    style = styleMap[styleCode] || styleCode;
  }

  // 距離を抽出（例: 200m, 50m）
  const distMatch = text.match(/(\d+)\s*m/);
  if (distMatch?.[1]) distance = distMatch[1];

  // 本数×距離のパターンを抽出（例: 4×50m → count=4, distance=50）
  const countDistMatch = text.match(/(\d+)\s*[×x]\s*(\d+)\s*m/);
  if (countDistMatch) {
    count = countDistMatch[1];
    if (!distMatch) distance = countDistMatch[2];
  }

  // セット数のみ（例: 8×100m → sets=8）
  const setOnlyMatch = text.match(/(\d+)\s*[×x]/);
  if (setOnlyMatch && !countDistMatch) {
    sets = setOnlyMatch[1];
  }

  // サイクル（間隔）を抽出
  const timeMatch = text.match(/\b(\d{2}:\d{2})\b/);
  if (timeMatch?.[1]) {
    cycle = timeMatch[1];
  } else {
    const atMatch = text.match(/@(\d+)\s*秒/);
    if (atMatch?.[1]) cycle = `${atMatch[1]}秒`;
    const restMatch = text.match(/(\d+)\s*秒\s*レスト/);
    if (restMatch?.[1]) cycle = `${restMatch[1]}秒`;
  }

  // 器具を抽出
  const equipmentPatterns = [
    { pattern: /(ボード|board)/i, value: 'ボード' },
    { pattern: /(プルブイ|pull|buoy)/i, value: 'プルブイ' },
    { pattern: /(フィン|fin)/i, value: 'フィン' },
    { pattern: /(パドル|paddle)/i, value: 'パドル' },
    { pattern: /(No\s*board|ボードなし)/i, value: 'ボードなし' },
  ];
  for (const { pattern, value } of equipmentPatterns) {
    if (pattern.test(text)) {
      equipment = value;
      break;
    }
  }

  // 内容を簡潔に（強度表記のみを削除、他の括弧内テキストは残す、器具情報を含める）
  // 強度表記のみを削除（A1, A2, EN1, EN2, EN3, EN4, AN1, AN2, AN3, AN）
  const intensityCodesToRemove = ['AN1', 'AN2', 'AN3', 'AN', 'EN1', 'EN2', 'EN3', 'EN4', 'A1', 'A2'];
  content = text;
  
  // 各強度コードを削除（大文字小文字を区別しない）
  for (const code of intensityCodesToRemove) {
    const pattern = new RegExp(`\\(${code}\\)`, 'gi');
    content = content.replace(pattern, '');
  }
  
  // その他のクリーンアップ
  content = content
    .replace(/\s*@\d+\s*秒\s*/g, '') // サイクル表記を削除
    .replace(/\s*\d{2}:\d{2}\s*/g, '') // 時間表記を削除
    .replace(/\s+/g, ' ') // 連続する空白を1つに
    .trim();
  
  // 器具情報を内容に追加
  if (equipment !== '-') {
    content = `${content}（${equipment}）`;
  }
  
  if (content.length > 60) {
    content = content.substring(0, 60) + '...';
  }
  if (!content) content = '-';

  // Total計算（距離 × 本数 × セット）
  if (distance !== '-' && count !== '-') {
    const dist = parseInt(distance, 10);
    const cnt = parseInt(count, 10);
    const setNum = parseInt(sets, 10);
    if (!isNaN(dist) && !isNaN(cnt)) {
      const totalDist = dist * cnt * (isNaN(setNum) ? 1 : setNum);
      total = `${totalDist.toLocaleString()}m`;
    } else if (distance !== '-') {
      total = distance + 'm';
    }
  } else if (distance !== '-') {
    total = distance + 'm';
  }

  return {
    section: normalizeDash(section),
    distance: normalizeDash(distance),
    count: normalizeDash(count),
    sets: normalizeDash(sets),
    intensity: normalizeDash(intensity),
    style: normalizeDash(style),
    content: normalizeDash(content),
    total: normalizeDash(total),
    cycle: normalizeDash(cycle),
  };
}

type MenuSheetProps = {
  input: TrainingInput;
  result: TrainingResult;
  isCardView?: boolean;
};

export function MenuSheet({ input, result, isCardView = false }: MenuSheetProps) {
  const rows: MenuSheetRow[] = useMemo(() => {
    const sheetRows: MenuSheetRow[] = [];
    sheetRows.push(parseToSheetRow('W-up', result.warmUp));
    sheetRows.push(parseToSheetRow('ドリル', result.drill));
    sheetRows.push(parseToSheetRow('キック', result.kick));
    sheetRows.push(parseToSheetRow('プル', result.pull));
    sheetRows.push(parseToSheetRow('プレメイン', result.preMain));
    if (result.rest) sheetRows.push(parseToSheetRow('休憩', result.rest));
    sheetRows.push(parseToSheetRow('メイン', result.main));
    sheetRows.push(parseToSheetRow('Down', result.down));
    return sheetRows;
  }, [result]);

  // 日付を取得
  const today = new Date();
  const dateStr = `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日`;
  const dayOfWeek = ['日', '月', '火', '水', '木', '金', '土'][today.getDay()];

  // 期の表示名
  const periodNames: Record<string, string> = {
    '1': '① リカバリー期',
    '2': '② 基礎形成期',
    '3': '③ 発展形成期',
    '4': '④ 強化期①',
    '5': '⑤ 強化期②',
    '6': '⑥ 調整期',
    '7': '⑦ テーパー期',
  };

  // 種目の表示名
  const strokeNames: Record<string, string> = {
    Fr: 'Fr（自由形）',
    Ba: 'Ba（背泳ぎ）',
    Br: 'Br（平泳ぎ）',
    Fly: 'Fly（バタフライ）',
    IM: 'IM（個人メドレー）',
  };

  // 距離タイプの表示名
  const distanceTypeNames: Record<string, string> = {
    S: 'S（スプリント）',
    M: 'M（ミドル）',
    D: 'D（ディスタンス）',
  };


  return (
    <div className="menu-sheet bg-white print-card">
      {/* ロゴ（任意） */}
      <div className="mb-4 print-only">
        <img
          src="/RT-japan_Logo.svg"
          alt="RT-japan"
          className="h-12 w-auto"
          style={{ maxWidth: '200px' }}
        />
      </div>

      {/* ヘッダー（基本情報） */}
      <div className="mb-6 border-b border-gray-300 pb-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="space-y-2">
            <div className="flex">
              <span className="font-semibold text-gray-700 w-24">日付:</span>
              <span className="text-gray-900">{dateStr}（{dayOfWeek}）</span>
            </div>
            <div className="flex">
              <span className="font-semibold text-gray-700 w-24">コーチ:</span>
              <span className="text-gray-900">RT-japan</span>
            </div>
            <div className="flex">
              <span className="font-semibold text-gray-700 w-24">期:</span>
              <span className="text-gray-900">{periodNames[input.period] || input.period}</span>
            </div>
            <div className="flex">
              <span className="font-semibold text-gray-700 w-24">種目:</span>
              <span className="text-gray-900">{strokeNames[input.stroke] || input.stroke}</span>
            </div>
            <div className="flex">
              <span className="font-semibold text-gray-700 w-24">性別:</span>
              <span className="text-gray-900">{input.gender}</span>
            </div>
            <div className="flex">
              <span className="font-semibold text-gray-700 w-24">年齢:</span>
              <span className="text-gray-900">{input.age}歳</span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex">
              <span className="font-semibold text-gray-700 w-24">距離タイプ:</span>
              <span className="text-gray-900">{distanceTypeNames[input.distanceType] || input.distanceType}</span>
            </div>
            <div className="flex">
              <span className="font-semibold text-gray-700 w-24">レベル:</span>
              <span className="text-gray-900">{input.level}</span>
            </div>
            <div className="flex">
              <span className="font-semibold text-gray-700 w-24">目的:</span>
              <span className="text-gray-900">{input.purpose}</span>
            </div>
            <div className="flex">
              <span className="font-semibold text-gray-700 w-24">状況:</span>
              <span className="text-gray-900">{input.condition}</span>
            </div>
            <div className="flex">
              <span className="font-semibold text-gray-700 w-24">練習時間:</span>
              <span className="text-gray-900">{input.practiceTime}分</span>
            </div>
            <div className="flex">
              <span className="font-semibold text-gray-700 w-24">ボリュームUP:</span>
              <span className="text-gray-900">{input.volumeUp || '-'}</span>
            </div>
            <div className="flex">
              <span className="font-semibold text-gray-700 w-24">器具:</span>
              <span className="text-gray-900">フィン/パドルカスタム自由</span>
            </div>
          </div>
        </div>
      </div>

      {/* 本文（メニュー） */}
      {isCardView ? (
        <div className="mb-6 grid grid-cols-1 gap-3">
          {rows.map((row, idx) => (
            <div key={idx} className="app-card p-4">
              <div className="flex items-center justify-between gap-3 mb-2">
                <div className="font-semibold text-gray-900 text-base">{row.section}</div>
                {row.total !== '-' && (
                  <div className="text-sm text-gray-600 font-medium">Total: {row.total}</div>
                )}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm mb-2">
                {row.distance !== '-' && (
                  <div>
                    <span className="text-gray-500">距離: </span>
                    <span className="text-gray-900 font-medium">{row.distance}m</span>
                  </div>
                )}
                {row.count !== '-' && (
                  <div>
                    <span className="text-gray-500">本数: </span>
                    <span className="text-gray-900 font-medium">{row.count}</span>
                  </div>
                )}
                {row.sets !== '-' && row.sets !== '1' && (
                  <div>
                    <span className="text-gray-500">セット: </span>
                    <span className="text-gray-900 font-medium">{row.sets}</span>
                  </div>
                )}
                {row.intensity !== '-' && (
                  <div>
                    <span className="text-gray-500">強度: </span>
                    <span className="text-gray-900 font-medium">{row.intensity}</span>
                  </div>
                )}
                {row.style !== '-' && (
                  <div>
                    <span className="text-gray-500">種目: </span>
                    <span className="text-gray-900 font-medium">{row.style}</span>
                  </div>
                )}
              </div>
              {row.content !== '-' && (
                <div className="mt-2 text-gray-700 text-sm leading-relaxed">{row.content}</div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="mb-6 overflow-x-auto">
          <table className="min-w-full text-left border-collapse text-xs print:text-sm">
            <thead>
              <tr className="bg-gray-50 border-b-2 border-gray-300">
                <th className="py-2 px-2 font-semibold text-gray-900 border-r border-gray-300">セクション</th>
                <th className="py-2 px-2 font-semibold text-gray-900 border-r border-gray-300 text-right">距離(m)</th>
                <th className="py-2 px-2 font-semibold text-gray-900 border-r border-gray-300 text-right">本数</th>
                <th className="py-2 px-2 font-semibold text-gray-900 border-r border-gray-300 text-right">セット</th>
                <th className="py-2 px-2 font-semibold text-gray-900 border-r border-gray-300 text-center">強度</th>
                <th className="py-2 px-2 font-semibold text-gray-900 border-r border-gray-300 text-center">種目/スタイル</th>
                <th className="py-2 px-2 font-semibold text-gray-900 border-r border-gray-300">内容</th>
                <th className="py-2 px-2 font-semibold text-gray-900 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <tr key={idx} className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="py-2 px-2 font-medium text-gray-900 border-r border-gray-200">{row.section}</td>
                  <td className="py-2 px-2 text-gray-700 text-right tabular-nums border-r border-gray-200">{row.distance !== '-' ? `${row.distance}m` : '-'}</td>
                  <td className="py-2 px-2 text-gray-700 text-right tabular-nums border-r border-gray-200">{row.count}</td>
                  <td className="py-2 px-2 text-gray-700 text-right tabular-nums border-r border-gray-200">{row.sets}</td>
                  <td className="py-2 px-2 text-gray-700 text-center border-r border-gray-200">{row.intensity}</td>
                  <td className="py-2 px-2 text-gray-700 text-center border-r border-gray-200">{row.style}</td>
                  <td className="py-2 px-2 text-gray-700 border-r border-gray-200">{row.content}</td>
                  <td className="py-2 px-2 text-gray-700 text-right tabular-nums font-semibold">{row.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 強度の凡例 */}
      <div className="mb-6 pt-4 border-t border-gray-300 text-xs">
        <div className="font-semibold text-gray-900 mb-2">強度の凡例:</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <div>①HR~120 (A1 Easy, Relax)</div>
          <div>②HR120~140 (EN1)</div>
          <div>③HR140~160 (EN2)</div>
          <div>④HR160~180 (EN3)</div>
          <div>⑤HR Max (AN1 耐乳酸)</div>
          <div>⑥HR Max (AN2 乳酸生成)</div>
          <div>⑦パワーやスピードなど</div>
        </div>
      </div>

      {/* まとめ */}
      <div className="border-t border-gray-300 pt-4 space-y-3 text-sm">
        <div className="flex items-start">
          <span className="font-semibold text-gray-700 w-24">総距離:</span>
          <span className="text-gray-900">{result.total.replace('合計距離：', '')}</span>
        </div>
        <div className="flex items-start">
          <span className="font-semibold text-gray-700 w-24">今日の狙い:</span>
          <span className="text-gray-900 flex-1">{result.purpose || result.intention}</span>
        </div>
        <div className="flex items-start">
          <span className="font-semibold text-gray-700 w-24">指導ポイント:</span>
          <span className="text-gray-900 flex-1">{result.coachingPoint}</span>
        </div>
        <div className="flex items-start">
          <span className="font-semibold text-gray-700 w-24">注意点:</span>
          <span className="text-gray-900 flex-1">{result.caution}</span>
        </div>
      </div>
    </div>
  );
}
