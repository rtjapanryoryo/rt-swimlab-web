import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import path from 'path';
import { config as loadEnv } from 'dotenv';
import { getEffectiveUser } from '@/lib/supabase/server';
import OpenAI from 'openai';
import { getCommonContent, getProtocolContent, getPromptContent, getRTMenuProtocolContent, getRTJapanPracticeContent } from '@/lib/rt/content';
import { sumMenuDistance } from '@/lib/rt/menu-distance';
import { validateDistanceTime, isDistanceValidForType } from '@/lib/rt/distance-time-validation';
import {
  buildProfessionalSearchQueries,
  searchMultiple,
  formatSearchResultsForPrompt,
} from '@/lib/web-search';

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
**RT Japan練習内容を主軸とする。** 各セクションにRT Japanレベルの具体性（1〜3:Fin 4〜6:Finなし、Des to fast、25mFast/25mEasy、o:Fast e:Easy、ヘッドアップ、スカーリング、Form & Des 等）を必ず含めること。**チープ・汎用表現（「Cho 200m」「Kick 4×50m」のみ等）は禁止。** menu-dictionary と RT Japan のパターンを積極的に使い、種目・期・距離タイプに特化した固有の内容にする。本数は**少なめ×長い距離**を優先（4×100m、3×200m、2×400m 等）。
- **Br・FlyのDrillで「左右交互」は使用禁止**。BrはBrキック・Brプル・タイミング等、Flyは片キック・ドルフィンキック等、種目に合ったドリル名を書く。
- **kick と pull のブロック名は英語で書く**: 「キック」→「Kick」、「プル」→「Pull」とする。例: Kick 4×50m（EN1）、Pull 6×50m（DPS）（EN2）。
- W-up / Down: 種目は Cho 固定。warmUp と down の文字列に Fr/Fly/Ba/Br/IM を一切含めない。
- **W-upの簡潔さ（必須）**: W-up は「ほぐし」が目的。**1〜2セグメントで十分**。SKPS、IM Order、Variable、Des、Build 等を必ず1つ含む。距離稼ぎでセグメントを増やさない。例: Cho 400m（A1）、Cho 200m SKPS（A1）→ Cho 200m Build（EN1）。menu-dictionary の W-up バリエーションから選ぶ。
- Dive: 期が調整期・テーパー期のときのみ。それ以外の期では空文字。
- Rest 以外は強度を ①〜⑦ に対応（A1/EN1/EN2 等）で書く。
- **強度の天井**: 期ごとにメイン・非メインの上限がある。リカバリー**③③**（Mainは③まで、④禁止）、基礎形成④③、発展形成④④、スピード持久⑤④、耐乳酸⑥④、調整⑤④、テーパー④③。これを超えないこと。
- **強度表記の統一（絶対厳守）**: 「EN5」「EN6」は定義外のため**絶対に出力しない**。⑤＝AN1、⑥＝AN2のみ使用。内容内のEN/AN表記と強度欄の番号（①〜⑦）を**必ず完全一致**させる。「目的×強度×理由」を正確に示すこと。
- **W-down前の神経刺激**: 練習の最後（Down前）に 25m×2本 MAX（強度⑦）などを入れてもよい。量ではなく神経刺激が目的。

【距離設計ありき（最優先）】
設計の第一軸は「入力された距離（2000〜8000m）」である。**目的は入力距離と実際の練習総距離を一致させること。** メニュー内容を先に決めず、**まず目標総距離から逆算して各ブロックの距離配分を決める**。ユーザーが選択した距離（例: 5000m）に対して、各ブロックの距離×本数を積み上げた**実際の合計**がその前後±100mに必ず収まること。表示上の整合ではなく、計算可能な総距離が目標に届くように設計する。距離未達時は期に応じて積み増し：①W-up・Pull／②Kick・Pull／③Pre-Main・Main／④Main前後／⑤数百m追加／⑥削りすぎず調整／⑦質を落とさず追加。

【距離整合の徹底（必須）】
各セクションの積み上げと総距離が必ず一致すること。設計の正確性と信頼性を最優先に、ブロックごとの「距離×本数×セット数」を合計し total に記載。**出力前に必ず「総距離＝入力距離±100m に一致しているか」を最終確認する。** 整合していなければ設計を修正すること。

