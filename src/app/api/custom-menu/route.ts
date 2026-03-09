import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import path from 'path';
import { config as loadEnv } from 'dotenv';
import { getEffectiveUser } from '@/lib/supabase/server';
import OpenAI from 'openai';
import { getCommonContent, getProtocolContent, getPromptContent } from '@/lib/rt/content';
import { sumMenuDistance } from '@/lib/rt/menu-distance';

// APIルートでも .env.ai を読む（next.config 経由で読めない場合のフォールバック）。失敗してもルートは登録する
try {
  loadEnv({ path: path.resolve(process.cwd(), '.env.ai') });
} catch {
  // .env.ai が無くても続行
}

function getOpenAIStatus(): { configured: boolean; reason?: 'missing' | 'placeholder' } {
  const key = (process.env.OPENAI_API_KEY || '').trim();
  if (key.length === 0) return { configured: false, reason: 'missing' };
  if (key === 'YOUR_API_KEY_HERE') return { configured: false, reason: 'placeholder' };
  return { configured: true };
}

/** GET: ログイン済みユーザー向けに OpenAI API が利用可能か返す。診断用の keyExists も返す */
export async function GET(request: NextRequest) {
  try {
    const user = await getEffectiveUser();
    const keyExists = (process.env.OPENAI_API_KEY || '').trim().length > 0;
    const status = getOpenAIStatus();
    console.log('[custom-menu] GET: OPENAI_API_KEY exists:', keyExists, 'configured:', status.configured, 'reason:', status.reason ?? 'ok');
    if (!user) {
      return NextResponse.json({ openaiConfigured: false, keyExists }, { status: 200 });
    }
    return NextResponse.json({
      openaiConfigured: status.configured,
      openaiReason: status.reason,
      keyExists,
    });
  } catch (e: unknown) {
    console.error('[custom-menu] GET error:', e);
    return NextResponse.json(
      { error: 'internal_error', message: '現在生成できません。時間をおいて再試行してください' },
      { status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  }
}

/** コーチ思想（50問インタビュー回答）に基づく補足ルール。プロトコルは getProtocolContent() で読み込む。 */
const CORE_SYSTEM_PROMPT = `【コーチ思想の核心（50問インタビュー回答より）】
以下のコーチ思想を最優先に反映してメニューを生成すること。

1. 【楽しさと質の両立】選手がポジティブな気持ちでプールに来ることが大前提。飽きさせないよう変化をつけ、楽しさと強さを両立させる。笑顔が生まれる雰囲気を作ること。

2. 【量より質・フォームを崩して強くしない】良い練習とは「目的を選手と共有し、個別の課題が明確な練習」。ただきつい練習は疲労と怪我を生むだけ。フォームが崩れたらタイムへのこだわりを手放し、技術的課題に集中させる。

3. 【自己分析と主体性】選手自身が「こういう感覚の時に調子が良い」と言語化できる力を育てる。コーチが答えを与えすぎず、選手が自ら考え試行錯誤するプロセスを大切にする。

4. 【TSS（タイム＋ストローク数＋心拍数）の最小化】タイム・ストローク数・心拍数の合計値を小さくすることを選手に意識させる。これが効率的な泳ぎの追求につながる。

5. 【水感・浮力・ブレーキゼロ】フォームの本質は「体が浮いた状態で重心を止めずに連続的に移動すること」。ハイエルボー等の形よりも、水中で力を効率的に伝える感覚を優先する。

6. 【成功体験の積み重ね】試合だけでなく日々の練習でタイムトライアル等を取り入れ「やれば速くなる」実感を持たせる。小さな成功体験がモチベーション維持の土台となる。

7. 【80:20の法則（分極化トレーニング）】週の練習のうち約2割を高強度（EN3レベル）、残り8割を有酸素的強度に抑える。ただし1〜2ヶ月の集中期間で意図的に過負荷をかけることもある。

8. 【疲労サインへの敏感な対応】選手の表情・言動の変化（元気がない、弱音、口数減少）を見逃さない。疲労サインがあれば本数・サークル・強度を即調整する。

9. 【ストローク優先・キックは補助】キックは推進力よりもストロークのバランス補助として捉える。まず土台となるストロークを確立し、その上でキックを連動させる。

10. 【安全第一・怪我させない】年齢・疲労を最優先。マスターズは「怪我をさせないこと」が最重要。追い込みすぎず、長く水泳を楽しめる体を守る。

【出力指示】
- 必ず指定のJSONオブジェクト1つのみ。説明文は不要。
- 上記コーチ思想の種目ルール・強度ルール・期ごとの制御を厳守すること。
- サークル等は資料・条件に基づく値のみ使用（捏造禁止）。

【今日の狙い・指導ポイント・注意点の必須カスタマイズ】
- intention（今日の狙い）: 期・目的・状況・距離タイプ・年齢を必ず反映。コーチ思想（楽しさ・質・自己分析）を体現した、このメニュー固有の狙いを書く。汎用文のコピペ禁止。
- coachingPoint（指導ポイント）: このメニューのDrill/Kick/Pull/Main等の内容に即した具体的な意識点を3つ。TSS最小化・水感・ブレーキゼロの視点を含める。
- caution（注意点）: 状況（疲労・月経期等）・年齢を必ず反映。フォームを崩さない範囲での取り組みを促す注意を3つ。汎用文禁止。

【「内容」列の必須ルール】
各セクションに具体的な指示を必ず含めること。共有参照資料のパターン（SKPS, IM Order, Des, Variable, DPS, Ac/CA, Negative split 等）を積極的に使い、同じ表現の繰り返しを避ける。
- **Br・FlyのDrillで「左右交互」は使用禁止**。BrはBrキック・Brプル・タイミング等、Flyは片キック・ドルフィンキック等、種目に合ったドリル名を書く。
- **kick と pull のブロック名は英語で書く**: 「キック」→「Kick」、「プル」→「Pull」とする。例: Kick 4×50m（EN1）、Pull 6×50m（DPS）（EN2）。
- W-up / Down: 種目は Cho 固定。warmUp と down の文字列に Fr/Fly/Ba/Br/IM を一切含めない。
- Dive: 期が調整期・テーパー期のときのみ。それ以外の期では空文字。
- Rest 以外は強度を ①〜⑦ に対応（A1/EN1/EN2 等）で書く。
- **強度の天井**: 期ごとにメイン・非メインの上限がある。リカバリー**③③**（Mainは③まで、④禁止）、基礎形成④③、発展形成④④、スピード持久⑤④、耐乳酸⑥④、調整⑤④、テーパー④③。これを超えないこと。
- **強度表記の統一**: 「EN5」「EN6」は使用禁止。AN1（⑤）・AN2（⑥）を使う。内容内のEN/AN表記と強度欄の番号を必ず一致させる。「目的×強度×理由」を正確に表現すること。
- **W-down前の神経刺激**: 練習の最後（Down前）に 25m×2本 MAX（強度⑦）などを入れてもよい。量ではなく神経刺激が目的。

【距離設計ありき（最優先）】
設計の第一軸は「入力された距離（2000〜8000m）」である。メニュー内容を先に決めず、**まず目標総距離から逆算して各ブロックの距離配分を決める**。ユーザーが選択した距離（例: 5000m）に対して、総距離がその前後±100mに必ず収まること。各セッションのTotalを積み上げ、合計が目標と一致するように設計する。距離未達時は期に応じて積み増し：①W-up・Pull／②Kick・Pull／③Pre-Main・Main／④Main前後／⑤数百m追加／⑥削りすぎず調整／⑦質を落とさず追加。

【距離整合の徹底（必須）】
各セクションの積み上げと総距離が必ず一致すること。設計の正確性と信頼性を最優先に、ブロックごとの「距離×本数×セット数」を合計し total に記載。W-up 内の距離・本数計算も実際の合計と一致させること。設計後に必ず検算すること。

【セッション分割と記入形式（必須）】
- 内容が分かれている場合は「→」でセッションを分けて記入。例: Cho 200m（A1）→ Cho 200m SKPS（A1）→ Cho 100m Build（EN1）
- **強度や意図が変わる場合は必ず行を分ける**。段階設計の可視化のため、今後もこの形式を維持すること。
- 各セッションごとに距離を明確にし、小計を出せる構造にすること。

【Pre-Main と Main の強度差（必須）】
Pre-Main は Main を最大化するための橋渡し。**必ず Main−1 段階に固定する。** Main④→Pre-Main③、Main⑤→Pre-Main④、Main⑥→Pre-Main④〜⑤。Pre-Main で Main と同じ強度にしない。

【ブロックの複数構成（必須）】
- W-up: 2〜3段階に分けた構成。距離×本数×セットを再確認。
- Kick: 発展形成期以降は2構成
- Pull: Fr中心で2構成。**効率づくりを優先**（Swim寄りにしない）。フォームと出力の安定が目的。
- Main: 基礎形成期以降は Pre-Main を含めて3段階程度

【耐乳酸期の特別ルール】
- 120分では全体約5000m前後を確保。Main 以外のブロックでも距離を積む。
- ⑥は短距離・低本数で管理。壊さない強化が目的。`;

/** 必須8項目のラベル（不足時レスポンス用） */
const REQUIRED_KEYS: { key: string; label: string }[] = [
  { key: 'period', label: '目的' },
  { key: 'stroke', label: '種目' },
  { key: 'distance', label: '距離(2000〜8000m)' },
  { key: 'age', label: '年齢' },
  { key: 'distanceType', label: '距離タイプ(S/M/D)' },
  { key: 'level', label: 'レベル' },
  { key: 'condition', label: '状況' },
  { key: 'practiceTime', label: '練習時間(60/90/120)' },
];

/** 目標距離に基づくブロック配分を算出（50m単位で丸め、合計が目標に一致） */
function buildBlockAllocation(targetDist: number): { warmUp: number; drill: number; kick: number; pull: number; preMain: number; main: number; down: number } {
  const round50 = (n: number) => Math.round(n / 50) * 50;
  // 割合: W-up 12%, Drill 12%, Kick 12%, Pull 17%, Pre-Main 12%, Main 33%, Down 5%
  const wu = round50(targetDist * 0.12);
  const dr = round50(targetDist * 0.12);
  const kk = round50(targetDist * 0.12);
  const pl = round50(targetDist * 0.17);
  const pm = round50(targetDist * 0.12);
  const dn = round50(targetDist * 0.05);
  const main = Math.max(round50(targetDist * 0.30), 400); // Main は最低400m
  let sum = wu + dr + kk + pl + pm + main + dn;
  const diff = targetDist - sum;
  // 差分は Main で調整（±200m程度まで）
  const mainAdjusted = Math.max(400, main + (Math.abs(diff) <= 250 ? diff : diff > 0 ? 200 : -200));
  return {
    warmUp: Math.max(200, wu),
    drill: Math.max(150, dr),
    kick: Math.max(150, kk),
    pull: Math.max(200, pl),
    preMain: Math.max(150, pm),
    main: mainAdjusted,
    down: Math.max(100, dn),
  };
}

/** 配分の合計を確認し、目標に合わせて Main を微調整 */
function normalizeBlockAllocation(alloc: ReturnType<typeof buildBlockAllocation>, targetDist: number) {
  const { warmUp, drill, kick, pull, preMain, down } = alloc;
  const fixed = warmUp + drill + kick + pull + preMain + down;
  const mainNeeded = Math.max(400, targetDist - fixed);
  return { ...alloc, main: mainNeeded };
}

/** 入力不足チェック。不足があれば不足項目のラベル配列を返す（なければ null） */
function getMissingInputLabels(body: Record<string, unknown>): string[] | null {
  const missing = REQUIRED_KEYS.filter(({ key }) => {
    const v = body[key];
    return v === undefined || v === null || String(v).trim() === '';
  });
  if (missing.length === 0) return null;
  return missing.map(({ label }) => label);
}

/** 8条件に応じたカスタマイズ指示を組み立てる。全8項目を必ず反映し、設計の根拠とする。 */
function buildConditionInstructions(
  period: string,
  stroke: string,
  distance: string,
  age: string,
  distanceType: string,
  level: string,
  condition: string,
  practiceTime: string
): string {
  const ageNum = parseInt(age, 10) || 20;
  const timeNum = parseInt(practiceTime, 10) || 90;
  const isMasters = level.includes('マスターズ');
  const targetDist = distance ? parseInt(distance, 10) : null;

  const intensityCeiling: Record<string, { main: string; nonMain: string }> = {
    '1': { main: '③', nonMain: '③' },
    '2': { main: '④', nonMain: '③' },
    '3': { main: '④', nonMain: '④' },
    '4': { main: '⑤', nonMain: '④' },
    '5': { main: '⑥', nonMain: '④' },
    '6': { main: '⑤', nonMain: '④' },
    '7': { main: '④', nonMain: '③' },
  };

  const periodGuide: Record<string, string> = {
    '1': `①リカバリー期: 回復・感覚維持。Mainは③まで（④禁止）。Diveなし。**距離未達時（例: 4000m目標）はW-up・Pullで必ず積み増しして目標に届かせる。**`,
    '2': `②基礎形成期: EN1〜EN2中心。Mainは③中心に④は補助。Diveなし。**距離未達時（例: 5000m目標）はKick・Pullで必ず距離を追加して目標に届かせる。**`,
    '3': `③発展形成期: 質と量の両立。Kick・Pullは2構成必須。Diveなし。**距離未達時（例: 5000m目標）はPre-Main・Mainの距離をやや増やして目標に届かせる。**`,
    '4': `④スピード持久期: ⑤をMainで明確に使う。Pre-Mainは④までで抑えMain最大化。Diveなし。**距離未達時（例: 5000m目標）はMain前後（Pre-Main・Main）で必ず積み増しして目標に届かせる。**`,
    '5': `⑤耐乳酸期: 量の中で耐乳酸。**距離未達時（例: 5000m目標）はあと数百mを各ブロックで追加して必ず5000m前後に届かせる。**`,
    '6': `⑥調整期: 距離・強度を下げる。Dive導入可。**距離未達時（例: 5000m目標）は削りすぎず、必ず5000m前後に調整して届かせる。**`,
    '7': `⑦テーパー期: 量より質。**距離未達時（例: 3000m目標）は質を落とさず距離を少し追加して必ず目標に届かせる。**`,
  };
  const strokeGuide: Record<string, string> = {
    Fr: '自由形: W-upはFR・IM多め。Drillは片手・キャッチアップ等（左右交互可）。Kick/PullはFR中心。Pullは効率づくり（DPS等）を優先、Swim寄りにしない。',
    Ba: '背泳ぎ: 専門種目をW-upで少なめに。Ba専門のドリル（片手・左右交互等）・キック・プルを入れる。',
    Br: '平泳ぎ: **Drillは「左右交互」を使わない**。Brキックドリル・プルドリル・タイミングドリル・フィンBr等、Brに特化したドリル名を書く。',
    Fly: 'バタフライ: **Drillは「左右交互」を使わない**。片キック・ドルフィンキック・ショルダードリル等、Flyに特化したドリル名を書く。',
    IM: '個人メドレー: 4泳法のバランス。W-upでIM多め。ドリルは泳法別（Fr片手、Brキック等）に分けて具体的に。',
    S1: 'スタイル1: メイン種目に合わせたドリル・キック・プル。種目名はS1のままでよい。',
  };
  const conditionGuide: Record<string, string> = {
    良好: '状況=良好: 通常の強度・量で設計してよい。',
    軽疲労: '状況=軽疲労: MainやKickの強度を一段下げ、レストを長めに。',
    '筋疲労（筋トレ後）': '状況=筋疲労: プル・キックの負荷に配慮。Mainは短めか強度下げる。',
    '疲労残り（メイン翌日）': '状況=疲労残り: リカバリー寄り。W-up/Drill/Down多め、Mainは軽め。休息を入れる。',
    月経期: '状況=月経期: 本人の希望を最優先。強度・量を下げ、休息・Downを多めに。',
  };
  const distanceGuide: Record<string, string> = {
    S: '距離タイプ=S（スプリント）: Mainは25〜50m中心。レスト長め・スピード重視。',
    M: '距離タイプ=M（ミドル）: Mainは50〜100m。レースペース・耐乳酸の組み合わせ。',
    D: '距離タイプ=D（ディスタンス）: Mainは100m以上も可。持久・レースペース持続。',
  };
  const levelGuide: Record<string, string> = {
    '全国大会入賞〜代表クラス': 'レベル=全国大会入賞〜代表: 量・強度とも高め。Mainの本数・レスト・強度をしっかり設定。',
    '上級（選手クラス〜全国大会）': 'レベル=上級: 量・強度を高めに。技術を崩さない範囲で負荷を設定。',
    '中級（育成クラス〜県大会）': 'レベル=中級: 技術・フォームを優先。強度は段階的に。説明を丁寧に。',
    '初級（4泳法完泳）': 'レベル=初級: 技術習得とフォーム固め最優先。強度控えめ、ドリル・キック多め。',
    'マスターズ（記録狙い）': 'レベル=マスターズ: 量より質。強度は年齢相応に下げる。疲れさせすぎない。強化期でなければ「やや多め」は控える。',
  };
  const ceiling = intensityCeiling[period];
  const ceilingNote = ceiling ? `強度の天井: メイン${ceiling.main}まで、非メイン${ceiling.nonMain}まで。` : '';

  const lines: string[] = [
    '【必須】この8条件すべてから導いた練習設計にすること。全項目を反映した上でメニューを組み立てる。',
    '',
    `1. 目的（期）: ${periodGuide[period] || `期=${period}: 上記の期の定義に沿って重点を置く。`} ${ceilingNote}`,
    `2. 種目: ${strokeGuide[stroke] || `種目=${stroke}: その種目に合ったドリル・キック・プルにする。`}`,
    `3. 距離（目標）: 目標距離=${distance}m。総距離は${targetDist ? `この目標の前後±100m程度（${Math.max(0, targetDist - 100)}〜${targetDist + 100}m）に収める` : '目標に合わせて設計する'}こと。まず距離配分を決めてから内容を設計すること。`,
    `4. 年齢: 年齢=${age}歳。年齢補正を強度に反映。${ageNum < 13 ? 'Kick比率高め・説明を丁寧に。' : ageNum >= 40 ? '強度-2〜3、安全最優先。' : '高校・大学基準でよい。'}`,
    `5. 距離タイプ: ${distanceGuide[distanceType] || `距離タイプ=${distanceType}: Mainセットの距離・本数・レストをそれに合わせる。`}`,
    `6. レベル: ${levelGuide[level] || (isMasters ? levelGuide['マスターズ（記録狙い）'] : `レベル=${level}: 育成〜初級は技術・フォーム優先、全国〜代表は量・強度高め。`)}`,
    `7. 状況: ${conditionGuide[condition] || `状況=${condition}: 疲労・コンディションに合わせて強度・量・休息を調整する。`}`,
    `8. 練習時間: ${timeNum}分。総距離は目標${distance}mに合わせる。レベルと状況で増減。`,
  ];
  return lines.join('\n');
}

const INTERNAL_ERROR_JSON = { error: 'internal_error', message: '現在生成できません。時間をおいて再試行してください' } as const;

export async function POST(request: NextRequest) {
  const ensureJson500 = () =>
    NextResponse.json(INTERNAL_ERROR_JSON, { status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8' } });

  try {
    let user = null;
    try {
      user = await getEffectiveUser();
    } catch (authErr) {
      console.error('[custom-menu] getEffectiveUser error:', authErr);
      return ensureJson500();
    }
    if (!user) {
      return NextResponse.json(
        { error: 'login_required', message: 'ログインが必要です' },
        { status: 401, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
      );
    }

    try {
    const apiKey = (process.env.OPENAI_API_KEY || '').trim().replace(/\r?\n/g, '');
    console.log('[custom-menu] POST: OPENAI_API_KEY exists:', apiKey.length > 0, 'keyPrefix:', apiKey ? `${apiKey.slice(0, 7)}...` : 'none');
    if (!apiKey || apiKey === 'YOUR_API_KEY_HERE') {
      console.error('[custom-menu] OPENAI_API_KEY not configured');
      return ensureJson500();
    }

    let body: Record<string, unknown>;
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return NextResponse.json(
        { error: 'リクエストのJSON形式が不正です。' },
        { status: 400 }
      );
    }
    const missingLabels = getMissingInputLabels(body);
    if (missingLabels) {
      return NextResponse.json(
        {
          error: '入力が不足しています。以下の項目を入力してください。',
          missingItems: missingLabels,
        },
        { status: 400 }
      );
    }

    const {
      period,
      stroke,
      distance,
      age,
      distanceType,
      level,
      condition,
      practiceTime,
    } = body as Record<string, string>;

    const conditionInstructions = buildConditionInstructions(
      period,
      stroke,
      distance,
      age,
      distanceType,
      level,
      condition,
      practiceTime
    );

    const targetDist = distance ? parseInt(distance, 10) : null;
    const alloc = targetDist && targetDist >= 2000 && targetDist <= 8000
      ? normalizeBlockAllocation(buildBlockAllocation(targetDist), targetDist)
      : null;

    const periodLabels: Record<string, string> = {
      '1': '① リカバリー期', '2': '② 基礎形成期', '3': '③ 発展形成期',
      '4': '④ 強化期 (スピード持久力)', '5': '⑤ 強化期 (耐乳酸)', '6': '⑥ 調整期', '7': '⑦ テーパー期',
    };

    const distanceAllocationSection = alloc
      ? `
【距離配分（絶対遵守・設計の最優先軸）】
目標総距離: **${targetDist}m**。以下の各ブロック距離を満たさないと不合格。合計が${targetDist - 100}〜${targetDist + 100}mに収まらないメニューは出さないこと。
| ブロック | 必達距離 | 例 |
| W-up | ${alloc.warmUp}m | Cho 200m→200m→100m 等 |
| Drill | ${alloc.drill}m | 本数×距離で合計${alloc.drill}m |
| Kick | ${alloc.kick}m | 本数×距離で合計${alloc.kick}m |
| Pull | ${alloc.pull}m | 本数×距離で合計${alloc.pull}m |
| Pre-Main | ${alloc.preMain}m | 本数×距離で合計${alloc.preMain}m |
| Main | ${alloc.main}m | 本数×距離で合計${alloc.main}m |
| Down | ${alloc.down}m | Easy Swim ${alloc.down}m 等 |
→ 合計が${targetDist}mになるよう、各ブロックの距離×本数を設計すること。

【距離未達時の積み増し先】${{
      '1': '①リカバリー: W-up・Pullで積み増し',
      '2': '②基礎形成: Kick・Pullで距離追加',
      '3': '③発展形成: Pre-Main・Mainで増やす',
      '4': '④スピード持久: Main前後で積み増し',
      '5': '⑤耐乳酸: あと数百m追加して5000m前後に',
      '6': '⑥調整: 削りすぎず5000m前後に調整',
      '7': '⑦テーパー: 質を落とさず距離を少し追加',
    }[period] || ''}
`
      : '';

    const buildUserPrompt = (distanceRetryHint?: string) =>
      `以下の「入力条件」と「反映ルール」に従い、この8条件から導いた水泳練習メニューを1つだけ生成してください。
**必須**：8条件すべてを設計の根拠とし、**距離配分を最優先**に設計すること。出力は必ず指定のJSONのみ（説明文は不要）。
${distanceRetryHint ?? ''}
${distanceAllocationSection}

【入力条件（8項目すべてを満たすこと）】
1. 目的（期）: ${periodLabels[period] || period}
2. 種目: ${stroke}
3. 距離（目標）: ${distance}m ← 総距離はこの値の前後±100mに必ず収める
4. 年齢: ${age}歳
5. 距離タイプ: ${distanceType}
6. レベル: ${level}
7. 状況: ${condition}
8. 練習時間: ${practiceTime}分

【反映ルール】
${conditionInstructions}

【出力形式】以下のキーをすべて含むJSONオブジェクト1つのみ。各値は文字列。順序・省略禁止。
- main には必ずMainカテゴリを明記すること（ベースメイン／ベストアベレージ／ダイハード／耐乳酸MAX／Standard Main のいずれか）。
- intention / coachingPoint / caution は必ずこの8条件に合わせてカスタマイズすること。汎用表現のコピペ禁止。
【intention（今日の狙い）】期・目的・状況・距離タイプ・年齢を反映した2〜4行。このメニュー固有の狙いを具体的に書く。
【coachingPoint（指導ポイント）】このメニューのDrill/Kick/Pull/Main等に即した箇条書き3つ。
【caution（注意点）】状況・年齢・疲労・月経期等を反映した箇条書き3つ。
【expectedEffect】このメニューで得られる効果を2〜3行で。
{
  "purpose": "【目的】1行で明確に（目的・期・状況を反映）",
  "warmUp": "2〜3段階。→で区切り。**上記距離配分のW-up目標距離を満たす**距離×本数×セット。例: Cho 200m（A1）→ Cho 200m SKPS（A1）→ Cho 100m Build（EN1）",
  "drill": "ドリル名 本数×距離m（内容）。**Drill目標距離を満たす**。Fr/Baは片手・左右交互可。**Br/Flyは「左右交互」禁止**。Br例: Brキックドリル 6×50m（フィン）、Fly例: 片キック 6×50m",
  "kick": "発展形成期以降は2構成。→で区切る。**Kick目標距離を満たす**。例: Kick 4×50m（Des）（EN1）→ Kick 4×50m（Fins）（EN2）",
  "pull": "Pull 2構成。Fr中心で効率づくり。**Pull目標距離を満たす**。→で区切る。例: Pull Fr 4×50m（DPS）（EN1）→ Pull Fr 4×100m（EN2）",
  "preMain": "Pre-Main 本数×距離m（強度）。**Pre-Main目標距離を満たす**。Mainより一段階抑えた橋渡し。例: Pre-Main 4×50m（EN2）",
  "dive": "Dive 本数×距離m（A1）。不要時は空文字",
  "rest": "Rest / Free time（5~10min）。不要時は空文字",
  "main": "Main（カテゴリ名）本数×距離m @〇〇秒（強度）。**Main目標距離を満たす**。基礎形成期以降は3段階構成可。例: Main（ベストアベレージ）8×25m @30秒（EN3）",
  "down": "種目名を書かず Cho 固定。**Down目標距離を満たす**。Easy Swim 距離m（A1）（例: Easy Swim 100m（A1））",
  "total": "合計距離：〇〇〇〇m（必ず目標距離${distance}mの前後±100m。各ブロック合計と一致）",
  "intention": "今日の狙い（2〜4行。期・目的・状況・距離タイプ・年齢を反映した、このメニュー固有の狙い）",
  "coachingPoint": "指導ポイント（箇条書き3つ。改行または・で区切り1つに。このメニューのブロックに即した具体的な意識点）",
  "caution": "注意点（箇条書き3つ。改行または・で区切り1つに。状況・年齢・疲労・月経期等を反映した、この選手・この日に必要な注意）",
  "expectedEffect": "期待効果（2〜3行。このメニューで得られる効果）"
}${targetDist ? `\n\n**最終確認**: 各ブロックの距離×本数を合計すると必ず${targetDist}mの前後±100mになること。${alloc ? `上記の距離配分表を満たすこと。` : ''}少なければW-up・Kick・Pull・Main等で距離を追加する。` : ''}`;

    let protocolContent = '';
    let promptContent = '';
    let commonContent = '';
    try {
      [protocolContent, promptContent, commonContent] = await Promise.all([
        getProtocolContent(),
        getPromptContent(),
        getCommonContent(),
      ]);
    } catch (contentErr) {
      console.error('[custom-menu] getProtocolContent/getPromptContent/getCommonContent error:', contentErr);
      // コンテンツ取得失敗時は空のまま続行（メニュー生成は可能）
    }

    let systemContent = '';
    // 1. プロトコル（思想）※最優先。高城直基コーチ50問インタビュー＋RTルール
    if (protocolContent) {
      systemContent +=
        '【プロトコル＝ジェネレート（必ず従うこと。立石諒・高城直基監修の思想・定義・絶対ルールの正本）】\n\n' +
        '※以下のコーチ思想（50問インタビュー）とRT_MENU_GENERATION_RULESを最優先に反映すること。\n\n' +
        protocolContent +
        '\n\n---\n\n';
    }
    // 2. プロンプト用オーバーライド（content/common/prompt.pdf 等。あれば追加）
    if (promptContent) {
      systemContent +=
        '【追加プロンプト】\n' +
        promptContent +
        '\n\n---\n\n';
    }
    // 3. 共有参照資料（辞書・実施例）
    if (commonContent) {
      systemContent +=
        '【共有参照資料（内容パターン・実施例・用語）】\n' +
        '以下の表現・パターン（SKPS, IM Order, Des, Variable, DPS, Ac/CA, Negative split など）を積極的に取り入れ、' +
        '内容のレパートリーを豊かにしてください。同じ文言の繰り返しを避け、条件に合うバリエーションを選んでください。\n\n' +
        commonContent +
        '\n\n---\n\n';
    }
    // 4. 出力形式・補足ルール（プロトコルに含まれない部分）
    systemContent += CORE_SYSTEM_PROMPT;

    const keys = [
      'purpose', 'warmUp', 'drill', 'kick', 'pull', 'preMain', 'dive', 'rest',
      'main', 'down', 'total', 'intention', 'coachingPoint', 'caution', 'expectedEffect',
    ];
    const DISTANCE_TOLERANCE = 100;
    const openai = new OpenAI({ apiKey });

    const doGenerate = async (retryHint?: string): Promise<string | null> => {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemContent },
          { role: 'user', content: buildUserPrompt(retryHint) },
        ],
        temperature: retryHint ? 0.4 : 0.6,
        max_tokens: 4096,
        response_format: { type: 'json_object' },
      });
      return completion.choices[0]?.message?.content?.trim() ?? null;
    };

    let content = await doGenerate();
    if (!content) {
      console.error('[custom-menu] Empty completion content');
      return NextResponse.json(INTERNAL_ERROR_JSON, { status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8' } });
    }

    const parseAndNormalize = (raw: string): Record<string, string> | null => {
      try {
        const parsed = JSON.parse(raw) as Record<string, unknown>;
        if (!keys.every((k) => typeof parsed[k] === 'string')) return null;
        const result = Object.fromEntries(keys.map((k) => [k, String(parsed[k] ?? '')]));
        const calculatedTotal = sumMenuDistance(result);
        if (calculatedTotal > 0) {
          result.total = `合計距離：${calculatedTotal.toLocaleString()}m`;
        }
        return result;
      } catch {
        return null;
      }
    };

    let result = parseAndNormalize(content);
    if (!result) {
      return NextResponse.json({ menu: content, result: null });
    }

    let calculatedTotal = sumMenuDistance(result);
    const isWithinRange =
      targetDist == null || targetDist < 2000 || targetDist > 8000 ||
      Math.abs(calculatedTotal - targetDist) <= DISTANCE_TOLERANCE;

    if (!isWithinRange && targetDist != null) {
      const diff = calculatedTotal - targetDist;
      const retryHint = `【重要・再生成】前回の生成で総距離が目標${targetDist}mより${Math.abs(diff)}m${diff < 0 ? '不足' : '超過'}していました。今回**必ず**${targetDist - DISTANCE_TOLERANCE}〜${targetDist + DISTANCE_TOLERANCE}mに収めてください。各ブロックの距離×本数を積み上げて合計が目標になるように設計し直してください。\n\n`;
      console.log('[custom-menu] Distance out of range, retrying:', { targetDist, calculatedTotal, diff });
      const retryContent = await doGenerate(retryHint);
      if (retryContent) {
        const retryResult = parseAndNormalize(retryContent);
        if (retryResult) {
          const retryTotal = sumMenuDistance(retryResult);
          if (Math.abs(retryTotal - targetDist) <= DISTANCE_TOLERANCE) {
            result = retryResult;
            calculatedTotal = retryTotal;
          }
        }
      }
    }

    // 最終的に範囲外の場合、コーチメモで警告を付与
    if (targetDist != null && targetDist >= 2000 && targetDist <= 8000) {
      const finalTotal = sumMenuDistance(result);
      const finalDiff = finalTotal - targetDist;
      if (Math.abs(finalDiff) > DISTANCE_TOLERANCE) {
        const coachNote = `※総距離が目標${targetDist}mより${Math.abs(finalDiff)}m${finalDiff < 0 ? '不足' : '超過'}しています。必要に応じて再生成をお試しください。`;
        const existing = (result.expectedEffect ?? '').trim();
        result.expectedEffect = existing ? `${existing}\n\n${coachNote}` : coachNote;
        console.log('[custom-menu] Distance still out of range after retry, added coachNote:', { targetDist, finalTotal });
      }
    }

    return NextResponse.json({ result, menu: null });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[custom-menu] POST error (HTTP 500):', message, err);
    const errObj = err as { status?: number; response?: { status?: number; headers?: Headers; body?: unknown }; message?: string };
    const status = errObj?.status ?? errObj?.response?.status;
    const contentType = errObj?.response?.headers?.get?.('content-type') ?? '';
    const body = errObj?.response?.body;
    const isOpenAIError = status != null || (errObj?.response != null);
    if (isOpenAIError) {
      console.error('[custom-menu] OpenAI error detail:', {
        status,
        contentType: contentType?.slice(0, 50),
        bodyHint: body != null ? (typeof body === 'object' ? JSON.stringify(body).slice(0, 300) : String(body).slice(0, 300)) : undefined,
      });
    }
    const isAuthError =
      String(message).includes('API key') ||
      String(message).includes('401') ||
      String(message).includes('403') ||
      String(message).includes('Incorrect API key');
    const isQuotaError =
      String(message).includes('429') ||
      String(message).includes('quota') ||
      String(message).includes('billing');
    let errorText: string;
    if (status === 401 || status === 403) {
      errorText = 'キーが無効か権限不足です。OpenAIのAPIキーとモデル(gpt-4o-mini)の利用可否を確認してください。';
    } else if (contentType.includes('text/html')) {
      errorText = 'OpenAIではなくHTMLが返っています。認証・プロキシ・ネットワークを確認してください。';
    } else if (isAuthError) {
      errorText = 'APIキーが無効です。.env.ai の OPENAI_API_KEY を確認してください。';
    } else if (isQuotaError) {
      errorText =
        'OpenAIの利用枠を超えました。Billingで支払い方法を追加するか、「クイック作成」ボタンをご利用ください。';
    } else if (isOpenAIError) {
      errorText = `メニュー生成エラー: ${message}`;
    } else {
      errorText = `サーバーエラー(500): ${message}. 環境変数とターミナルログを確認してください。`;
    }
    console.error('[custom-menu] Error detail:', errorText);
    return ensureJson500();
  }
  } catch (outerErr: unknown) {
    const msg = outerErr instanceof Error ? outerErr.message : String(outerErr);
    console.error('[custom-menu] POST uncaught (500):', msg, outerErr);
    return ensureJson500();
  }
}
