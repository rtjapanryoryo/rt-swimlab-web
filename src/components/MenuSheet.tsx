'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import type { MenuMainSetSegment, TrainingInput, TrainingResult } from '@/lib/rt/generator';
import { sumMenuDistance } from '@/lib/rt/menu-distance';

type MenuSheetRow = {
  section: string;
  distance: string;
  count: string;
  sets: string;
  intensity: string;
  style: string;
  content: string;
  total: string;
  timing: string;
};

function normalizeDash(v?: string | null) {
  const s = (v ?? '').trim();
  return s.length ? s : '-';
}

/** 表の専用列に移した構造情報を本文から除き、練習内容だけを残す。 */
function extractDisplayContent(text: string): string {
  let content = text.trim();
  content = content.replace(
    /^(?:W-?up|Warm-?up|Drill|Kick|Pull|Pre-?Main|Main(?:\s*[12])?|Dive|Rest|Down|W-?down)\b\s*/i,
    ''
  );
  content = content.replace(/^[（(][^）)]{1,40}[）)]\s*/i, '');
  content = content.replace(/^(?:S1|Fr|Ba|Br|Fly|IM|Cho)\b\s*/i, '');

  // 後半の「25m Hard」などは練習内容なので、行頭の構造情報だけを除きます。
  content = content.replace(
    /^((?:[（(][^）)]{1,40}[）)]\s*)?)(?:\d+\s*[×x]\s*\d+\s*m|\d+\s*m)\b\s*/i,
    '$1'
  );

  content = content
    .replace(/@\s*(?:\d+:\d{2}|\d+sec|\d+秒)/gi, '')
    .replace(/(?:サークル|Circle|Rest)\s*(?:\d+:\d{2}|\d+秒)/gi, '')
    .replace(/[（(](?:[①②③④⑤⑥⑦]|A1|A2|EN[1-4]|AN[1-3]?|AN|MAX)[）)]/gi, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/^[\s:：・+＋→\-–—]+|[\s:：・+＋→\-–—]+$/g, '')
    .trim();

  return normalizeDash(content);
}

/** 既存の文章を変更せず、明確な区切りがある箇所だけを表示用の項目に分ける。 */
export function splitGuidanceItems(value?: string | null): string[] {
  const source = (value ?? '').replace(/\r/g, '').trim();
  if (!source) return [];

  const middleDotParts = source.split(/\s*・\s*/g).map((item) => item.trim());
  // 過去形式の長い文章区切りだけを維持し、「呼吸・姿勢・キャッチ」のような用語列挙は分割しません。
  const usesMiddleDotAsItemSeparator = middleDotParts.length >= 3
    && middleDotParts.every((item) => item.length >= 8);
  const normalized = (usesMiddleDotAsItemSeparator ? middleDotParts.join('\n') : source)
    .replace(/\s+(?=[①②③④⑤⑥⑦⑧⑨⑩])/g, '\n')
    .replace(/\s+(?=\d+[.)]\s*)/g, '\n');

  return normalized
    .split(/\n+|(?<=[。！？])\s*/u)
    .map((item) => item.replace(/^(?:[-•●▪]\s*|[①②③④⑤⑥⑦⑧⑨⑩]\s*|\d+[.)]\s*)/, '').trim())
    .filter(Boolean);
}

function GuidanceItems({ value }: { value?: string | null }) {
  const items = splitGuidanceItems(value);
  if (items.length === 0) return <span className="text-gray-500">-</span>;

  return (
    <ul className="flex-1 list-disc space-y-1 pl-5 text-gray-900">
      {items.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}
    </ul>
  );
}

/** 行の total 文字列から数値を抽出（例: "400m", "1,200m" → 400, 1200） */
function parseRowTotalToNumber(value: string): number {
  if (!value || value === '-') return 0;
  const m = String(value).replace(/,/g, '').match(/(\d+)\s*m?$/);
  return m ? parseInt(m[1], 10) : 0;
}

/**
 * 強度表示：丸数字 + ゾーン略称（印刷対応・シンプル）
 * 色は使わず、読みやすいテキストベースの表示
 */
