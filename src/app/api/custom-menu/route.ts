import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import path from 'path';
import { config as loadEnv } from 'dotenv';
import { getToken } from 'next-auth/jwt';
import OpenAI from 'openai';
import { getCommonContent, getProtocolContent, getPromptContent } from '@/lib/rt/content';

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
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });
    const keyExists = (process.env.OPENAI_API_KEY || '').trim().length > 0;
    const status = getOpenAIStatus();
    console.log('[custom-menu] GET: OPENAI_API_KEY exists:', keyExists, 'configured:', status.configured, 'reason:', status.reason ?? 'ok');
    if (!token) {
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

10. 【安全第一・怪我させない】年齢・疲労・性別を最優先。マスターズは「怪我をさせないこと」が最重要。追い込みすぎず、長く水泳を楽しめる体を守る。

【出力指示】
- 必ず指定のJSONオブジェクト1つのみ。説明文は不要。
- 上記コーチ思想の種目ルール・強度ルール・期ごとの制御を厳守すること。
- サークル等は資料・条件に基づく値のみ使用（捏造禁止）。

【今日の狙い・指導ポイント・注意点の必須カスタマイズ】
- intention（今日の狙い）: 期・目的・状況・距離タイプ・年齢を必ず反映。コーチ思想（楽しさ・質・自己分析）を体現した、このメニュー固有の狙いを書く。汎用文のコピペ禁止。
- coachingPoint（指導ポイント）: このメニューのDrill/Kick/Pull/Main等の内容に即した具体的な意識点を3つ。TSS最小化・水感・ブレーキゼロの視点を含める。
- caution（注意点）: 状況（疲労・月経期等）・年齢・性別を必ず反映。フォームを崩さない範囲での取り組みを促す注意を3つ。汎用文禁止。

【「内容」列の必須ルール】
各セクションに具体的な指示を必ず含めること。共有参照資料のパターン（SKPS, IM Order, Des, Variable, DPS, Ac/CA, Negative split 等）を積極的に使い、同じ表現の繰り返しを避ける。
- **kick と pull のブロック名は英語で書く**: 「キック」→「Kick」、「プル」→「Pull」とする。例: Kick 4×50m（EN1）、Pull 6×50m（DPS）（EN2）。
- W-up / Down: 種目は Cho 固定。warmUp と down の文字列に Fr/Fly/Ba/Br/IM を一切含めない。
- Dive: 期が調整期・テーパー期のときのみ。それ以外の期では空文字。
- Rest 以外は強度を ①〜⑦ に対応（A1/EN1/EN2 等）で書く。
- **強度の天井**: 期ごとにメイン・非メインの上限がある。リカバリー③③、基礎形成④③、発展形成④④、スピード持久⑤④、対乳酸⑥④、調整⑤④、テーパー④③。これを超えないこと。
- **W-down前の神経刺激**: 練習の最後（Down前）に 25m×2本 MAX（強度⑦）などを入れてもよい。量ではなく神経刺激が目的。`;

/** 必須10項目のラベル（不足時レスポンス用） */
const REQUIRED_KEYS: { key: string; label: string }[] = [
  { key: 'period', label: '期' },
  { key: 'stroke', label: '種目' },
  { key: 'gender', label: '性別' },
  { key: 'age', label: '年齢' },
  { key: 'distanceType', label: '距離タイプ(S/M/D)' },
  { key: 'level', label: 'レベル' },
  { key: 'purpose', label: '目的' },
  { key: 'condition', label: '状況' },
  { key: 'practiceTime', label: '練習時間(60/90/120)' },
];

/** 入力不足チェック。不足があれば不足項目のラベル配列を返す（なければ null） */
function getMissingInputLabels(body: Record<string, unknown>): string[] | null {
  const missing = REQUIRED_KEYS.filter(({ key }) => {
    const v = body[key];
    return v === undefined || v === null || String(v).trim() === '';
  });
  if (missing.length === 0) return null;
  return missing.map(({ label }) => label);
}

/** 9条件に応じたカスタマイズ指示を組み立てる。全９項目を必ず反映し、設計の根拠とする。 */
function buildConditionInstructions(
  period: string,
  stroke: string,
  gender: string,
  age: string,
  distanceType: string,
  level: string,
  purpose: string,
  condition: string,
  practiceTime: string
): string {
  const ageNum = parseInt(age, 10) || 20;
  const timeNum = parseInt(practiceTime, 10) || 90;
  const isMasters = level.includes('マスターズ');
  const isFemale = gender === '女';

  const distanceTargets120: Record<string, Record<string, number>> = {
    '1': { S: 3000, M: 3500, D: 4000 },
    '2': { S: 4000, M: 5000, D: 6000 },
    '3': { S: 5000, M: 6500, D: 8000 },
    '4': { S: 5000, M: 7000, D: 8500 },
    '5': { S: 4000, M: 6000, D: 8000 },
    '6': { S: 3500, M: 3500, D: 6000 },
    '7': { S: 3000, M: 3500, D: 4000 },
  };
  const intensityCeiling: Record<string, { main: string; nonMain: string }> = {
    '1': { main: '③', nonMain: '③' },
    '2': { main: '④', nonMain: '③' },
    '3': { main: '④', nonMain: '④' },
    '4': { main: '⑤', nonMain: '④' },
    '5': { main: '⑥', nonMain: '④' },
    '6': { main: '⑤', nonMain: '④' },
    '7': { main: '④', nonMain: '③' },
  };
  const timeScale = timeNum === 60 ? 0.5 : timeNum === 90 ? 0.75 : 1;
  const levelScale =
    level.includes('初級') ? 0.65 : level.includes('中級') ? 0.8 : level.includes('マスターズ') ? 0.85 : 1;
  const targets = distanceTargets120[period]?.[distanceType];
  const targetDist = targets ? Math.round(targets * timeScale * levelScale) : null;

  const periodGuide: Record<string, string> = {
    '1': `①リカバリー期: 回復・感覚維持・姿勢安定。Diveなし。強度控えめ（メイン③・非メイン③まで）。フォーム再構築に集中。上級者は量を落としすぎない。${targetDist ? `目標距離: 約${targetDist}m` : ''}`,
    '2': `②基礎形成期: 水感覚・姿勢・呼吸・フォーム固め。Diveなし。対乳酸MAXは入れない。メイン④・非メイン③まで。内容と強度表記を必ず一致させる。${targetDist ? `目標距離: 約${targetDist}m` : ''}`,
    '3': `③発展形成期: 技術精度向上・スピード導入。Diveなし。メイン④・非メイン④まで。技術×持久の積み上げに集中。${targetDist ? `目標距離: 約${targetDist}m` : ''}`,
    '4': `④強化期 (スピード持久力): ボリュームと心肺土台。Diveなし。対乳酸MAXは入れない。メイン⑤・非メイン④まで。スピード×持久までに留める。${targetDist ? `目標距離: 約${targetDist}m` : ''}`,
    '5': `⑤強化期 (対乳酸): 乳酸耐性・レースペース持続。メイン⑥・非メイン④まで。対乳酸MAXはこの期のみ。${targetDist ? `目標距離: 約${targetDist}m` : ''}`,
    '6': `⑥調整期: 疲労除去＋スピード維持。Diveを少しずつ導入可。メイン⑤・非メイン④まで。量より質。${targetDist ? `目標距離: 約${targetDist}m` : ''}`,
    '7': `⑦テーパー期: 神経調整・反応・仕上げ。Diveでテンポアップ・レース動作の最終調整。対乳酸セットは入れない。メイン④・非メイン③まで。${targetDist ? `目標距離: 約${targetDist}m` : ''}`,
  };
  const strokeGuide: Record<string, string> = {
    Fr: '自由形: W-upはFR・IM多め。Drillは片手・キャッチアップ等。Kick/PullはFR中心。',
    Ba: '背泳ぎ: 専門種目をW-upで少なめに。Ba専門のドリル・キック・プルを入れる。',
    Br: '平泳ぎ: Brは専門Pullを多め。キックはBrキックの目的を明示。',
    Fly: 'バタフライ: Fly専門ドリル・キック。強度はフォームを崩さない範囲で。',
    IM: 'メドレー: 4泳法のバランス。W-upでIM多め。ドリルは泳法別に分けてもよい。',
    S1: 'スタイル1: メイン種目に合わせたドリル・キック・プル。種目名はS1のままでよい。',
  };
  const purposeGuide: Record<string, string> = {
    技術: '目的=技術: Mainはフォーム維持が最優先。本数・レストは余裕を持たせ、ドリル的な要素をMain前後に。',
    スピード: '目的=スピード: Pre-Mainで神経を起こす。Mainは短い距離・レスト長め・EN2〜EN3。',
    対乳酸: '目的=対乳酸: Mainは中距離・レスト短め・EN1〜EN2。サークル記載を明確に。',
    持久: '目的=持久: Mainは長めのインターバルまたは持続泳。EN1中心。',
    レースペース: '目的=レースペース: Mainはレース距離・レースペース・レストは本番想定。',
    回復: '目的=回復: 全体強度低め。Mainは短くA1〜A2。Down多め。',
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
    M: '距離タイプ=M（ミドル）: Mainは50〜100m。レースペース・対乳酸の組み合わせ。',
    D: '距離タイプ=D（ディスタンス）: Mainは100m以上も可。持久・レースペース持続。',
  };
  const levelGuide: Record<string, string> = {
    '全国大会入賞〜代表クラス': 'レベル=全国大会入賞〜代表: 量・強度とも高め。Mainの本数・レスト・強度をしっかり設定。',
    '上級（選手クラス〜全国大会）': 'レベル=上級: 量・強度を高めに。技術を崩さない範囲で負荷を設定。',
    '中級（育成クラス〜県大会）': 'レベル=中級: 技術・フォームを優先。強度は段階的に。説明を丁寧に。',
    '初級（4泳法完泳）': 'レベル=初級: 技術習得とフォーム固め最優先。強度控えめ、ドリル・キック多め。',
    'マスターズ（記録狙い）': 'レベル=マスターズ: 量より質。強度は年齢相応に下げる。疲れさせすぎない。強化期でなければ「やや多め」は控える。',
  };
  const genderGuide: Record<string, string> = {
    男: '性別=男: 通常の設計。',
    女: isFemale && condition === '月経期'
      ? '性別=女かつ状況=月経期: 休息・Downを多めにし、本人の希望を最優先する旨を注意点に含める。'
      : '性別=女: 月経期でなければ通常の設計。必要に応じて配慮を含める。',
  };

  const ceiling = intensityCeiling[period];
  const ceilingNote = ceiling ? `強度の天井: メイン${ceiling.main}まで、非メイン${ceiling.nonMain}まで。` : '';

  const lines: string[] = [
    '【必須】この10条件すべてから導いた練習設計にすること。全項目を反映した上でメニューを組み立てる。',
    '',
    `1. 期: ${periodGuide[period] || `期=${period}: 上記の期の定義に沿って重点を置く。`} ${ceilingNote}`,
    `2. 種目: ${strokeGuide[stroke] || `種目=${stroke}: その種目に合ったドリル・キック・プルにする。`}`,
    `3. 性別: ${genderGuide[gender] || `性別=${gender}`}`,
    `4. 年齢: 年齢=${age}歳。年齢補正を強度に反映。${ageNum < 13 ? 'Kick比率高め・説明を丁寧に。' : ageNum >= 40 ? '強度-2〜3、安全最優先。' : '高校・大学基準でよい。'}`,
    `5. 距離タイプ: ${distanceGuide[distanceType] || `距離タイプ=${distanceType}: Mainセットの距離・本数・レストをそれに合わせる。`}`,
    `6. レベル: ${levelGuide[level] || (isMasters ? levelGuide['マスターズ（記録狙い）'] : `レベル=${level}: 育成〜初級は技術・フォーム優先、全国〜代表は量・強度高め。`)}`,
    `7. 目的: ${purposeGuide[purpose] || `目的=${purpose}: MainとPre-Mainをこの目的で一貫させる。`}`,
    `8. 状況: ${conditionGuide[condition] || `状況=${condition}: 疲労・コンディションに合わせて強度・量・休息を調整する。`}`,
    `9. 練習時間: ${timeNum}分。総距離は期×距離タイプの基準を時間比でスケール（120分基準）。${targetDist ? `本条件の目標: 約${targetDist}m。` : ''}レベルと状況で増減。`,
  ];
  return lines.join('\n');
}

const INTERNAL_ERROR_JSON = { error: 'internal_error', message: '現在生成できません。時間をおいて再試行してください' } as const;

export async function POST(request: NextRequest) {
  const ensureJson500 = () =>
    NextResponse.json(INTERNAL_ERROR_JSON, { status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8' } });

  try {
    let token: unknown = null;
    try {
      token = await getToken({
        req: request,
        secret: process.env.NEXTAUTH_SECRET,
      });
    } catch (authErr) {
      console.error('[custom-menu] getToken error:', authErr);
      return ensureJson500();
    }
    if (!token) {
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
      gender,
      age,
      distanceType,
      level,
      purpose,
      condition,
      practiceTime,
    } = body as Record<string, string>;

    const conditionInstructions = buildConditionInstructions(
      period,
      stroke,
      gender,
      age,
      distanceType,
      level,
      purpose,
      condition,
      practiceTime
    );

    const userPrompt = `以下の「入力条件」と「反映ルール」に従い、この9条件から導いた水泳練習メニューを1つだけ生成してください。
**必須**：9条件すべてを設計の根拠とし、どの条件からどう反映したか分かる設計にすること。出力は必ず指定のJSONのみ（説明文は不要）。

【入力条件（9項目すべてを満たすこと）】
1. 期: ${period}
2. 種目: ${stroke}
3. 性別: ${gender}
4. 年齢: ${age}歳
5. 距離タイプ: ${distanceType}
6. レベル: ${level}
7. 目的: ${purpose}
8. 状況: ${condition}
9. 練習時間: ${practiceTime}分

【反映ルール】
${conditionInstructions}

【出力形式】以下のキーをすべて含むJSONオブジェクト1つのみ。各値は文字列。順序・省略禁止。
- main には必ずMainカテゴリを明記すること（ベースメイン／ベストアベレージ／ダイハード／対乳酸MAX／Standard Main のいずれか）。
- intention / coachingPoint / caution は必ずこの9条件に合わせてカスタマイズすること。汎用表現のコピペ禁止。
【intention（今日の狙い）】期・目的・状況・距離タイプ・年齢を反映した2〜4行。このメニュー固有の狙いを具体的に書く。
【coachingPoint（指導ポイント）】このメニューのブロック（Drill/Kick/Pull/Main等）に即した箇条書き3つ。このメニューで「どこを意識するか」を具体化する。
【caution（注意点）】状況・年齢・疲労・性別・月経期等を反映した箇条書き3つ。この選手・この日に必要な注意を書く。
【expectedEffect】このメニューで得られる効果を2〜3行で。
{
  "purpose": "【目的】1行で明確に（目的・期・状況を反映）",
  "warmUp": "距離のみ。種目名を書かず Cho 固定（例: 250m（A1））",
  "drill": "ドリル名 本数×距離m（内容）。内容は括弧で（例: 片手ドリル 6×50m（左右交互））",
  "kick": "Kick 本数×距離m（方法・内容）（強度）（例: Kick 4×50m（Des）（EN1））",
  "pull": "Pull 本数×距離m（内容）（強度）（例: Pull 4×50m（DPS）（EN1））",
  "preMain": "Pre-Main 本数×距離m（強度）（例: Pre-Main 3×50m（EN2））",
  "dive": "Dive 本数×距離m（A1）。不要時は空文字",
  "rest": "Rest / Free time（5~10min）。不要時は空文字",
  "main": "Main（カテゴリ名）本数×距離m @〇〇秒（強度）。例: Main（ベストアベレージ）8×25m @30秒（EN3）。サークルは資料・条件に基づく値のみ（捏造禁止）",
  "down": "種目名を書かず Cho 固定。Easy Swim 距離m（A1）（例: Easy Swim 100m（A1））",
  "total": "合計距離：〇〇〇〇m",
  "intention": "今日の狙い（2〜4行。期・目的・状況・距離タイプ・年齢を反映した、このメニュー固有の狙い）",
  "coachingPoint": "指導ポイント（箇条書き3つ。改行または・で区切り1つに。このメニューのブロックに即した具体的な意識点）",
  "caution": "注意点（箇条書き3つ。改行または・で区切り1つに。状況・年齢・疲労・月経期等を反映した、この選手・この日に必要な注意）",
  "expectedEffect": "期待効果（2〜3行。このメニューで得られる効果）"
}`;

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
    // 1. プロトコル（思想）※最優先。docs/RT_MENU_GENERATION_RULES_JA.md の内容をそのまま注入
    if (protocolContent) {
      systemContent +=
        '【プロトコル＝ジェネレート（必ず従うこと。思想・定義・絶対ルールの正本）】\n\n' +
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

    const openai = new OpenAI({ apiKey });
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemContent },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.6,
      max_tokens: 4096,
      response_format: { type: 'json_object' },
    });

    const content = completion.choices[0]?.message?.content?.trim();
    if (!content) {
      console.error('[custom-menu] Empty completion content');
      return NextResponse.json(INTERNAL_ERROR_JSON, { status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8' } });
    }

    const keys = [
      'purpose', 'warmUp', 'drill', 'kick', 'pull', 'preMain', 'dive', 'rest',
      'main', 'down', 'total', 'intention', 'coachingPoint', 'caution', 'expectedEffect',
    ];
    try {
      const parsed = JSON.parse(content) as Record<string, unknown>;
      const hasAll = keys.every((k) => typeof parsed[k] === 'string');
      if (hasAll) {
        const result = Object.fromEntries(keys.map((k) => [k, String(parsed[k] ?? '')]));
        return NextResponse.json({ result, menu: null });
      }
    } catch {
      /* JSONでない場合はテキストとして返す */
    }
    return NextResponse.json({ menu: content, result: null });
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
      errorText = `サーバーエラー(500): ${message}. .env.ai の OPENAI_API_KEY と NEXTAUTH_SECRET、ターミナルログを確認してください。`;
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
