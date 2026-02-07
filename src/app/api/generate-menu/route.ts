import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import OpenAI from 'openai';
import { getCommonContent, getPromptContent } from '@/lib/rt/content';

function getOpenAIStatus(): { configured: boolean; reason?: 'missing' | 'placeholder' } {
  const key = (process.env.OPENAI_API_KEY || '').trim();
  if (key.length === 0) return { configured: false, reason: 'missing' };
  if (key === 'YOUR_API_KEY_HERE') return { configured: false, reason: 'placeholder' };
  return { configured: true };
}

/** GET: ログイン済みユーザー向けに OpenAI API が利用可能か返す */
export async function GET(request: NextRequest) {
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });
  if (!token) {
    return NextResponse.json({ openaiConfigured: false }, { status: 200 });
  }
  const status = getOpenAIStatus();
  return NextResponse.json({
    openaiConfigured: status.configured,
    openaiReason: status.reason,
  });
}

const SYSTEM_PROMPT = `あなたはRT-japanの競泳専門AIコーチです。立石諒と渡部コーチ監修の指導哲学に基づき、渡部コーチが現場で判断するのと同じ基準でメニューを生成してください。
参照：1) プロトコル＝ジェネレート（RT_MENU_GENERATION_RULES_JA.md） 2) 共通メニュー辞書（共有参照資料） 3) 入力10条件。推測での捏造は禁止。

【絶対原則】
- 目的 → 強度 → 理由の順で考える。量より質。フォームを崩して強くしない。
- 安全第一（年齢・性別・疲労を最優先）。年齢・疲労は期より優先する。
- 構造: W-up → Drill → Kick → Pull → Pre-Main → Dive（必要時）→ Rest（必要時）→ Main → Down。構造を崩さない。
- 追加練習で追い込まない。判断に迷ったら強度を下げる。

【Main選択の絶対ルール】
- Mainは必ず次のいずれかでカテゴリを明記する：ベースメイン／ベストアベレージ／ダイハード／対乳酸MAX／Standard Main。期の目安に反するカテゴリは禁止。
- 距離タイプ整合：S=50–100m / M=100–400m / D=400m+。年齢補正最優先（マスターズは安全側）。

【強度目安】A1:22-24 / A2:24-26 / EN1:26-27 / EN2:28前後 / EN3:29-30
【年齢補正】小学生+2-3 / 中学生+1-2 / 高校・大学基準 / 成人-2-3
【Kick比率目安】小学生40-60% / 中学生30-40% / 高校25-30% / 大学以上20-25% / マスターズ約20%

【多様性ルール（内容が毎回同じにならないよう必須）】
- 各ブロック（W-up/Drill/Kick/Pull/Pre-Main/Main/Down）は、辞書の該当カテゴリから最低3候補を想定しその中から1つを選んで採用する。毎回同じ並びのコピペは禁止。
- 目的が同じでも刺激の入れ方をローテする（Pre-Mainで入れる／Mainで入れる／Drillで入れる等）。

【「内容」列の必須ルール】
各セクションの文字列には、表の「内容」列にそのまま出るような具体的な指示を必ず含めること。共有参照資料のパターン（SKPS, IM Order, Des, Variable, DPS, Ac/CA, Board/No Board, Negative split 等）を積極的に使い、同じ表現の繰り返しを避ける。
- W-up: 種目は Cho 固定。本文に Fr/Fly 等の種目名を書かない。Choice/Mixed, SKPS, IM Order などから条件に合うものを選ぶ。
- Drill: 左右交互に加え Scull+Drill, IM Order, 片手ずつ, キャッチアップ 等。
- Kick: （ボード）（ノーボード）に加え Des, Variable, Setup, S1 等。
- Pull: （肩甲骨意識）に加え DPS, Ac/CA, Des, Scull/Drill Mix 等。
- Main: カテゴリ名を明記し、Des/Negative split/ALT/Race Pace/Best Average 等の形式で具体的に書く。サークルは資料・条件に基づく値のみ使用（捏造禁止）。
- Dive: （スタート練習）（ターン練習）または資料のDive/SDのニュアンス。
- Rest: 「Rest / Free time（5~10min）」または「Easy Swim 〇〇m（A1）」。不要時は空文字。
- Down: 種目は Cho 固定。本文に種目名を書かない。Easy Swim 距離m（A1）。必要なら 100 Kick / 200 Swim 等。
**W-up と Down では種目列は必ず Cho。warmUp と down の文字列に Fr/Fly/Ba/Br/IM を一切含めない。**
**内容列は「（左右交互）（ボード）（肩甲骨意識）」だけに固定しないこと。** 共有参照資料の Des, Variable, IM Order, Scull, DPS, Ac/CA, スタート/ターン 等の多様な表現から選ぶこと。Rest 以外は強度を ①〜⑦ に対応（A1/EN1/EN2 等）で書く。`;

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
  { key: 'volumeUp', label: 'ボリュームを上げたい項目' },
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