function IntensityBadge({ value }: { value: string }) {
  const LABEL: Record<string, string> = {
    '①': 'Easy', '②': 'EN1', '③': 'EN2', '④': 'EN3',
    '⑤': 'AN1',  '⑥': 'AN2', '⑦': 'MAX',
  };
  if (!value || value === '-') return <>-</>;
  const label = LABEL[value];
  if (!label) return <>{value}</>;
  return (
    <span className="inline-flex flex-col items-center text-[11px] font-bold leading-tight text-gray-800">
      <span>{value}</span>
      <span className="text-[8px] leading-none text-gray-500 font-medium">{label}</span>
    </span>
  );
}

/** 距離表示：数字と単位mを分離して重なりを防ぐ */
function DistDisplay({ value, addUnit = false }: { value: string; addUnit?: boolean }) {
  if (!value || value === '-') return <>-</>;
  let num: string;
  if (addUnit) {
    num = value;
  } else {
    const m = value.match(/^(.+?)m$/);
    num = m ? m[1] : value;
  }
  return (
    <span className="dist-cell inline-flex items-baseline gap-[3px]">
      <span className="dist-num tabular-nums">{num}</span>
      <span className="dist-unit">m</span>
    </span>
  );
}

const STROKE_ALLOWED = new Set(['Cho', 'IM', 'S1', 'Fr', 'Br', 'Ba', 'Fly']);

/** セクションkey → 表表示ラベル（順序変更用） */
export const SECTION_KEY_TO_LABEL: Record<string, string> = {
  warmUp: 'W-up',
  drill: 'Drill',
  kick: 'Kick',
  pull: 'Pull',
  preMain: 'Pre-Main',
  dive: 'Dive',
  rest: 'Rest',
  main: 'Main',
  down: 'Down',
};

const DEFAULT_SECTION_ORDER: (keyof TrainingResult)[] = [
  'warmUp', 'drill', 'kick', 'pull', 'rest', 'preMain', 'dive', 'main', 'down',
];

/** テンプレ本文の先頭からセクション表示名を抽出（ミドル２等で Drill 枠に W-up が入る場合に正しく表示） */
function extractSectionLabelFromContent(text: string): string | null {
  const t = (text ?? '').trim();
  if (!t) return null;
  // 先頭の語句で判定（長い表現を先にマッチ）
  if (/^(W-up|W-up\s|ウォームアップ)/i.test(t)) return 'W-up';
  if (/^(W-down|W-down\s)/i.test(t)) return 'W-down';
  if (/^Pre-Main\b/i.test(t)) return 'Pre-Main';
  if (/^Easy\s+Swim\b/i.test(t)) return 'W-down';
  if (/^Main\b/i.test(t)) return 'Main';
  if (/^(Drill|ドリル)\b/i.test(t)) return 'Drill';
  if (/^(Kick|キック)\b/i.test(t)) return 'Kick';
  if (/^(Pull|プル)\b/i.test(t)) return 'Pull';
  if (/^Rest\b/i.test(t)) return 'Rest';
  if (/^Dive\b/i.test(t)) return 'Dive';
  if (/^Down\b/i.test(t)) return 'W-down';
  return null;
}

/** 本文から種目を抽出。テンプレ通りに表示する（条件の種目は使わずテンプレ優先） */
function extractStyleFromText(text: string): string | null {
  const m = text.match(/\b(S1|FR|Fr|Ba|Br|Fly|IM|cho)\b/i);
  if (!m) return null;
  const s = m[1].toLowerCase();
  if (s === 'cho') return 'Cho';
  if (s === 'fr') return 'Fr';
  return m[1]; // S1, Ba, Br, Fly, IM はそのまま
}

/** テンプレに種目が無いときのみ使用。Rest以外で "-" になりうる種目は S1 に統一。 */
function fallbackStyle(section: string, stroke?: string, templateOnly?: boolean): string {
  if (section === 'Rest') return '-';
  // クイック時: Pre-Main, Dive, Main は条件2（種目）に合わせる
  if (templateOnly && (section === 'Pre-Main' || section === 'Dive' || section === 'Main')) {
    return stroke && STROKE_ALLOWED.has(stroke) ? stroke : 'S1';
  }
  if (templateOnly) return 'S1';
  if (section === 'W-up' || section === 'Down' || section === 'W-down') return 'Cho';
  if (section === 'Pre-Main' || section === 'Dive') return stroke && STROKE_ALLOWED.has(stroke) ? stroke : 'S1';
  return 'S1';
}