【セッション分割と記入形式（必須・厳守）】
- **W-up・Kick・Pull・Pre-Main・Main で、内容や意図が分かれている場合は絶対に1セッションにまとめない。** 必ず「→」でセッションを分けて記入する。段階設計を明確にすること。
- **強度が変わる場合は必ず「→」でセッションを分ける。** 1ブロック内に強度の異なる内容を混在させない。「目的×強度×理由」を可視化すること。
- **各セッションごとに距離を明示する。** →で区切った各単位で「〇〇m」または「本数×距離m」が計算可能であること。小計を出せる構造にする。

【Pre-Main と Main の強度差（必須）】
Pre-Main は Main を最大化するための橋渡し。**Pre-Main は必ず Main−1 段階で設計する。** Main④→Pre-Main③、Main⑤→Pre-Main④、Main⑥→Pre-Main④〜⑤。Pre-Main で Main と同じ強度にしてはいけない。

【セット距離の柔軟性（必須）】
各ブロックの距離単位は25m・50mに限定しない。100m、200m、400m、800mなど、目的・期・総距離に応じて柔軟に使い分ける。例: Kick 4×100m、Pull 3×200m、Main 4×400m、Main 2×800m等。**目標7000m以上では特に100m・200m・400m単位を積極的に使い、総距離に確実に届くこと。**

【ブロックの複数構成（必須）】
- W-up: **1〜2セグメント**。距離稼ぎ目的で複数に分けない。SKPS/IM/Variable等を必ず含む。
- Kick: 発展形成期以降は2構成。**少ない本数×長い距離**を優先（例: 4×100m、4×200m）。
- Pull: Fr中心で2構成。**効率づくりを優先**（Swim寄りにしない）。200m・400m単位を積極的に。
- Main: 基礎形成期以降は Pre-Main を含めて3段階程度。50m×20本より 100m×8本、200m×4本 等を優先。