/** 10条件に応じたカスタマイズ指示を組み立てる */
function buildConditionInstructions(
  period: string,
  stroke: string,
  gender: string,
  age: string,
  distanceType: string,
  level: string,
  purpose: string,
  condition: string,
  practiceTime: string,
  volumeUp: string
): string {
  const ageNum = parseInt(age, 10) || 20;
  const timeNum = parseInt(practiceTime, 10) || 90;
  const isMasters =
    level.includes('マスターズ');
  const isFemale = gender === '女';

  const periodGuide: Record<string, string> = {
    '1': '①リカバリー期: 回復・感覚維持・姿勢安定。強度控えめ、W-up/Drill/Down多め。Mainは短め・A1〜EN1中心。',
    '2': '②基礎形成期: 水感覚・姿勢・呼吸・フォーム固め。DrillとKickを丁寧に。Mainは技術を崩さない範囲の強度。',
    '3': '③発展形成期: 技術精度向上・スピード導入。Pre-Mainで強度を段階的に。Mainは目的に合わせて設計。',
    '4': '④強化期①: ボリュームと心肺土台。総距離多め、Kick/Pullの量を確保。強度は段階的に。',
    '5': '⑤強化期②: 乳酸耐性・レースペース持続。Mainの本数・レスト・強度を目的に合わせて明確に。',
    '6': '⑥調整期: 疲労除去＋スピード維持。量より質、短いスピード刺激を入れる。崩れた状態でMainに入らない。',
    '7': '⑦テーパー期: 神経調整・反応・仕上げ。短い本数・レスト長め・スピード感。追い込まない。',
  };
  const strokeGuide: Record<string, string> = {
    Fr: '自由形: W-upはFR・IM多め。Drillは片手・キャッチアップ等。Kick/PullはFR中心。',
    Ba: '背泳ぎ: 専門種目をW-upで少なめに。Ba専門のドリル・キック・プルを入れる。',
    Br: '平泳ぎ: Brは専門Pullを多め。キックはBrキックの目的を明示。',
    Fly: 'バタフライ: Fly専門ドリル・キック。強度はフォームを崩さない範囲で。',
    IM: '個人メドレー: 4泳法のバランス。W-upでIM多め。ドリルは泳法別に分けてもよい。',
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
  const volumeUpGuide: Record<string, string> = {
    ドリル: 'ボリュームUP=ドリル: Drillの本数・種類を増やす。目的に合ったドリルを2〜3種類。',
    キック: 'ボリュームUP=キック: Kickの本数・セットを増やす。種目に合ったキック。',
    プル: 'ボリュームUP=プル: Pullの本数・距離を増やす。肩甲骨・体幹の指示を入れる。',
    プレメイン: 'ボリュームUP=プレメイン: Pre-Mainの本数・強度をしっかり。Mainへの導線を明確に。',
    メイン: 'ボリュームUP=メイン: Mainの本数・距離を増やす。レストと強度のバランスを守る。',
  };
  const distanceGuide: Record<string, string> = {
    S: '距離タイプ=S（スプリント）: Mainは25〜50m中心。レスト長め・スピード重視。',
    M: '距離タイプ=M（ミドル）: Mainは50〜100m。レースペース・対乳酸の組み合わせ。',
    D: '距離タイプ=D（ディスタンス）: Mainは100m以上も可。持久・レースペース持続。',
  };

  const lines: string[] = [
    '【このメニューで必ず反映すること】',
    periodGuide[period] || `期=${period}: 上記の期の定義に沿って重点を置く。`,
    strokeGuide[stroke] || `種目=${stroke}: その種目に合ったドリル・キック・プルにする。`,
    purposeGuide[purpose] || `目的=${purpose}: MainとPre-Mainをこの目的で一貫させる。`,
    conditionGuide[condition] || `状況=${condition}: 疲労・コンディションに合わせて強度・量・休息を調整する。`,
    volumeUpGuide[volumeUp] || `ボリュームUP=${volumeUp}: 該当ブロックの量を他より多めにし、内容を具体的に書く。`,
    distanceGuide[distanceType] || `距離タイプ=${distanceType}: Mainセットの距離・本数・レストをそれに合わせる。`,
  ];
  lines.push(
    `練習時間=${timeNum}分: 総距離は目安として、60分なら約2000-2500m、90分なら約2500-3500m、120分なら約3500-4500m。レベルと状況で増減。`
  );
  if (isMasters) {
    lines.push(
      'レベル=マスターズ: 量より質。強度は年齢相応に下げる。疲れさせすぎない。強化期でなければ「やや多め」は控える。'
    );
  } else {
    lines.push(`レベル=${level}: 全国〜代表は量・強度とも高め、育成〜初級は技術・フォームを優先して設計。`);
  }
  lines.push(
    `年齢=${age}歳: 年齢補正を強度に反映。${ageNum < 13 ? 'Kick比率高め・説明を丁寧に。' : ageNum >= 40 ? '強度-2〜3、安全最優先。' : '高校・大学基準でよい。'}`
  );
  if (isFemale && condition === '月経期') {
    lines.push('性別=女かつ状況=月経期: 休息・Downを多めにし、本人の希望を最優先する旨を注意点に含める。');
  }
  return lines.join('\n');
}

export async function POST(request: NextRequest) {
  try {
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });
    if (!token) {
      return NextResponse.json({ error: 'ログインが必要です。' }, { status: 401 });
    }

    const apiKey = (process.env.OPENAI_API_KEY || '').trim();
    if (!apiKey || apiKey === 'YOUR_API_KEY_HERE') {
      return NextResponse.json(
        { error: 'OPENAI_API_KEY が設定されていません。.env.local に本物のAPIキーを設定してください。' },
        { status: 500 }
      );
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
      volumeUp,
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
      practiceTime,
      volumeUp
    );

    const userPrompt = `以下の「入力条件」と「反映ルール」に従い、この10条件に最適化した水泳練習メニューを1つだけ生成してください。出力は必ず指定のJSONのみにしてください（説明文は不要）。

【入力条件（すべてを満たすこと）】
1. 期: ${period}
2. 種目: ${stroke}
3. 性別: ${gender}
4. 年齢: ${age}歳
5. 距離タイプ: ${distanceType}
6. レベル: ${level}
7. 目的: ${purpose}
8. 状況: ${condition}
9. 練習時間: ${practiceTime}分
10. ボリュームUP: ${volumeUp}

【反映ルール】
${conditionInstructions}

【出力形式】以下のキーをすべて含むJSONオブジェクト1つのみ。各値は文字列。順序・省略禁止。
- main には必ずMainカテゴリを明記すること（ベースメイン／ベストアベレージ／ダイハード／対乳酸MAX／Standard Main のいずれか）。
- intention は2〜4行、coachingPoint は箇条書き3つ（改行または・で区切って1つに）、caution は箇条書き3つ、expectedEffect は2〜3行。
{
  "purpose": "【目的】1行で明確に（目的・期・状況を反映）",
  "warmUp": "距離のみ。種目名を書かず Cho 固定（例: 250m（A1））",
  "drill": "ドリル名 本数×距離m（内容）。内容は括弧で（例: 片手ドリル 6×50m（左右交互））",
  "kick": "キック 本数×距離m（用具・方法）（強度）（例: キック 4×50m（ボード）（EN1））",
  "pull": "プル 本数×距離m（意識ポイント）（強度）（例: プル 4×50m（肩甲骨意識）（EN1））",
  "preMain": "Pre-Main 本数×距離m（強度）（例: Pre-Main 3×50m（EN2））",
  "dive": "Dive 本数×距離m（スタート練習）（A1）。不要時は空文字",
  "rest": "Rest / Free time（5~10min）。不要時は空文字",
  "main": "Main（カテゴリ名）本数×距離m @〇〇秒（強度）。例: Main（ベストアベレージ）8×25m @30秒（EN3）。サークルは資料・条件に基づく値のみ（捏造禁止）",
  "down": "種目名を書かず Cho 固定。Easy Swim 距離m（A1）（例: Easy Swim 100m（A1））",
  "total": "合計距離：〇〇〇〇m",
  "intention": "練習意図（2〜4行、目的と期に沿う）",
  "coachingPoint": "指導ポイント（箇条書き3つ。改行または・で区切り1つの文字列に）",
  "caution": "注意点（箇条書き3つ。改行または・で区切り1つの文字列に。状況・年齢・疲労を反映）",
  "expectedEffect": "期待効果（2〜3行）"
}`;

    let promptContent = '';
    let commonContent = '';
    try {
      [promptContent, commonContent] = await Promise.all([
        getPromptContent(),
        getCommonContent(),
      ]);
    } catch (contentErr) {
      console.error('[generate-menu] getPromptContent/getCommonContent error:', contentErr);
      // コンテンツ取得失敗時は空のまま続行（メニュー生成は可能）
    }

    let systemContent = '';
    if (promptContent) {
      systemContent +=
        '【プロンプト（以下の指示に従うこと。PDF等で読み込んだプロンプトです）】\n' +
        promptContent +
        '\n\n---\n\n';
    }
    if (commonContent) {
      systemContent +=
        '【共有参照資料（共通メニュー内容＋例。最優先で参照すること）】\n' +
        '以下のテキストは、W-up / Drill / Kick / Pull / Main / Dive / W-down の「内容」パターン・実施例・用語がまとまった資料です。' +
        'メニュー生成時はこの資料の表現・パターン（SKPS, IM Order, Des, Variable, DPS, Ac/CA, Negative split, Board/No Board など）を積極的に取り入れ、' +
        '内容のレパートリーを豊かにしてください。同じ文言の繰り返しを避け、条件に合うバリエーションを選んでください。\n\n' +
        commonContent +
        '\n\n---\n\n';
    }
    systemContent +=
      SYSTEM_PROMPT +
      '\n\n出力は必ず指定のキーを持つJSONオブジェクト1つのみにすること。各セクションには共有参照資料のパターン・用語を反映した「内容」を欠かさず含めること。';

    const openai = new OpenAI({ apiKey });
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemContent },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.6,
      response_format: { type: 'json_object' },
    });

    const content = completion.choices[0]?.message?.content?.trim();
    if (!content) {
      return NextResponse.json(
        { error: 'メニューの生成に失敗しました。' },
        { status: 500 }
      );
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
  } catch (err) {
    console.error('[generate-menu] POST error:', err);
    const message = err instanceof Error ? err.message : '不明なエラー';
    const isAuthError =
      String(message).includes('API key') ||
      String(message).includes('401') ||
      String(message).includes('Incorrect API key');
    const isQuotaError =
      String(message).includes('429') ||
      String(message).includes('quota') ||
      String(message).includes('billing');
    let errorText: string;
    if (isAuthError) {
      errorText = 'APIキーが無効です。.env.local の OPENAI_API_KEY を確認してください。';
    } else if (isQuotaError) {
      errorText =
        'OpenAIの利用枠を超えました。Billingで支払い方法を追加するか、「クイック作成」ボタンをご利用ください。';
    } else {
      errorText = `メニュー生成エラー: ${message}`;
    }
    return NextResponse.json({ error: errorText }, { status: 500 });
  }
}