/** 1パート分をパースして MenuSheetRow を生成（複数構成用） */
function parsePartToRow(
  section: string,
  partText: string,
  sectionDisplay: string,
  stroke?: string,
  templateOnly?: boolean
): MenuSheetRow {
  const text = partText.trim();
  const styleFromContent = text ? extractStyleFromText(text) : null;
  const style =
    templateOnly && (section === 'Pre-Main' || section === 'Dive' || section === 'Main')
      ? (stroke && STROKE_ALLOWED.has(stroke) ? stroke : 'S1')
      : (styleFromContent && STROKE_ALLOWED.has(styleFromContent) ? styleFromContent : fallbackStyle(section, stroke, templateOnly));

  let distance = '-';
  let count = '-';
  const sets = '1';
  let timing = '-';
  let intensity = '-';

  // ①②③④⑤⑥⑦ の丸数字を直接パース（骨格ジェネレータ出力に対応）
  const circleMatch = text.match(/[（(][①②③④⑤⑥⑦][）)]/);
  if (circleMatch) {
    intensity = circleMatch[0].replace(/[()（）]/g, '');
  } else {
    // EN1/EN2/EN3/AN1 等のテキスト表記を丸数字にマップ（RT Japan公式: ①=A1/A2 ②=EN1 ③=EN2 ④=EN3 ⑤=AN1 ⑥=AN2 ⑦=MAX）
    const intensityCodes = ['AN1', 'AN2', 'AN3', 'AN', 'EN1', 'EN2', 'EN3', 'EN4', 'A1', 'A2', 'MAX'];
    const intensityToLegendMap: Record<string, string> = {
      A1: '①', A2: '①', EN1: '②', EN2: '③', EN3: '④', EN4: '④', AN1: '⑤', AN2: '⑥', AN3: '⑦', AN: '⑦', MAX: '⑦',
    };
    for (const code of intensityCodes) {
      const m = text.match(new RegExp(`[(\（]${code}[)\）]`, 'i'));
      if (m) {
        const key = m[0].replace(/[()（）]/g, '').toUpperCase();
        const mapped = intensityToLegendMap[key];
        if (mapped) { intensity = mapped; break; }
      }
    }
  }
  if (section !== 'Rest' && intensity === '-') intensity = '①';

  const distMatch = text.match(/(\d+)\s*m(?!\w)/);
  const countDistMatch = text.match(/(\d+)\s*[×x]\s*(\d+)\s*m?(?!\w)/);
  if (countDistMatch) {
    count = countDistMatch[1];
    distance = countDistMatch[2];
  } else if (distMatch?.[1]) {
    distance = distMatch[1];
    count = '1';
  }
  if ((section === 'W-up' || section === 'Down') && count === '-') count = '1';

  const explicitRestMatch = text.match(/Rest\s*(\d+:\d{2}|\d+秒)/i);
  const explicitCircleMatch = text.match(/(?:サークル|Circle)\s*(\d+:\d{2}|\d+秒)/i);
  // 過去に保存したメニューとの互換性のため、旧形式の @30sec もRestとして扱います。
  const legacyRestMatch = text.match(/@(\d+:\d{2}|\d+sec|\d+秒)/i);
  if (explicitRestMatch?.[1]) {
    timing = `Rest ${explicitRestMatch[1]}`;
  } else if (explicitCircleMatch?.[1]) {
    timing = `サークル ${explicitCircleMatch[1]}`;
  } else if (legacyRestMatch?.[1]) {
    timing = `Rest ${legacyRestMatch[1].replace(/sec$/i, '秒')}`;
  } else {
    const timeMatch = text.match(/\b(\d+:\d{2})\b/);
    if (timeMatch?.[1]) timing = `サークル ${timeMatch[1]}`;
  }

  let total = '-';
  const d = parseInt(distance, 10);
  const c = parseInt(count, 10);
  if (!isNaN(d) && !isNaN(c)) {
    total = `${(d * c).toLocaleString()}m`;
  } else if (distance !== '-') {
    total = distance + 'm';
  }

  const finalStyle =
    section === 'Rest' ? '-' : (section === 'W-up' || section === 'Down' || section === 'W-down' ? 'Cho' : (style && style !== '-' ? style : 'S1'));
  let content = extractDisplayContent(text);
  if (content.length > 300) content = content.substring(0, 300) + '...';
  const displayContent = section === 'Pre-Main' || section === 'Dive' ? (content.trim() || '') : normalizeDash(content);

  return {
    section: sectionDisplay,
    distance: normalizeDash(distance),
    count: normalizeDash(count),
    sets: normalizeDash(sets),
    intensity: normalizeDash(intensity),
    style: finalStyle,
    content: displayContent,
    total: normalizeDash(total),
    timing: normalizeDash(timing),
  };
}

