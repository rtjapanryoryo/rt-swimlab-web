/**
 * Web検索API（Serper）による専門的クエリ検索
 * 演習内容の質向上のため、水泳専門の英語クエリで最新情報を取得
 */

const SERPER_ENDPOINT = 'https://google.serper.dev/search';

export type WebSearchResult = {
  title: string;
  link: string;
  snippet: string;
};

export type WebSearchResponse = {
  organic?: Array<{ title: string; link: string; snippet: string }>;
  knowledgeGraph?: { description?: string };
};

/**
 * 期・種目・ブロックに応じた専門的検索クエリを生成（英語・業界用語）
 * "水泳 発展形成期 ドリル" のような汎用クエリではなく、
 * competitive swimming / swim training / drill progression 等の専門表現を使用
 */
export function buildProfessionalSearchQueries(params: {
  period: string;
  stroke: string;
  distanceType: string;
}): string[] {
  const { period, stroke, distanceType } = params;
  const strokeEn: Record<string, string> = {
    Fr: 'freestyle',
    Ba: 'backstroke',
    Br: 'breaststroke',
    Fly: 'butterfly',
    IM: 'medley',
    S1: 'freestyle',
  };
  const strokeKey = strokeEn[stroke] || 'freestyle';

  const periodQueries: Record<string, string[]> = {
    '1': [
      'elite swimming recovery phase aerobic regeneration protocol',
      'swim active recovery set design blood lactate clearance',
    ],
    '2': [
      'swimming aerobic base building phase EN1 EN2 set structure',
      'swim technique drill progression catch early vertical forearm',
      'competitive swimming base phase DPS stroke efficiency',
    ],
    '3': [
      'swimming development phase EN2 EN3 transition main set design',
      'swim technique drill progression SKPS catch-up fingertip drag',
      'competitive swimming aerobic capacity lactate threshold training',
    ],
    '4': [
      'swimming speed endurance VO2max lactate threshold set',
      'swim EN3 race pace main set 8x50 4x100 design',
      'competitive swimming high intensity aerobic polarized training',
    ],
    '5': [
      'swimming lactate tolerance anaerobic set design elite',
      'swim AN1 AN2 main set 25 50 lactate production',
      'competitive swimming lactate clearance repeat 50 100',
    ],
    '6': [
      'swimming taper volume reduction race preparation protocol',
      'swim race maintenance set intensity preservation',
    ],
    '7': [
      'swimming final taper race sharpening activation set',
      'swim pre-race short sprint activation protocol',
    ],
  };

  const blockQueries = [
    `swimming warm-up protocol ${strokeKey} variable pace build SKPS`,
    `swim ${strokeKey} technique drill progression catch-up high elbow`,
    `swimming kick drill fins board descending tempo set`,
    `swim pull buoy drill DPS stroke rate efficiency ${strokeKey}`,
    distanceType === 'S'
      ? 'swimming sprint main set 25 50 race pace lactate'
      : distanceType === 'D'
        ? 'swimming distance main set 100 200 400 aerobic endurance'
        : 'swimming middle distance main set 50 100 race pace EN3',
  ];

  const periodSpecific = periodQueries[period] || periodQueries['3'];
  return [...periodSpecific, ...blockQueries.slice(0, 3)];
}

/**
 * Serper API で検索を実行
 */
export async function searchWeb(
  query: string,
  apiKey: string,
  num = 5
): Promise<WebSearchResult[]> {
  try {
    const res = await fetch(SERPER_ENDPOINT, {
      method: 'POST',
      headers: {
        'X-API-KEY': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: query,
        num,
        gl: 'jp',
        hl: 'ja',
      }),
    });
    if (!res.ok) {
      console.error('[web-search] Serper API error:', res.status, await res.text());
      return [];
    }
    const data = (await res.json()) as WebSearchResponse;
    const organic = data.organic ?? [];
    return organic.slice(0, num).map((o) => ({
      title: o.title ?? '',
      link: o.link ?? '',
      snippet: o.snippet ?? '',
    }));
  } catch (e) {
    console.error('[web-search] Fetch error:', e);
    return [];
  }
}

/**
 * 複数クエリを実行し、重複を除いて統合（最大 N 件）
 */
export async function searchMultiple(
  queries: string[],
  apiKey: string,
  maxTotal = 12
): Promise<{ title: string; link: string; snippet: string }[]> {
  const seen = new Set<string>();
  const results: { title: string; link: string; snippet: string }[] = [];
  const perQuery = Math.ceil(maxTotal / Math.max(1, queries.length));

  for (const q of queries) {
    if (results.length >= maxTotal) break;
    const items = await searchWeb(q, apiKey, perQuery);
    for (const item of items) {
      const key = item.link || item.title;
      if (key && !seen.has(key)) {
        seen.add(key);
        results.push(item);
      }
    }
  }
  return results.slice(0, maxTotal);
}

/**
 * 検索結果をプロンプト用テキストに整形
 */
export function formatSearchResultsForPrompt(
  results: { title: string; link: string; snippet: string }[]
): string {
  if (results.length === 0) return '';
  return (
    '【ネット上の最新参照（演習内容の具体化に活用すること）】\n' +
    results
      .map((r, i) => `${i + 1}. ${r.title}\n   ${r.snippet}\n   ${r.link}`)
      .join('\n\n') +
    '\n\n上記の情報を踏まえ、専門的・具体的な演習内容を出力すること。\n'
  );
}