【ブロック間の連動（内容の一貫性）】
各ブロックはバラバラではなく、Main に向けた流れで設計する。W-upで全身をほぐす→Drillで今日の技術テーマを入れる→Kickで下半身の土台→Pullで効率づくり→Pre-MainでMain−1強度のリハーサル→Mainで本題。この順序で「次のブロックにつながる」ように内容を選ぶこと。

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
  // W-up: 8%、上限500m（過剰防止・Quickテンプレは200–600m程度）
  // Drill 12%, Kick 12%, Pull 17%, Pre-Main 12%, Main 残り, Down 5%
  const wuRaw = round50(targetDist * 0.08);
  const wu = Math.min(Math.max(200, wuRaw), 500);
  const dr = round50(targetDist * 0.12);
  const kk = round50(targetDist * 0.12);
  const pl = round50(targetDist * 0.17);
  const pm = round50(targetDist * 0.12);
  const dn = round50(targetDist * 0.05);
  const main = Math.max(round50(targetDist * 0.32), 400); // W-up減らした分を Main にシフト
  let sum = wu + dr + kk + pl + pm + main + dn;
  const diff = targetDist - sum;
  const mainAdjusted = Math.max(400, main + (Math.abs(diff) <= 250 ? diff : diff > 0 ? 200 : -200));
  return {
    warmUp: wu,
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
    '1': `①リカバリー期: 回復・感覚再構築。**Mainは③までに抑える**（④禁止）。Diveなし。距離未達時はW-up・Pullで必ず積み増し。`,
    '2': `②基礎形成期: 持久基盤形成。**Mainは③中心に④は補助**（④寄りにしない）。Diveなし。距離未達時はKick・Pullで必ず距離を積み増し。`,
    '3': `③発展形成期: 質と量の両立。Kick・Pullは2構成必須。**EN5・EN6は使用禁止、⑤AN1・⑥AN2に統一**。Diveなし。距離未達時はPre-Main・Mainで距離を増やす。`,
    '4': `④スピード持久期: 高強度持久への移行。**⑤はMainで明確に使用**（④止まりにしない）。Pre-Mainは④までで抑えMain最大化。Diveなし。距離未達時はMain前後で積み増し。`,
    '5': `⑤耐乳酸期: 量の中で耐乳酸適応。**耐乳酸内容は強度⑤または⑥で統一**（強度番号と内容を一致）。距離未達時はW-up・Kick・Pullも含めて距離を調整。`,
    '6': `⑥調整期: 疲労を抜きながら動きを整える。**刺激と回復を分けて記入**。強度欄と内容を一致。距離が削られすぎないよう質を維持しつつ目標に合わせる。`,
    '7': `⑦テーパー期: 疲労を抜きキレを出す。**刺激部分は独立セッションに**。距離未達時はW-up・Pullで微調整。`,
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
    `8. 練習時間: ${timeNum}分。総距離は目標${distance}mに必ず合わせる。練習時間より距離を優先し、時間が短くても総距離を削減しない。`,
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
    const model = (process.env.OPENAI_MODEL || 'gpt-4o-mini').trim() || 'gpt-4o-mini';
    console.log('[custom-menu] POST: OPENAI_API_KEY exists:', apiKey.length > 0, 'model:', model);
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

    // 距離タイプ×距離の整合チェック（S: 2000-6000 / M: 3000-7000 / D: 6000-8000）
    if (distance && distanceType && !isDistanceValidForType(distance, distanceType)) {
      return NextResponse.json(
        {
          error: '距離と距離タイプの組み合わせが無効です。スプリントは2000-6000m、ミドルは3000-7000m、ディスタンスは6000-8000mの範囲で選択してください。',
        },
        { status: 400 }
      );
    }

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

    const timeNum = parseInt(practiceTime, 10) || 90;
    const distPerMin = targetDist != null && timeNum > 0 ? targetDist / timeNum : 0;
    const isDenseSession = targetDist != null && timeNum > 0 && distPerMin > 100;

    const distanceAllocationSection = alloc && targetDist != null
      ? `
【最重要・距離は変更禁止】以下の数値を**そのまま**warmUpM, drillM, kickM, pullM, preMainM, mainM, downM に出力すること。推測や調整をしてはいけない。
| warmUpM | drillM | kickM | pullM | preMainM | mainM | downM | 合計 |
| ${alloc.warmUp} | ${alloc.drill} | ${alloc.kick} | ${alloc.pull} | ${alloc.preMain} | ${alloc.main} | ${alloc.down} | **${targetDist}m** |
各ブロックのテキストは上記の距離に届くこと。**ただし W-up は1〜2セグメントに抑え、距離稼ぎで細かく分けない。** 距離を満たすには本数を増やすより**距離単位を大きく**する（例: 50m×20本より 200m×4本、400m×2本）。W-up例: Cho ${alloc.warmUp}m（A1）、または Cho 200m SKPS（A1）→ Cho ${Math.max(200, alloc.warmUp - 200)}m Build（EN1）。
${isDenseSession ? `※${timeNum}分で${targetDist}mは高密度。距離を絶対優先。レスト短縮で対応。\n` : ''}
【距離未達時の積み増し先】${{
      '1': '①リカバリー: W-up・Pull',
      '2': '②基礎形成: Kick・Pull',
      '3': '③発展形成: Pre-Main・Main',
      '4': '④スピード持久: Main前後',
      '5': '⑤耐乳酸: 数百m追加',
      '6': '⑥調整: 削りすぎず',
      '7': '⑦テーパー: 質を落とさず追加',
    }[period] || ''}
`
      : '';

    const buildUserPrompt = (distanceRetryHint?: string) =>
      `${distanceRetryHint ?? ''}${distanceAllocationSection ? `\n${distanceAllocationSection}\n` : ''}
以下の「入力条件」と「反映ルール」に従い、この8条件から導いた水泳練習メニューを1つだけ生成してください。
**必須**：上記の距離配分表の数値を**そのまま**使用すること。内容は距離に合わせて設計し、距離に合わせて内容を増やす。出力は必ず指定のJSONのみ（説明文は不要）。

【入力条件（8項目すべてを満たすこと）】
1. 目的（期）: ${periodLabels[period] || period}
2. 種目: ${stroke}
3. 距離（目標）: ${distance}m ← **入力距離と実際の総距離を一致させる**。各ブロック合計がこの値の前後±100mに必ず収める
4. 年齢: ${age}歳
5. 距離タイプ: ${distanceType}
6. レベル: ${level}
7. 状況: ${condition}
8. 練習時間: ${practiceTime}分

【出力5原則（厳守）】
①距離一致: 顧客入力${distance}m → 実際の総距離が${distance}m±100m以内に必ず収める。届かないメニューは不合格。
②総距離確認: 出力前に「総距離＝入力距離と一致しているか」を必ず確認する。
③セッション分割: W-up・Kick・Pull・Pre-Main・Mainで**内容や意図が分かれる場合は絶対に1セッションにまとめない**。「→」で必ずセッションを分ける。
④強度一致: 強度番号と内容内のEN/AN表記を必ず一致。EN5・EN6は使用禁止、⑤AN1・⑥AN2のみ。
⑤Pre-Main: Pre-Mainは必ずMain−1段階に固定。Mainを最大化する。

【反映ルール】
${conditionInstructions}

【出力形式】以下のキーをすべて含むJSONオブジェクト1つのみ。順序・省略禁止。
- main には必ずMainカテゴリを明記すること（ベースメイン／ベストアベレージ／ダイハード／耐乳酸MAX／Standard Main のいずれか）。
- intention / coachingPoint / caution は必ずこの8条件に合わせてカスタマイズすること。汎用表現のコピペ禁止。
- **距離紐づき（絶対）**: warmUpM, drillM, kickM, pullM, preMainM, mainM, downM は上記の距離配分表の数値を**そのままコピー**すること。変更・推測・四捨五入禁止。各ブロックのテキスト内容はこの数値に届くよう設計する。
【intention（今日の狙い）】期・目的・状況・距離タイプ・年齢を反映した2〜4行。このメニュー固有の狙いを具体的に書く。
【coachingPoint（指導ポイント）】このメニューのDrill/Kick/Pull/Main等に即した箇条書き3つ。
【caution（注意点）】状況・年齢・疲労・月経期等を反映した箇条書き3つ。
【expectedEffect】このメニューで得られる効果を2〜3行で。
{
  "purpose": "【目的】1行で明確に（目的・期・状況を反映）",
  "warmUp": "**1〜2セグメント**。SKPS/IM Order/Variable等を必ず含む。例: Cho 400m（A1）、または Cho 200m SKPS（A1）→ Cho 200m Build（EN1）。上記W-up目標距離を満たすこと。距離稼ぎで3つ以上に分けない。",
  "drill": "**具体的ドリル名** 本数×距離m（内容）。例: Cho S1 drill 8×50m（EN1）、IM Order 8×50m（EN1）、Brキックドリル 6×50m（フィン）。**Drill目標距離を満たす**。Br/Flyは「左右交互」禁止。",
  "kick": "発展形成期以降は2構成。Des、Fins、DPS等のパターン名を含む。**4×100m、4×200m 等の長距離セットを優先**。例: Kick 4×100m（Des）（EN1）→ Kick 4×100m（Fins）（EN2）。Kick目標距離を満たす。",
  "pull": "Pull 2構成。Fr中心。**4×100m、3×200m、3×400m 等の長距離を優先**。DPS、Variable、Negative split を内容に含める。例: Pull Fr 4×100m（DPS）（EN1）→ Pull Fr 3×200m（EN2）。Pull目標距離を満たす。",
  "preMain": "Pre-Main 本数×距離m（強度）。**Pre-Main目標距離を満たす**。Mainより一段階抑えた橋渡し。例: Pre-Main 4×50m（EN2）",
  "dive": "Dive 本数×距離m（A1）。不要時は空文字",
  "rest": "Rest / Free time（5~10min）。不要時は空文字",
  "main": "Main（カテゴリ名）本数×距離m @〇〇秒（強度）。**複数内容を1行にまとめない。** 強度が変わる場合は「→」でセッション分け。例: Main（ベストアベレージ）8×25m @30秒（EN3）→ Main 4×50m（EN2）。Main目標距離を満たすこと。",
  "down": "種目名を書かず Cho 固定。**Down目標距離を満たす**。Easy Swim 距離m（A1）（例: Easy Swim 100m（A1））",
  "total": "合計距離：〇〇〇〇m（必ず目標距離${distance}mの前後±100m。各ブロック合計と一致）",
  "intention": "今日の狙い（2〜4行。期・目的・状況・距離タイプ・年齢を反映した、このメニュー固有の狙い）",
  "coachingPoint": "指導ポイント（箇条書き3つ。改行または・で区切り1つに。このメニューのブロックに即した具体的な意識点）",
  "caution": "注意点（箇条書き3つ。改行または・で区切り1つに。状況・年齢・疲労・月経期等を反映した、この選手・この日に必要な注意）",
  "expectedEffect": "期待効果（2〜3行。このメニューで得られる効果）"${targetDist && alloc ? `,
  "warmUpM": ${alloc.warmUp},
  "drillM": ${alloc.drill},
  "kickM": ${alloc.kick},
  "pullM": ${alloc.pull},
  "preMainM": ${alloc.preMain},
  "mainM": ${alloc.main},
  "downM": ${alloc.down}
}` : ''}
}${targetDist && alloc ? `\n\n**最終確認**: warmUpM=${alloc.warmUp}, drillM=${alloc.drill}, kickM=${alloc.kick}, pullM=${alloc.pull}, preMainM=${alloc.preMain}, mainM=${alloc.main}, downM=${alloc.down} をそのまま出力。テキストはこれら距離に届くようセグメントを十分に入れる。` : ''}`;

    const serperKey = (process.env.SERPER_API_KEY || '').trim();
    const queries = buildProfessionalSearchQueries({ period, stroke, distanceType });

    let protocolContent = '';
    let rtMenuContent = '';
    let rtJapanContent = '';
    let promptContent = '';
    let commonContent = '';
    let webSearchText = '';

    const contentPromise = Promise.all([
      getProtocolContent(),
      getRTMenuProtocolContent(),
      getRTJapanPracticeContent(),
      getPromptContent(),
      getCommonContent(),
    ]).then(([a, b, c, d, e]) => ({ protocolContent: a, rtMenuContent: b, rtJapanContent: c, promptContent: d, commonContent: e }));

    const searchPromise =
      serperKey && queries.length > 0
        ? searchMultiple(queries, serperKey, 10).then(formatSearchResultsForPrompt)
        : Promise.resolve('');

    try {
      const [contentResult, searchResult] = await Promise.all([contentPromise, searchPromise]);
      protocolContent = contentResult.protocolContent;
      rtMenuContent = contentResult.rtMenuContent;
      rtJapanContent = contentResult.rtJapanContent;
      promptContent = contentResult.promptContent;
      commonContent = contentResult.commonContent;
      webSearchText = searchResult;
    } catch (contentErr) {
      console.error('[custom-menu] content load error:', contentErr);
    }

    let systemContent = '';
    // 0. 距離の最優先通知（目標がある場合）
    if (targetDist != null && targetDist >= 2000 && targetDist <= 8000) {
      systemContent +=
        `【最優先・距離】今回の目標総距離は **${targetDist}m** です。
- **練習時間より距離を絶対優先する**。60分指定でも8000m指定なら総距離は必ず8000m±100m。時間に合わせて距離を削ってはいけない。
- 各ブロックは「本数×距離m」または「〇〇m」で書き、合計を必ず ${targetDist - 100}〜${targetDist + 100}m に収めること。距離不足のメニューは不合格。\n\n`;
    }
    // 1. コーチ思想（高代コーチ50問インタビュー）
    if (protocolContent) {
      systemContent +=
        '【コーチ思想（必ず反映すること）】\n\n' +
        protocolContent +
        '\n\n---\n\n';
    }
    // 2. プロトコル＝ジェネレート（演習ルール・期別・強度・構造の正本）
    if (rtMenuContent) {
      systemContent +=
        '【プロトコル＝ジェネレート（演習内容の質を担保する正本。必ず従うこと）】\n\n' +
        rtMenuContent +
        '\n\n---\n\n';
    }
    // 2.5. RT Japan 練習内容（メニュー作成の主軸・最優先参照）
    if (rtJapanContent) {
      systemContent +=
        '【RT Japan 練習内容（メニュー作成の主軸。この内容を最優先で参照すること）】\n\n' +
        '高城コーチ作成のRT Japan練習メニュー（強化選手向け・量的ハード期・質的ハード期）を主軸とする。' +
        '以下のパターン・意図の書き方を必ず反映し、同レベルの具体性でメニューを生成すること。\n\n' +
        rtJapanContent +
        '\n\n---\n\n';
    }
    // 3. プロンプト用オーバーライド（content/common/prompt.pdf 等。あれば追加）
    if (promptContent) {
      systemContent +=
        '【追加プロンプト】\n' +
        promptContent +
        '\n\n---\n\n';
    }
    // 4. 共有参照資料（辞書・実施例）※チープ回避のため必須参照
    if (commonContent) {
      systemContent +=
        '【共有参照資料（差別化必須・menu-dictionary と menu-patterns を必ず参照）】\n' +
        'チープ・汎用表現は禁止。menu-patterns のセット構成・ドリル変形パターンから**必ず1つ以上**を選んで内容に含めること。' +
        'SKPS, IM Order, Des, Variable, DPS, Ac/CA, Negative split, odd/even 等を積極的に使い、' +
        '種目・期・距離タイプに特化した固有の内容にすること。同じ文言の繰り返しを避け、条件に合うバリエーションを選ぶ。\n\n' +
        commonContent +
        '\n\n---\n\n';
    }
    // 5. ネット検索結果（SERPER_API_KEY が設定されている場合のみ）
    if (webSearchText) {
      systemContent += webSearchText + '\n---\n\n';
    }
    // 6. 出力形式・補足ルール（上記プロトコルに含まれない部分）
    systemContent += CORE_SYSTEM_PROMPT;

    const keys = [
      'purpose', 'warmUp', 'drill', 'kick', 'pull', 'preMain', 'dive', 'rest',
      'main', 'down', 'total', 'intention', 'coachingPoint', 'caution', 'expectedEffect',
    ];
    const DISTANCE_TOLERANCE = 100;
    const MAX_DISTANCE_RETRIES = 8;
    const openai = new OpenAI({ apiKey });

    const doGenerate = async (retryHint?: string, temp?: number): Promise<string | null> => {
      const completion = await openai.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: systemContent },
          { role: 'user', content: buildUserPrompt(retryHint) },
        ],
        temperature: temp ?? (retryHint ? 0.1 : 0.3),
        max_tokens: 4096,
        response_format: { type: 'json_object' },
      });
      return completion.choices[0]?.message?.content?.trim() ?? null;
    };

    const M_KEYS = ['warmUpM', 'drillM', 'kickM', 'pullM', 'preMainM', 'mainM', 'downM'] as const;

    /** 表示用 total 文字列から数値を取り出す（構造化 or パース由来の一貫した値を返す） */
    const getDisplayedTotal = (r: Record<string, string>): number => {
      const m = r.total?.match(/[\d,]+/);
      if (m) {
        const n = parseInt(m[0].replace(/,/g, ''), 10);
        if (Number.isFinite(n) && n > 0) return n;
      }
      return sumMenuDistance(r);
    };

    const getTotalFromStructured = (parsed: Record<string, unknown>): number | null => {
      let sum = 0;
      for (const k of M_KEYS) {
        const v = parsed[k];
        if (typeof v !== 'number' || v < 0 || !Number.isFinite(v)) return null;
        sum += v;
      }
      return sum;
    };

    const parseAndNormalize = (raw: string): Record<string, string> | null => {
      try {
        const parsed = JSON.parse(raw) as Record<string, unknown>;
        if (!keys.every((k) => typeof parsed[k] === 'string')) return null;
        const result = Object.fromEntries(keys.map((k) => [k, String(parsed[k] ?? '')])) as Record<string, string>;
        const structuredTotal = getTotalFromStructured(parsed);
        const parsedTotal = sumMenuDistance(result);
        const calculatedTotal = structuredTotal ?? parsedTotal;
        if (calculatedTotal > 0) {
          result.total = `合計距離：${calculatedTotal.toLocaleString()}m`;
        }
        // M値は正しいがテキストのパースが大幅に少ない場合、AIが内容を十分に書けていない可能性
        if (
          structuredTotal != null &&
          structuredTotal >= (targetDist ?? 0) - 100 &&
          parsedTotal > 0 &&
          parsedTotal < structuredTotal * 0.85
        ) {
          const existing = (result.expectedEffect ?? '').trim();
          result.expectedEffect = existing
            ? `${existing}\n\n※ブロック記載内容の距離が目標に届いていない可能性があります。必要に応じて再生成をお試しください。`
            : '※ブロック記載内容の距離が目標に届いていない可能性があります。必要に応じて再生成をお試しください。';
        }
        return result;
      } catch {
        return null;
      }
    };

    let content = await doGenerate();
    if (!content) {
      console.error('[custom-menu] Empty completion content');
      return NextResponse.json(INTERNAL_ERROR_JSON, { status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8' } });
    }

    let result = parseAndNormalize(content);
    if (!result) {
      return NextResponse.json({ menu: content, result: null });
    }

    let calculatedTotal = getDisplayedTotal(result);
    let retryCount = 0;

    while (
      targetDist != null &&
      targetDist >= 2000 &&
      targetDist <= 8000 &&
      Math.abs(calculatedTotal - targetDist) > DISTANCE_TOLERANCE &&
      retryCount < MAX_DISTANCE_RETRIES
    ) {
      const diff = calculatedTotal - targetDist;
      const shortfallRatio = targetDist > 0 && calculatedTotal < targetDist
        ? Math.round((calculatedTotal / targetDist) * 100)
        : null;
      const allocStr = alloc
        ? `\n上記の距離配分表を厳守: W-up ${alloc.warmUp}m, Drill ${alloc.drill}m, Kick ${alloc.kick}m, Pull ${alloc.pull}m, Pre-Main ${alloc.preMain}m, Main ${alloc.main}m, Down ${alloc.down}m → 合計=${targetDist}m`
        : '';
      const scaleNote = shortfallRatio != null && shortfallRatio < 80
        ? `前回は目標の約${shortfallRatio}%です。各ブロックを${Math.ceil(100 / shortfallRatio)}倍程度に増やしてください。`
        : '';
      const exactAllocHint = alloc && diff < -500
        ? `\n【数値の直接使用】warmUpM=${alloc.warmUp}, drillM=${alloc.drill}, kickM=${alloc.kick}, pullM=${alloc.pull}, preMainM=${alloc.preMain}, mainM=${alloc.main}, downM=${alloc.down} をそのまま出力し、各ブロックのテキスト内容をこれに合わせて設計すること。`
        : '';
      const retryHint = `【最重要・再生成 #${retryCount + 1}】前回${calculatedTotal}m。目標${targetDist}m。${diff < 0 ? `${Math.abs(diff)}m不足` : `${diff}m超過`}。${scaleNote}今回**必ず**：①warmUpM=${alloc?.warmUp ?? 0}, drillM=${alloc?.drill ?? 0}, kickM=${alloc?.kick ?? 0}, pullM=${alloc?.pull ?? 0}, preMainM=${alloc?.preMain ?? 0}, mainM=${alloc?.main ?? 0}, downM=${alloc?.down ?? 0} を**そのまま**出力。②各ブロックのテキストはこの距離に届くよう十分なセグメントを入れる。${allocStr}${exactAllocHint}\n\n`;
      console.log('[custom-menu] Distance out of range, retry', retryCount + 1, { targetDist, calculatedTotal, diff });
      retryCount++;
      const retryContent = await doGenerate(retryHint, 0.1);
      if (retryContent) {
        const retryResult = parseAndNormalize(retryContent);
        if (retryResult) {
          const retryTotal = getDisplayedTotal(retryResult);
          if (Math.abs(retryTotal - targetDist) <= DISTANCE_TOLERANCE) {
            result = retryResult;
            calculatedTotal = retryTotal;
            break;
          }
          result = retryResult;
          calculatedTotal = retryTotal;
        }
      }
    }

    // 最終的に範囲外の場合、コーチメモで警告を付与
    if (targetDist != null && targetDist >= 2000 && targetDist <= 8000) {
      const finalTotal = getDisplayedTotal(result);
      const finalDiff = finalTotal - targetDist;
      if (Math.abs(finalDiff) > DISTANCE_TOLERANCE) {
        const coachNote = `※総距離が目標${targetDist}mより${Math.abs(finalDiff)}m${finalDiff < 0 ? '不足' : '超過'}しています。必要に応じて再生成をお試しください。`;
        const existing = (result.expectedEffect ?? '').trim();
        result.expectedEffect = existing ? `${existing}\n\n${coachNote}` : coachNote;
        console.log('[custom-menu] Distance still out of range after retry, added coachNote:', { targetDist, finalTotal });
      }
    }

    // 距離・時間の整合性：高密度の組み合わせの場合にコーチメモを付与
    const dtValidation = validateDistanceTime(distance, practiceTime);
    if (dtValidation && (dtValidation.status === 'dense' || dtValidation.status === 'not_recommended')) {
      const suggestion = dtValidation.suggestedPracticeTime
        ? `余裕を持って取り組むには${dtValidation.suggestedPracticeTime}分を推奨します。`
        : '体調に合わせて調整してください。';
      const coachNote = `※${timeNum}分で${targetDist}mは高強度設計です。${suggestion}`;
      const existing = (result.expectedEffect ?? '').trim();
      result.expectedEffect = existing ? `${existing}\n\n${coachNote}` : coachNote;
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