/** 括弧の外側のトップレベルのみ → ＋ + で分割する */
function splitTopLevel(text: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = '';
  let i = 0;
  while (i < text.length) {
    const c = text[i];
    if (c === '（' || c === '(' || c === '【' || c === '「') {
      depth++;
      current += c;
    } else if (c === '）' || c === ')' || c === '】' || c === '」') {
      if (depth > 0) depth--;
      current += c;
    } else if (depth === 0 && /[→＋+]/.test(c)) {
      const trimmed = current.trim();
      if (trimmed) parts.push(trimmed);
      current = '';
      // skip surrounding whitespace
      while (i + 1 < text.length && /\s/.test(text[i + 1])) i++;
    } else {
      current += c;
    }
    i++;
  }
  const trimmed = current.trim();
  if (trimmed) parts.push(trimmed);
  return parts.length > 0 ? parts : [text];
}

/**
 * 複数構成（→ や +）のときは各部分を別行に分割し、距離・本数・セットを正確に表示。
 * 単一構成のときは1行のまま。
 */
export function parseToSheetRow(section: string, raw: string, stroke?: string, templateOnly?: boolean): MenuSheetRow[] {
  const text = (raw ?? '').trim();
  if (!text) {
    const noDash = section === 'Pre-Main' || section === 'Dive';
    return [{
      section,
      distance: '-',
      count: '-',
      sets: '1',
      intensity: '-',
      style: fallbackStyle(section, stroke, templateOnly),
      content: noDash ? '' : '-',
      total: '-',
      timing: '-',
    }];
  }

  const parts = splitTopLevel(text);
  const isComposite = parts.length > 1;

  if (isComposite) {
    return parts.map((part) =>
      parsePartToRow(section, part, section, stroke, templateOnly)
    );
  }

  const single = parsePartToRow(section, text, section, stroke, templateOnly);
  return [single];
}

/** custom生成で確定したセット数を文章から再推測せず、そのまま表示行へ変換します。 */
export function mainSetSegmentsToSheetRows(segments: MenuMainSetSegment[]): MenuSheetRow[] {
  return segments.map((segment) => {
    const totalRepetitions = segment.totalRepetitions
      || segment.rounds * segment.repetitions;
    const count = segment.rounds > 1
      ? `${totalRepetitions}（${segment.repetitions}×${segment.rounds}set）`
      : String(totalRepetitions);
    const content = segment.rounds > 1 && segment.setRestSeconds > 0
      ? `セット間 Rest ${segment.setRestSeconds >= 60 && segment.setRestSeconds % 60 === 0
        ? `${segment.setRestSeconds / 60}分`
        : `${segment.setRestSeconds}秒`}`
      : '-';

    return {
      section: segment.label,
      distance: String(segment.distanceM),
      count,
      sets: String(segment.rounds),
      intensity: segment.intensityNumber,
      style: segment.stroke,
      content,
      total: `${segment.totalM.toLocaleString()}m`,
      timing: `${segment.timing.type === 'circle' ? 'サークル' : 'Rest'} ${segment.timing.display}`,
    };
  });
}

type MenuSheetProps = {
  input: TrainingInput;
  result: TrainingResult;
  isCardView?: boolean;
  /** クイック(テンプレ)由来なら true。種目・内容をフォーム値で補完しない */
  source?: 'quick' | 'custom';
  /** セクション表示順（quick-settings.json の sectionOrder）。未指定時はデフォルト順 */
  sectionOrder?: string[];
  /** セクション表示ラベル（quick-settings.json の sectionLabels）。未指定時は SECTION_KEY_TO_LABEL */
  sectionLabels?: Record<string, string>;
};

