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

const STROKE_ALLOWED = new Set(['Cho', 'IM', 'Fr', 'Br', 'Ba', 'Fly']);

function styleFromSection(section: string, stroke?: string): string {
  if (section === 'Rest') return '-';
  if (section === 'W-up' || section === 'Down') return 'Cho';
  if (section === 'Pre-Main') return '-';
  if ((section === 'Drill' || section === 'Kick' || section === 'Pull' || section === 'Main') && stroke && STROKE_ALLOWED.has(stroke)) return stroke;
  return '-';
}

export function parseToSheetRow(section: string, raw: string, stroke?: string): MenuSheetRow {
  const text = (raw ?? '').trim();
  const defaultStyle = styleFromSection(section, stroke);
  if (!text) {
    return {
      section,
      distance: '-',
      count: '-',
      sets: '1',
      intensity: '-',
      style: defaultStyle,
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
  let style = defaultStyle;
  let equipment = '-';
  let content = text;
  let total = '-';

  // 強度を抽出（A1, EN1, EN2…）→ 凡例番号（①〜⑦）にマッピング
  // 半角・全角どちらの括弧にも対応
  const intensityCodes = ['AN1', 'AN2', 'AN3', 'AN', 'EN1', 'EN2', 'EN3', 'EN4', 'A1', 'A2'];
  const intensityToLegendMap: Record<string, string> = {
    A1: '①',
    A2: '①',
    EN1: '②',
    EN2: '③',
    EN3: '④',
    EN4: '④',
    AN1: '⑤',
    AN2: '⑥',
    AN3: '⑦',
    AN: '⑦',
  };
  for (const code of intensityCodes) {
    const pattern = new RegExp(`[(\（]${code}[)\）]`, 'i');
    const match = text.match(pattern);
    if (match) {
      const c = match[0].replace(/[()（）]/g, '').toUpperCase();
      if (intensityToLegendMap[c]) {
        intensity = intensityToLegendMap[c];
        break;
      }
    }
  }
  // Rest 以外は強度を必ず ①〜⑦ に。未抽出時は ① をデフォルト
  if (section !== 'Rest' && intensity === '-') {
    intensity = '①';
  }

  // 種目: Cho, IM, Fr, Br, Ba, Fly のいずれか。Rest は - のまま。

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

  // W-up と Down で本数が - のときだけ 1 に（- を避ける）
  if ((section === 'W-up' || section === 'Down') && count === '-') {
    count = '1';
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

  // 内容を簡潔に。強度コード削除＋セクション・距離・本数と重複する表記は除く
  const intensityCodesToRemove = ['AN1', 'AN2', 'AN3', 'AN', 'EN1', 'EN2', 'EN3', 'EN4', 'A1', 'A2'];
  content = text;
  for (const code of intensityCodesToRemove) {
    const pattern = new RegExp(`[(\（]${code}[)\）]`, 'gi');
    content = content.replace(pattern, '');
  }
  // 本数×距離（例: 6×50m, 8×100m）
  content = content.replace(/\d+\s*[×x]\s*\d+\s*m/gi, '');
  // 単体の距離（例: 200m, 100m）
  content = content.replace(/\b\d+\s*m\b/g, '');
  // レスト・サイクル表記（秒）→ サイクル列に出るため重複削除
  content = content.replace(/\s*\d+\s*秒\s*(レスト)?/g, '');
  // セクションと重複するブロック名・ドリル名
  content = content.replace(/^(キック|プル（専門）|プル|Pre-Main|Main|Easy Swim)\s*/i, '');
  content = content.replace(/^(片手ドリル|キャッチアップ|フィストスイム|片手＋キック|キックのみ|プル＋キック|各泳法のドリル|IMドリル|ドリル)\s*/i, '');
  content = content
    .replace(/\s*@\d+\s*秒\s*/g, '')
    .replace(/\s*\d{2}:\d{2}\s*/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  // 器具の括弧表記は後で追加するため、既存の重複を削除
  content = content
    .replace(/[(\（](ボード|ノーボード|ボード・ノーボード交互|No\s*board|ボードなし)[)\）]/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (equipment !== '-') {
    content = content ? `${content}（${equipment}）` : `（${equipment}）`;
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
    const s = input.stroke && STROKE_ALLOWED.has(input.stroke) ? input.stroke : undefined;
    sheetRows.push(parseToSheetRow('W-up', result.warmUp, s));
    sheetRows.push(parseToSheetRow('Drill', result.drill, s));
    sheetRows.push(parseToSheetRow('Kick', result.kick, s));
    sheetRows.push(parseToSheetRow('Pull', result.pull, s));
    sheetRows.push(parseToSheetRow('Pre-Main', result.preMain, s));
    if (result.rest) sheetRows.push(parseToSheetRow('Rest', result.rest, s));
    sheetRows.push(parseToSheetRow('Main', result.main, s));
    sheetRows.push(parseToSheetRow('Down', result.down, s));
    return sheetRows;
  }, [result, input.stroke]);

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
              {row.intensity !== '-' && (
                <div className="mt-1">
                  <span className="text-gray-500">強度: </span>
                  <span className="text-gray-900 font-medium">{row.intensity}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="mb-6 overflow-x-auto">
          <table className="min-w-full border-collapse text-xs print:text-sm">
            <thead>
              <tr className="bg-gray-50 border-b-2 border-gray-300">
                <th className="py-2 px-2 font-semibold text-gray-900 border-r border-gray-300 text-center">セクション</th>
                <th className="py-2 px-2 font-semibold text-gray-900 border-r border-gray-300 text-center">距離(m)</th>
                <th className="py-2 px-2 font-semibold text-gray-900 border-r border-gray-300 text-center">本数</th>
                <th className="py-2 px-2 font-semibold text-gray-900 border-r border-gray-300 text-center">セット</th>
                <th className="py-2 px-2 font-semibold text-gray-900 border-r border-gray-300 text-center">種目</th>
                <th className="py-2 px-2 font-semibold text-gray-900 border-r border-gray-300 text-left">内容</th>
                <th className="py-2 px-2 font-semibold text-gray-900 border-r border-gray-300 text-center">強度</th>
                <th className="py-2 px-2 font-semibold text-gray-900 text-center">Total</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <tr key={idx} className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="py-2 px-2 font-medium text-gray-900 text-center border-r border-gray-200">{row.section}</td>
                  <td className="py-2 px-2 text-gray-700 text-center tabular-nums border-r border-gray-200">{row.distance !== '-' ? `${row.distance}m` : '-'}</td>
                  <td className="py-2 px-2 text-gray-700 text-center tabular-nums border-r border-gray-200">{row.count}</td>
                  <td className="py-2 px-2 text-gray-700 text-center tabular-nums border-r border-gray-200">{row.sets}</td>
                  <td className="py-2 px-2 text-gray-700 text-center border-r border-gray-200">{row.style}</td>
                  <td className="py-2 px-2 text-gray-700 text-left border-r border-gray-200">{row.content}</td>
                  <td className="py-2 px-2 text-gray-700 text-center border-r border-gray-200">{row.intensity}</td>
                  <td className="py-2 px-2 text-gray-700 text-center tabular-nums font-semibold">{row.total}</td>
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