export function MenuSheet({ input, result, isCardView = false, source = 'custom', sectionOrder: sectionOrderProp, sectionLabels: sectionLabelsProp }: MenuSheetProps) {
  const order = sectionOrderProp?.length ? sectionOrderProp : DEFAULT_SECTION_ORDER;
  const templateOnly = source === 'quick';
  const rows: MenuSheetRow[] = useMemo(() => {
    const mainSetSegments = result.generationContext?.mainSetSegments;
    if (source === 'custom' && mainSetSegments?.length) {
      return mainSetSegmentsToSheetRows(mainSetSegments);
    }

    const sheetRows: MenuSheetRow[] = [];
    const s = (input.stroke && STROKE_ALLOWED.has(input.stroke) ? input.stroke : 'S1') as string;
    for (const key of order) {
      const value = (result as unknown as Record<string, string>)[key] ?? '';
      // メインセット専用生成では他セクションが空になるため、空の行は表示しません。
      // 過去の全体メニューは値が入っているので、従来どおりすべて表示されます。
      if (!value.trim()) continue;
      const labelFromContent = extractSectionLabelFromContent(value);
      const label = labelFromContent ?? sectionLabelsProp?.[key] ?? SECTION_KEY_TO_LABEL[key] ?? key;
      sheetRows.push(...parseToSheetRow(label, value, s, templateOnly));
    }
    return sheetRows;
  }, [result, input.stroke, order, sectionLabelsProp, source, templateOnly]);

  // 行合計から総距離を算出（表と一致させるため）
  const { sumFromRows, blockSubtotals } = useMemo(() => {
    let sum = 0;
    const subs: { section: string; dist: number }[] = [];
    let prevSection = '';
    let sectionSum = 0;
    for (const row of rows) {
      const resolved = row.section === '〃' ? prevSection : row.section;
      if (resolved !== prevSection && prevSection) {
        subs.push({ section: prevSection, dist: sectionSum });
        sectionSum = 0;
      }
      prevSection = resolved;
      const d = parseRowTotalToNumber(row.total);
      sectionSum += d;
      sum += d;
    }
    if (prevSection) subs.push({ section: prevSection, dist: sectionSum });
    return { sumFromRows: sum, blockSubtotals: subs };
  }, [rows]);


  // 日付を取得
  const today = new Date();
  const dateStr = `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日`;
  const dayOfWeek = ['日', '月', '火', '水', '木', '金', '土'][today.getDay()];

  // 期の表示名
  const periodNames: Record<string, string> = {
    '1': '① リカバリー期',
    '2': '② 基礎形成期',
    '3': '③ 発展形成期',
    '4': '④ 強化期 (スピード持久力)',
    '5': '⑤ 強化期 (耐乳酸)',
    '6': '⑥ 調整期',
    '7': '⑦ テーパー期',
  };

  // 種目の表示名（IMはメドレー、S1はスタイル1）
  const strokeNames: Record<string, string> = {
    Fr: 'Fr（自由形）',
    Ba: 'Ba（背泳ぎ）',
    Br: 'Br（平泳ぎ）',
    Fly: 'Fly（バタフライ）',
    IM: '個人メドレー',
    S1: 'S1（スタイル1）',
  };

  // 距離タイプの表示名
  const distanceTypeNames: Record<string, string> = {
    S: 'S（スプリント）',
    M: 'M（ミドル）',
    D: 'D（ディスタンス）',
  };
  const generationModeNames: Record<string, string> = {
    standard: '通常メニュー',
    sprint_50m: '50m特化',
  };
  const poolLengthNames: Record<string, string> = {
    short_course: '短水路',
    long_course: '長水路',
  };
  const raceEventNames: Record<string, string> = {
    Fr_50m: '自由形 50m',
    Fr_100m: '自由形 100m',
    Fr_200m: '自由形 200m',
    Ba_50m: '背泳ぎ 50m',
    Ba_100m: '背泳ぎ 100m',
    Br_50m: '平泳ぎ 50m',
    Br_100m: '平泳ぎ 100m',
    Fly_50m: 'バタフライ 50m',
    Fly_100m: 'バタフライ 100m',
    IM_100m: '個人メドレー 100m',
    IM_200m: '個人メドレー 200m',
    IM_400m: '個人メドレー 400m',
  };
  // 期（目的）の表示名
  const periodLabels: Record<string, string> = {
    '1': '① リカバリー期',
    '2': '② 基礎形成期',
    '3': '③ 発展形成期',
    '4': '④ 強化期 (スピード持久力)',
    '5': '⑤ 強化期 (耐乳酸)',
    '6': '⑥ 調整期',
    '7': '⑦ テーパー期',
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
              <span className="text-gray-900" suppressHydrationWarning>
                {dateStr}（{dayOfWeek}）
              </span>
            </div>
            <div className="flex">
              <span className="font-semibold text-gray-700 w-24">コーチ:</span>
              <span className="text-gray-900">RT-japan</span>
            </div>
            <div className="flex">
              <span className="font-semibold text-gray-700 w-24">期:</span>
              <span className="text-gray-900">{periodNames[input.period] || input.period}</span>
            </div>
            {source === 'custom' ? (
              <>
                <div className="flex">
                  <span className="font-semibold text-gray-700 w-24">メイン種目1:</span>
                  <span className="text-gray-900">{raceEventNames[input.raceEvent ?? ''] ?? '-'}</span>
                </div>
                <div className="flex">
                  <span className="font-semibold text-gray-700 w-24">メイン種目2:</span>
                  <span className="text-gray-900">{raceEventNames[input.raceEvent2 ?? ''] ?? '指定なし'}</span>
                </div>
              </>
            ) : (
              <div className="flex">
                <span className="font-semibold text-gray-700 w-24">種目:</span>
                <span className="text-gray-900">{strokeNames[input.stroke] || strokeNames['Fr'] || input.stroke || 'Fr（自由形）'}</span>
              </div>
            )}
            <div className="flex">
              <span className="font-semibold text-gray-700 w-24">生成モード:</span>
              <span className="text-gray-900">{generationModeNames[input.generationMode ?? 'standard'] ?? '通常メニュー'}</span>
            </div>
            {source === 'quick' && (
              <div className="flex">
                <span className="font-semibold text-gray-700 w-24">距離:</span>
                <span className="text-gray-900">{input.distance ? `${input.distance}m` : '-'}</span>
              </div>
            )}
            <div className="flex">
              <span className="font-semibold text-gray-700 w-24">年齢:</span>
              <span className="text-gray-900">{input.age}</span>
            </div>
          </div>
          <div className="space-y-2">
            {source === 'quick' && (
              <div className="flex">
                <span className="font-semibold text-gray-700 w-24">距離タイプ:</span>
                <span className="text-gray-900">{distanceTypeNames[input.distanceType] || input.distanceType}</span>
              </div>
            )}
            <div className="flex">
              <span className="font-semibold text-gray-700 w-24">レベル:</span>
              <span className="text-gray-900">{input.level}</span>
            </div>
            <div className="flex">
              <span className="font-semibold text-gray-700 w-24">目的:</span>
              <span className="text-gray-900">{periodLabels[input.period] || input.period || '-'}</span>
            </div>
            <div className="flex">
              <span className="font-semibold text-gray-700 w-24">状況:</span>
              <span className="text-gray-900">{input.condition}</span>
            </div>
            <div className="flex">
              <span className="font-semibold text-gray-700 w-24">{source === 'custom' ? 'メイン時間:' : '練習時間:'}</span>
              <span className="text-gray-900">{source === 'custom' ? input.mainSetTime : input.practiceTime}分</span>
            </div>
            <div className="flex">
              <span className="font-semibold text-gray-700 w-24">プール:</span>
              <span className="text-gray-900">{poolLengthNames[input.poolLength ?? 'short_course'] ?? '短水路'}</span>
            </div>
            <div className="flex">
              <span className="font-semibold text-gray-700 w-24">ベスト:</span>
              <span className="text-gray-900">
                {result.generationContext?.bestTimeReferences?.length
                  ? result.generationContext.bestTimeReferences.map((reference) =>
                      `${raceEventNames[reference.raceEvent] ?? reference.raceEvent}: ${reference.display ?? '未登録'}`
                    ).join(' / ')
                  : result.generationContext
                    ? result.generationContext.bestTimeDisplay || '-'
                    : input.bestTime || '-'}
              </span>
            </div>
            {source === 'custom' && result.generationContext?.estimatedDurationMinutes && (
              <div className="flex">
                <span className="font-semibold text-gray-700 w-24">所要時間:</span>
                <span className="text-gray-900">約{result.generationContext.estimatedDurationMinutes}分</span>
              </div>
            )}
            <div className="flex">
              <span className="font-semibold text-gray-700 w-24">器具:</span>
              <span className="text-gray-900">フィン/パドルカスタム自由</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-4 flex justify-end no-print">
        <Link href="/guide/menu-terms" className="text-sm font-semibold text-cyan-700 underline decoration-cyan-300 underline-offset-4 hover:text-cyan-900">
          メニュー用語の意味を確認
        </Link>
      </div>

      {/* 本文（メニュー） */}
      {isCardView ? (
        <div className="mb-6 grid grid-cols-1 gap-4">
          {rows.map((row, idx) => (
            <div key={idx} className="app-card overflow-visible">
              <div className="flex items-stretch min-w-0">
                <div className="w-1.5 bg-gradient-to-b from-slate-400/80 via-slate-500/60 to-slate-600/40 flex-shrink-0 rounded-l-[15px]" />
                <div className="flex-1 p-5 pl-6 min-w-0 overflow-visible">
                  <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-slate-100/90 text-slate-900 border border-slate-200/80">
                      {row.section}
                    </span>
                    {row.total !== '-' && (
                      <span className="text-sm font-semibold text-slate-600 bg-slate-50/80 px-2.5 py-1 rounded-lg">
                        Total: <DistDisplay value={row.total} />
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm mb-3">
                    {row.distance !== '-' && (
                      <span className="text-slate-600">
                        <span className="text-slate-400 font-medium">距離</span>
                        <span className="ml-1 font-semibold text-slate-800">
                          <DistDisplay value={row.distance} addUnit />
                        </span>
                      </span>
                    )}
                    {row.count !== '-' && (
                      <span className="text-slate-600">
                        <span className="text-slate-400 font-medium">本数</span>
                        <span className="ml-1 font-semibold text-slate-800">{row.count}</span>
                      </span>
                    )}
                    {row.style !== '-' && (
                      <span className="text-slate-600">
                        <span className="text-slate-400 font-medium">種目</span>
                        <span className="ml-1 font-semibold text-slate-800">{row.style}</span>
                      </span>
                    )}
                    {row.intensity !== '-' && (
                      <span className="text-slate-600 flex items-center gap-1">
                        <span className="text-slate-400 font-medium text-xs">強度</span>
                        <IntensityBadge value={row.intensity} />
                      </span>
                    )}
                    {row.timing !== '-' && (
                      <span className="text-slate-600">
                        <span className="text-slate-400 font-medium">サークル / Rest</span>
                        <span className="ml-1 font-semibold text-slate-800">{row.timing}</span>
                      </span>
                    )}
                  </div>
                  {row.content !== '-' && (
                    <p className="mt-2 text-slate-700 text-sm leading-relaxed break-words">
                      {row.content}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mb-6 overflow-x-auto">
          <table className="min-w-full border-collapse text-xs print:text-sm pdf-capture-table">
            <colgroup>
              <col style={{ width: '10%' }} />
              <col style={{ width: '9%' }} />
              <col style={{ width: '6%' }} />
              <col style={{ width: '7%' }} />
              <col style={{ width: '32%' }} />
              <col style={{ width: '9%' }} />
              <col style={{ width: '15%' }} />
              <col style={{ width: '12%' }} />
            </colgroup>
            <thead>
              <tr className="bg-gray-50 border-b-2 border-gray-300">
                <th className="py-2 px-2 font-semibold text-gray-900 border-r border-gray-300 text-center whitespace-nowrap">セクション</th>
                <th className="py-2 px-2 font-semibold text-gray-900 border-r border-gray-300 text-center">距離(m)</th>
                <th className="py-2 px-2 font-semibold text-gray-900 border-r border-gray-300 text-center">本数</th>
                <th className="py-2 px-2 font-semibold text-gray-900 border-r border-gray-300 text-center">種目</th>
                <th className="py-2 px-2 font-semibold text-gray-900 border-r border-gray-300 text-left">内容</th>
                <th className="py-2 px-2 font-semibold text-gray-900 border-r border-gray-300 text-center">強度</th>
                <th className="py-2 px-2 font-semibold text-gray-900 border-r border-gray-300 text-center whitespace-nowrap">サークル / Rest</th>
                <th className="py-2 px-2 font-semibold text-gray-900 text-center">Total</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <tr key={idx} className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="py-2 px-2 font-medium text-gray-900 text-center border-r border-gray-200 whitespace-nowrap">{row.section}</td>
                  <td className="py-2 px-2 text-gray-700 text-center border-r border-gray-200 dist-td">
                    <DistDisplay value={row.distance} addUnit />
                  </td>
                  <td className="py-2 px-2 text-gray-700 text-center tabular-nums border-r border-gray-200">{row.count}</td>
                  <td className="py-2 px-2 text-gray-700 text-center border-r border-gray-200">{row.style}</td>
                  <td className="py-2 px-2 text-gray-700 text-left border-r border-gray-200 break-words">{row.content}</td>
                  <td className="py-2 px-2 text-center border-r border-gray-200">
                    <IntensityBadge value={row.intensity} />
                  </td>
                  <td className="py-2 px-2 text-gray-700 text-center tabular-nums border-r border-gray-200 whitespace-nowrap">{row.timing}</td>
                  <td className="py-2 px-2 text-gray-700 text-center font-semibold dist-td">
                    <DistDisplay value={row.total} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 強度凡例（コンパクト・印刷対応） */}
      <div className="mb-6 pt-3 border-t border-gray-200 text-xs text-gray-600">
        <span className="font-semibold text-gray-700 mr-2">強度:</span>
        <span className="inline-flex flex-wrap gap-x-4 gap-y-0.5">
          {[
            ['①', 'A1/A2', '~HR120 Easy'],
            ['②', 'EN1',   'HR120~140'],
            ['③', 'EN2',   'HR140~160'],
            ['④', 'EN3',   'HR160~180'],
            ['⑤', 'AN1',   'HR Max近'],
            ['⑥', 'AN2',   'HR Max'],
            ['⑦', 'MAX',   '全力'],
          ].map(([v, code, desc]) => (
            <span key={v}><span className="font-bold text-gray-800">{v} {code}</span><span className="ml-1 text-gray-400">{desc}</span></span>
          ))}
        </span>
      </div>

      {/* まとめ */}
      <div className="border-t border-gray-300 pt-4 space-y-3 text-sm">
        {blockSubtotals.length > 0 && (
          <div className="mb-3">
            <span className="font-semibold text-gray-700 block mb-1">ブロック別小計:</span>
            <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-gray-700">
              {blockSubtotals.map(({ section, dist }) => (
                <span key={section}>
                  {section}: <span className="tabular-nums font-medium">{dist.toLocaleString()}m</span>
                </span>
              ))}
            </div>
          </div>
        )}
        <div className="flex items-start">
          <span className="font-semibold text-gray-700 w-24">総距離:</span>
          <span className="text-gray-900 dist-cell-wrapper">
            <DistDisplay
              value={
                sumFromRows > 0
                  ? `${sumFromRows.toLocaleString()}m`
                  : (() => {
                      const fromTotal = (result.total ?? '').replace(/合計距離：|総距離：?/g, '').trim();
                      if (fromTotal && fromTotal !== '-') return fromTotal;
                      const fromBlocks = sumMenuDistance(result as unknown as Record<string, string>);
                      return fromBlocks > 0 ? `${fromBlocks.toLocaleString()}m` : '-';
                    })()
              }
            />
          </span>
        </div>

        <div className="flex items-start">
          <span className="font-semibold text-gray-700 w-24">今日の狙い:</span>
          <span className="text-gray-900 flex-1">
            {(result.intention || result.purpose || '').replace(/^【目的】(?:[^｜]*｜|[①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬])\s*/, '')}
          </span>
        </div>
        <div className="flex items-start">
          <span className="font-semibold text-gray-700 w-24 flex-shrink-0">指導ポイント:</span>
          <GuidanceItems value={result.coachingPoint} />
        </div>
        <div className="flex items-start">
          <span className="font-semibold text-gray-700 w-24 flex-shrink-0">注意点:</span>
          <GuidanceItems value={result.caution} />
        </div>
        {result.expectedEffect && (
          <div className="flex items-start">
            <span className="font-semibold text-gray-700 w-24 flex-shrink-0">期待効果:</span>
            <span className="text-gray-900 flex-1 whitespace-pre-wrap">{result.expectedEffect}</span>
          </div>
        )}
      </div>
    </div>
  );
}
