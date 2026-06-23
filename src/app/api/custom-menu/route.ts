import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import path from 'path';
import { config as loadEnv } from 'dotenv';
import { getEffectiveUser, createClient } from '@/lib/supabase/server';
import { IS_DEMO_PERIOD, calcUsageStatus, MAINTENANCE_MODE } from '@/lib/plan-limits';
import OpenAI from 'openai';
import { buildSessionContext, buildContextPrompt } from '@/lib/training/context-builder';
import { getCommonContent, getProtocolContent, getPromptContent, getRTMenuProtocolContent, getRTJapanPracticeContent } from '@/lib/rt/content';
import { validateDistanceTime, isDistanceValidForType } from '@/lib/rt/distance-time-validation';
import { generateMenuSkeleton, buildSkeletonTemplateStrings } from '@/lib/rt/skeleton-generator';
import {
  buildProfessionalSearchQueries,
  searchMultiple,
  formatSearchResultsForPrompt,
} from '@/lib/web-search';

// APIルートでも .env.ai を読む（next.config 経由で読めない場合のフォールバック）
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

/** GET: OpenAI API の利用可能状態を返す */
export async function GET(request: NextRequest) {
  try {
    const user = await getEffectiveUser();
    const keyExists = (process.env.OPENAI_API_KEY || '').trim().length > 0;
    const status = getOpenAIStatus();
    console.log('[custom-menu] GET: OPENAI_API_KEY exists:', keyExists, 'configured:', status.configured);
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

/**
 * コーチ思想・出力品質ルール（距離・本数はスケルトンで決定済み。ここはコンテンツラベルの品質のみ担う）
 */
const CORE_SYSTEM_PROMPT = `【コーチ思想の核心（50問インタビュー回答より）】
以下のコーチ思想を最優先に反映し、コンテンツラベルの選択・intention/coachingPoint/cautionの文章に活かすこと。

1. 【楽しさと質の両立】選手がポジティブな気持ちでプールに来ることが大前提。飽きさせないよう変化をつけ、楽しさと強さを両立させる。笑顔が生まれる雰囲気を作ること。
2. 【量より質・フォームを崩して強くしない】良い練習とは「目的を選手と共有し、個別の課題が明確な練習」。フォームが崩れたらタイムへのこだわりを手放し、技術的課題に集中させる。
3. 【自己分析と主体性】選手自身が「こういう感覚の時に調子が良い」と言語化できる力を育てる。
4. 【TSS（タイム＋ストローク数＋心拍数）の最小化】タイム・ストローク数・心拍数の合計値を小さくすることを選手に意識させる。
5. 【水感・浮力・ブレーキゼロ】体が浮いた状態で重心を止めずに連続的に移動すること。ハイエルボー等の形よりも、水中で力を効率的に伝える感覚を優先する。
6. 【成功体験の積み重ね】日々の練習でタイムトライアル等を取り入れ「やれば速くなる」実感を持たせる。
7. 【80:20の法則】週の練習のうち約2割を高強度、残り8割を有酸素的強度に抑える。
8. 【疲労サインへの敏感な対応】選手の表情・言動の変化を見逃さない。疲労サインがあれば本数・サークル・強度を即調整する。
9. 【ストローク優先・キックは補助】まず土台となるストロークを確立し、その上でキックを連動させる。
10. 【安全第一・怪我させない】年齢・疲労を最優先。マスターズは「怪我をさせないこと」が最重要。

【コンテンツラベル生成ルール（必須）】
- **テンプレートの {PLACEHOLDER} スロットのみ埋める。数値・本数・@rest・強度番号は変更禁止。**
- 強度番号の正確な対応（RT Japan公式）: ①=A1/A2 ②=EN1 ③=EN2 ④=EN3 ⑤=AN1 ⑥=AN2 ⑦=MAX（③EN2と④EN3は別強度。EN5・EN6は存在しない）
- **{WU_PATTERN}・{DR_DRILL_N}・{KI_PATTERN_N}・{PL_PATTERN_N}・{PM_CONTENT} は固定選択肢を使わず、種目・期・レベル・状況に最適なオリジナルの内容を自由に生成すること。**
- {WU_PATTERN_N}: W-upのCho段階の泳ぎ方・フォーカスを具体的に命名。段階ごとに内容を変化させる（例: 段階1: Easy Des / 段階2: SKPS build / 段階2: odd:Ba even:Fr Des 等）
- {DR_DRILL_N}: **W-upの最終技術段階**として、その種目に固有のドリル名を具体的に命名する。**泳法をまたいだドリル名は禁止**（例: バタフライにキャッチアップは使わない。背泳ぎにキャッチアップは使わない）。各泳法の固有ドリル例→ Fr: 片手/キャッチアップ/ハイエルボー/フィスト / Ba: 片手スイム/スカーリング/6-1-6バランス/ローリング強調（キャッチアップ厳禁） / Br: 分離キック/グライドプル/2キック1プル/タイミング / Fly: ドルフィンキック/片キック/1キック1プル/ショルダードリル/ヒップドライブ。毎回異なる視点・感覚軸で命名する。
- {KI_PATTERN_N}: そのキックの目的・感覚に即した具体的なパターン名（例: back kick build / underwater dolphin 3→5→7 / strong finish last 2 等）
- {PL_PATTERN_N}: そのプルの狙いに即した具体的なパターン名（例: DPS focus negative split / catch-up timing form first / fist drill → open hand Des 等）
- {PM_CONTENT}: Pre-Mainの内容を期・距離タイプに合わせて戦略的に（例: Descend to race pace @30sec / Broken（10sec）レースペース / Negative split + ペース管理 / Des 1→4 最終本レースペース 等。単に「ペースを上げる」ではなく目的・感覚・構成を明示する）
- W-up: Cho段階（{WU_PATTERN_N}部分）は Cho 固定。最終段階のドリル（{DR_DRILL_N}部分）は種目固有のドリルを使用。Down は変更しない（テンプレートのまま出力）。
- Main: カテゴリ名はテンプレート通りに出力（変更禁止）。@rest も変更禁止。
- Dive: 期が⑥調整期・⑦テーパー期のときのみ出力。それ以外は空文字（""）。

【intention・coachingPoint・caution・expectedEffectの必須カスタマイズ】
- intention（今日の狙い）: 選手が「なぜ今日これをやるか」を聞いてポジティブになれる言葉で書く。
  以下の3軸を統合した2〜4文の具体的な文章。汎用文（「基礎を固める」「スタミナをつける」等）は禁止。
  軸①: 期の目的（今どのフェーズで何を積み上げているか）
  軸②: コンディション（状況がメニュー設計にどう影響したか）
  軸③: 距離タイプ×種目の戦略的意図（今日の技術フォーカスは何か）
  例OK: 「基礎形成期の○週目として、EN2強度でのDPS感覚をキックとプルで重点的に磨きます。軽疲労のため高強度を外し、丁寧なストローク技術の定着を優先した設計です」

- coachingPoint（指導ポイント）: このセッションのDrill/Kick/Pull/Mainに即した具体的な意識ポイントを3つ。
  必須視点: ① TSS（タイム＋ストローク数＋心拍数）の最小化 ② 水感・ブレーキゼロ・重心の連続移動 ③ このセッション固有の技術焦点
  各ポイントは「何を・どう意識するか」まで具体的に書く（「水を感じて」は禁止）。

- caution（注意点）: このセッション固有の安全・技術・メンタル注意を3点。
  状況・年齢・疲労・月経期を必ず反映した具体的な注意。汎用文（「無理しない」「体調に注意」等）は禁止。

- expectedEffect（期待効果）: このメニューをやりきった後に「何が変わるか・何が得られるか」を以下3軸で書く。
  軸①【生理的適応】: 有酸素系・乳酸系・神経系のどこがどう刺激・強化されるか（心拍・代謝・筋の観点）
  軸②【技術的発展】: ドリル・キック・プルを通じて何の感覚が磨かれ、ストロークにどう活きるか
  軸③【メンタル・成功体験】: 達成感・翌日への準備・自己効力感の視点
  2〜3文で期別・強度別の具体的な効果を書く。汎用文禁止。

【高城コーチの語り口（intention・coachingPoint・caution に必ず反映）】
以下のフレーズを自然に組み込み、高城コーチの指導スタイルを再現すること。数を絞って使い、すべてを並べない。

量的ハード期（期②③）で使うフレーズ:
- 「息が上がる中でも質を維持する」
- 「前後半の差を小さく、ストロークも崩さず速く」
- 「ショートサイクルでフィジカルトレーニング」
- 「有酸素運動の中で推進効率を高める」
- 「最後まで雑にならずに」

質的ハード期（期④⑤）で使うフレーズ:
- 「200mペースを持続する。体がキツくても前後半の差を小さく」
- 「苦しい時こそタイムへのこだわりを手放し、技術的課題に集中する」
- 「最後の50mはキツい状態からでもスピード・テンポを上げても体をコントロールして」
- 「体がキツくて息が上がっている状況でも最後にテンポを上げた時に泳ぎとタイムをコントロールできるように」

スピード系（期⑥⑦）で使うフレーズ:
- 「15mMaxからのスタートを25mまで、35mまで続けることで最速の動作を長い距離に引き延ばしていく」
- 「パラシュートでストロークが重くなってから解放すると、次はパワフルに水を捉えられる感覚が得られる」
- 「今日感じた良い感覚をそのまま試合当日に再現することがテーパーの目的」

全期共通フレーズ:
- 「タイム・ストローク数・心拍数（TSS）の合計を最小化する意識を持つ」
- 「体が浮いた状態で重心を止めずに連続的に移動する（ブレーキゼロ）」
- 「水を捉えながら体を高い位置に保持する」
- 「フォームが崩れたらタイムへのこだわりを手放し、技術確認に切り替える」
- 「できれば毎日そうではないが、今日の練習で成功体験を積むことが選手を前向きにする」

【バリエーション生成：今日のテーマ軸を1つ立てる（必須）】
毎セッション、以下の4軸のうち**1つを「今日のテーマ軸」**として冒頭に立て、W-up→Drill→Kick→Pull→Pre-Main→Mainまで一貫して流れるように設計すること。

- **感覚軸（水感・浮力・ブレーキゼロ）**: スカーリング・ヘッドアップ・Snorkelなど水感系ドリルを中心に。intentionに「体が水の上に浮いている感覚を確認する日」と明記。
- **技術軸（DPS・ストロークカウント・ハイエルボー）**: 1ストロークの進距離を最大化する効率練習。intentionに「TSSの中でもストローク数の改善にフォーカスする」と明記。
- **強度軸（TSS最小化・高強度持続・レースペース）**: 心拍を上げながらフォームを崩さない耐性を鍛える。intentionに「苦しい中でもフォームを維持する耐性を高める日」と明記。
- **タイミング軸（呼吸リズム・キックとストロークの連動）**: 呼吸とキックのタイミング合わせが中心。intentionに「呼吸とストロークのリズムを整え直す日」と明記。

【ブロック間の連動指示（必須）】
各ブロックは今日のテーマ軸に沿って連動させること:
- Drill名: そのテーマ軸に直結した動作をドリル名に含める
- Kick pattern: テーマ軸の感覚をキックで支えるパターンを選ぶ
- Pull pattern: テーマ軸の感覚をプルで精度を上げるパターンを選ぶ
- intention: 「今日はXX軸で設計しています。W-upのDrillで確認した○○感覚をそのままMainに持ち込みます」という流れを明記する`;

/** 必須8項目 */
const REQUIRED_KEYS: { key: string; label: string }[] = [
  { key: 'period',       label: '目的（期）' },
  { key: 'stroke',       label: '種目' },
  { key: 'distance',     label: '距離(2000〜8000m)' },
  { key: 'age',          label: '年齢' },
  { key: 'distanceType', label: '距離タイプ(S/M/D)' },
  { key: 'level',        label: 'レベル' },
  { key: 'condition',    label: '状況' },
  { key: 'practiceTime', label: '練習時間(60/90/120)' },
];

function getMissingInputLabels(body: Record<string, unknown>): string[] | null {
  const missing = REQUIRED_KEYS.filter(({ key }) => {
    const v = body[key];
    return v === undefined || v === null || String(v).trim() === '';
  });
  return missing.length === 0 ? null : missing.map(({ label }) => label);
}

const PERIOD_LABELS: Record<string, string> = {
  '1': '① リカバリー期', '2': '② 基礎形成期', '3': '③ 発展形成期',
  '4': '④ 強化期 (スピード持久力)', '5': '⑤ 強化期 (耐乳酸)', '6': '⑥ 調整期', '7': '⑦ テーパー期',
};

const RACE_EVENT_LABELS: Record<string, string> = {
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

function normalizeGenerationMode(value: unknown): 'standard' | 'sprint_50m' {
  return value === 'sprint_50m' ? 'sprint_50m' : 'standard';
}

function normalizePoolLength(value: unknown): 'short_course' | 'long_course' {
  return value === 'long_course' ? 'long_course' : 'short_course';
}

function normalizeExplanationLevel(value: unknown): 'beginner_friendly' | 'technical' {
  return value === 'technical' ? 'technical' : 'beginner_friendly';
}

function normalizeRaceEvent(value: unknown): string {
  const event = typeof value === 'string' ? value.trim() : '';
  return RACE_EVENT_LABELS[event] ? event : '';
}

function strokeFromRaceEvent(raceEvent: string): string | null {
  const stroke = raceEvent.split('_')[0];
  return ['Fr', 'Ba', 'Br', 'Fly', 'IM'].includes(stroke) ? stroke : null;
}

const INTERNAL_ERROR_JSON = { error: 'internal_error', message: '現在生成できません。時間をおいて再試行してください' } as const;

export async function POST(request: NextRequest) {
  if (MAINTENANCE_MODE) {
    return NextResponse.json(
      { error: 'メンテナンス中です。近日中に正式公開予定です。' },
      { status: 503 }
    );
  }

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

    // サーバー側で生成回数制限チェック（デモ期間終了後に有効）
    if (!IS_DEMO_PERIOD && !user.isBypass) {
      const sb = await createClient();
      if (sb) {
        const monthStart = new Date();
        monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
        const [totalRes, monthRes] = await Promise.all([
          sb.from('generation_logs').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
          sb.from('generation_logs').select('*', { count: 'exact', head: true }).eq('user_id', user.id).gte('created_at', monthStart.toISOString()),
        ]);
        const usage = calcUsageStatus({
          planId: 'free',
          customCountTotal: totalRes.count ?? 0,
          customCountThisMonth: monthRes.count ?? 0,
        });
        if (usage.isLimitReached) {
          return NextResponse.json(
            { error: 'limit_reached', message: 'カスタム生成の上限に達しました。プランをアップグレードしてください。' },
            { status: 429 }
          );
        }
      }
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
        return NextResponse.json({ error: 'リクエストのJSON形式が不正です。' }, { status: 400 });
      }

      const missingLabels = getMissingInputLabels(body);
      if (missingLabels) {
        return NextResponse.json(
          { error: '入力が不足しています。以下の項目を入力してください。', missingItems: missingLabels },
          { status: 400 }
        );
      }

      const { period, stroke: rawStroke, distance, age, distanceType, level, condition, practiceTime, plan_id } =
        body as Record<string, string>;
      const generationMode = normalizeGenerationMode(body.generationMode);
      const poolLength = normalizePoolLength(body.poolLength);
      const explanationLevel = normalizeExplanationLevel(body.explanationLevel);
      const raceEvent = normalizeRaceEvent(body.raceEvent);
      const bestTime = typeof body.bestTime === 'string' ? body.bestTime.trim() : '';
      const stroke = strokeFromRaceEvent(raceEvent) ?? rawStroke;
      const raceEventLabel = raceEvent
        ? RACE_EVENT_LABELS[raceEvent]
        : `未指定（種目: ${stroke || 'Fr'}）`;
      const generationModeLabel = generationMode === 'sprint_50m' ? '50m特化' : '通常メニュー';
      const poolLengthLabel = poolLength === 'long_course' ? '長水路' : '短水路';
      const explanationLevelLabel = explanationLevel === 'technical' ? '専門用語中心' : 'わかりやすく説明';

      if (distance && distanceType && !isDistanceValidForType(distance, distanceType)) {
        return NextResponse.json(
          { error: '距離と距離タイプの組み合わせが無効です。スプリントは2000-6000m、ミドルは3000-7000m、ディスタンスは6000-8000mの範囲で選択してください。' },
          { status: 400 }
        );
      }

      // ============================================================
      // 骨格生成（距離・セット構成・強度を決定論的に算出）
      // ============================================================
      const skeleton = generateMenuSkeleton({ period, stroke, distance, age, distanceType, level, condition, practiceTime });
      const tmpl = buildSkeletonTemplateStrings(skeleton);

      console.log('[custom-menu] skeleton generated:', {
        targetDist: skeleton.targetDist,
        warmUp: skeleton.warmUp.totalM,
        drill: skeleton.drill.totalM,
        kick: skeleton.kick.totalM,
        pull: skeleton.pull.totalM,
        preMain: skeleton.preMain.totalM,
        main: skeleton.main.totalM,
        down: skeleton.down.totalM,
        total: skeleton.totalM,
      });

      // ============================================================
      // ストーリー文脈構築（plan_id がある場合）
      // ============================================================
      let storyContextPrompt = '';
      if (plan_id && user) {
        try {
          const sb = await createClient();
          if (!sb) throw new Error('supabase client null');
          const ctx = await buildSessionContext(sb, user.id, plan_id, new Date());
          if (ctx) storyContextPrompt = buildContextPrompt(ctx);
        } catch (ctxErr) {
          console.warn('[custom-menu] context build failed (non-fatal):', ctxErr);
        }
      }

      // ============================================================
      // コンテンツ読み込み（並列）
      // ============================================================
      const serperKey = (process.env.SERPER_API_KEY || '').trim();
      const queries = buildProfessionalSearchQueries({ period, stroke, distanceType });

      let protocolContent = '';
      let rtMenuContent = '';
      let rtJapanContent = '';
      let promptContent = '';
      let commonContent = '';
      let webSearchText = '';

      const [contentResult, searchResult] = await Promise.all([
        Promise.all([
          getProtocolContent(),
          getRTMenuProtocolContent(),
          getRTJapanPracticeContent(),
          getPromptContent(),
          getCommonContent(),
        ]).then(([a, b, c, d, e]) => ({ protocolContent: a, rtMenuContent: b, rtJapanContent: c, promptContent: d, commonContent: e }))
          .catch((err) => { console.error('[custom-menu] content load error:', err); return { protocolContent: '', rtMenuContent: '', rtJapanContent: '', promptContent: '', commonContent: '' }; }),
        serperKey && queries.length > 0
          ? searchMultiple(queries, serperKey, 10).then(formatSearchResultsForPrompt).catch(() => '')
          : Promise.resolve(''),
      ]);

      protocolContent = contentResult.protocolContent;
      rtMenuContent   = contentResult.rtMenuContent;
      rtJapanContent  = contentResult.rtJapanContent;
      promptContent   = contentResult.promptContent;
      commonContent   = contentResult.commonContent;
      webSearchText   = searchResult;

      // ============================================================
      // システムプロンプト構築
      // ============================================================
      let systemContent = '';

      // ストーリー文脈（コーチ指示含む）を最優先で先頭に配置
      if (storyContextPrompt) {
        systemContent += storyContextPrompt + '\n\n---\n\n';
      }

      if (protocolContent) {
        systemContent += '【コーチ思想（必ず反映すること）】\n\n' + protocolContent + '\n\n---\n\n';
      }
      if (rtMenuContent) {
        systemContent += '【プロトコル＝ジェネレート（演習ルールの正本）】\n\n' + rtMenuContent + '\n\n---\n\n';
      }
      if (rtJapanContent) {
        systemContent += '【RT Japan 練習内容（コンテンツラベルの品質基準）】\n\n' +
          '以下のRT Japan練習メニューを参照し、同レベルの具体性でドリル名・パターン名を選択すること。\n\n' +
          rtJapanContent + '\n\n---\n\n';
      }
      if (promptContent) {
        systemContent += '【追加プロンプト】\n' + promptContent + '\n\n---\n\n';
      }
      if (commonContent) {
        systemContent += '【共有参照資料（menu-dictionary・menu-patterns・menu-examples・coach-philosophy）】\n' +
          'パターン名・ドリル名は必ずこの辞書から選ぶ。menu-examplesの完成例を**品質基準**として参照。coach-philosophyのコーチ思想・フレーズをintention/coachingPoint/cautionに自然に組み込むこと。\n\n' +
          commonContent + '\n\n---\n\n';
      }
      if (webSearchText) {
        systemContent += webSearchText + '\n---\n\n';
      }
      systemContent += CORE_SYSTEM_PROMPT;

      // ============================================================
      // ユーザープロンプト構築（テンプレート充填タスク）
      // ============================================================

      // 7期×種目別パターンヒント（session-patterns-db.md と完全対応）
      const periodNum = parseInt(period);
      const strokeKey = ['Fr','Ba','Br','Fly','IM'].includes(stroke) ? stroke : 'Fr';
      type HintEntry = { wu: string; kick: string; pull: string; pm: string };
      const PERIOD_PATTERN_HINTS: Record<number, HintEntry> = {
        1: { // リカバリー期
          wu:   '①参照→ Easy feel water / Smooth ① / Fin smooth ② / SKPS基本 / IM order軽め',
          kick: '①参照→ Smooth（ボディポジション確認・①〜②）/ Snorkel Form（呼吸確認・②）/ Vertical kick（感覚刺激）',
          pull: '①参照→ DPS focus（ストローク感覚優先）/ B-up（ゆっくり）/ Easy Pull（水感確認）/ Sculling/Stroke 25mずつ',
          pm:   '①参照→ Build（ペースをゆっくり上げる）/ Des（フォーム確認のみ）/ Easy Race feel（強度低め）',
        },
        2: { // 基礎形成期
          wu:   '②参照→ 1-3:Fin 4-6:NoFin fast hold ② / Snorkel Form しっかり呼吸 ① / Des to fast ② / SKPS / IM order',
          kick: '②参照→ Smooth（ボディポジション・②）/ Des to fast 2t（2本ずつ・②〜③）/ Kick/Swim 25mずつ（②）/ Snorkel Form',
          pull: '②参照→ B-up（Build-up・②）/ Smooth 長距離（②〜③）/ Form & Des 1→4 / Sculling/Stroke 25mずつ',
          pm:   '②参照→ 2:Smooth/1:Fast（100×20 @1\'20"・②〜③）/ Goodstroke fast（③）/ Des（フォーム確認）/ Build up → Fast',
        },
        3: { // 発展形成期
          wu:   '③参照→ Snorkel Form ① / 50mDrill/50mForm ①〜② / Fast hold ③ / Des to fast ② / SKPS build / IM order',
          kick: '③参照→ Des to fast 2t（100×6 @1\'40"・②〜③）/ 上向きFly kick（50×12 @50"・③）/ Fins build（②〜③）/ NoBoard kick/Swim 25mずつ',
          pull: '③参照→ Head up fast/Stroke 25mずつ（50×6・②）/ Des to fast（300×4 @4\'00"・②〜③）/ Smooth 長距離（200×8・②〜③）/ Hold（100×8・③）',
          pm:   '③参照→ Set des to fast（200×3×3R・③）/ Goodstroke fast（強度は低くてOK・③）/ 3:Fast 1:Easy（③〜④）/ Fast hold（100×16・③）',
        },
        4: { // スピード持久力期
          wu:   '④参照→ o:2\'00"(Relax) e:1\'40"(Fast) ② / 25mSculling/15mHead up fast/45mForm/15mFast ② / 20mHead up fast/30mForm ② / Snorkel ②',
          kick: '④参照→ 2H/2E pattern（③〜④）/ Underwater 3→5→7（③）/ Des to fast 2t（強化）/ strong finish last 10m',
          pull: '④参照→ o:Fast e:Easy（④）/ Negative split（③〜④）/ Fast hold（レースペース維持・③〜④）/ Hold（100×8・③）',
          pm:   '④参照→ Descend to race pace（③〜④）/ Build up to race pace/50m毎（④）/ Negative split + ペース管理 / Des 1→4（最終本レースペース）',
        },
        5: { // 耐乳酸期
          wu:   '⑤参照→ o:2\'00"(Relax) e:1\'40"(Fast) ② / 25mSculling/15mHead up fast ② / Snorkel ② / 20mHead up fast/30mStroke',
          kick: '⑤参照→ 2H/2E pattern（③〜④）/ Underwater kick High average（Brは1P1Kを連続で・⑦）/ strong finish last 10m（③）/ odd: Hard / even: Easy',
          pull: '⑤参照→ 200mPace-1" hold（キープできなくなったら2本Easy・④）/ o:Fast e:Fastest（テンポ・強度をしっかり上げて・⑤）/ Negative split + count Dec',
          pm:   '⑤参照→ Race pace & Set des 3セット（③〜④）/ Broken（10sec）レースペース（④）/ Build up to race pace/50m毎（④）/ 200mPace ±1"',
        },
        6: { // 調整期
          wu:   '⑥参照→ Pull&Swim 50×8 Cho 交互 ② / Build up to fastest ⑦ / Drill・Form・Sprintなど自由に ①② / o:Fast(ブイを挟んで) e:Easy(Pull) ③',
          kick: '⑥参照→ Kick&Swim Fast（最速感覚・⑦）/ Vertical kick（神経刺激・①）/ Underwater kick Smooth ① → High average ⑦',
          pull: '⑥参照→ Sculling→Race Swim（水感直結・②→⑦）/ Sculling/Stroke 距離は自由に ② / o:Fast(ブイを挟んで) e:Easy(Pull) ③',
          pm:   '⑥参照→ Parachute resist 15m以上20m未満 fastest ⑦ / Item assist（フィン・パドル）⑦ / Form fast 15m以上35m以内で距離は自由 ⑦ / Resist 15mFast/15mEasyで戻る ⑦',
        },
        7: { // テーパー期
          wu:   '⑦参照→ Pull&Swim 50×4 Cho 交互 ② / Fin smooth ② / Build up to fastest（短め）⑦ / Drill・Form・Sprint自由に（量少なめ）',
          kick: '⑦参照→ Kick 25×4 Cho :45 垂直キック感覚 ① / Smooth（疲労抜き・短め）/ Kick&Swim Fast（少本数）',
          pull: '⑦参照→ Sculling/Stroke 距離は自由に 水感強化 ② / Pull&Swim 50×4 交互 / Sculling→Race Swim（水感最終確認）',
          pm:   '⑦参照→ Parachute resist（少本数）⑦ / Item assist（少本数）⑦ / Form fast 15m以上35m以内で距離は自由 ⑦ / Build up to fastest ⑦',
        },
      };
      // 種目別追加ヒント（全期共通で上乗せ）
      const STROKE_DRILL_HINTS: Record<string, string> = {
        Fr:  'Fr固有ドリル→ 片手左右交互 / キャッチアップ / ハイエルボーキャッチ / フィスト→オープン / ハイエルボー+ストロークカウント Dec',
        Ba:  'Ba固有ドリル→ 片手スイム / 6-1-6バランス / スカーリング→Swim / 腕伸ばし6キック+Swim / ローリング強調（キャッチアップ厳禁）',
        Br:  'Br固有ドリル→ 壁キック分離 / グライドプル / 2キック1プル タイミング / Brキック(Fin) / プルアウト強調 狭い軌道',
        Fly: 'Fly固有ドリル→ ヒップドライブ片キック左右 / ショルダードリル / 1キック1プル→2キック1プル / ドルフィン水中+ハイエルボー',
        IM:  'IM固有ドリル→ 4泳法ドリル順（弱点種目2本）/ odd:IM Order even:専門種目 / IM Order Form & Des / ターン練習（種目切り替え）',
      };
      const ph = PERIOD_PATTERN_HINTS[periodNum] ?? PERIOD_PATTERN_HINTS[3];
      const drillHint = STROKE_DRILL_HINTS[strokeKey] ?? STROKE_DRILL_HINTS['Fr'];
      const patternHints = [
        `W-up（Drill統合・多段階）: ${skeleton.warmUp.totalM + skeleton.drill.totalM}m — Cho段階は {WU_PATTERN_N} に変化をつけ（体動かし→リズム構築）、最終段階の {DR_DRILL_N} に ${stroke} 固有ドリルを生成。W-up参照: ${ph.wu} ／ ${drillHint}`,
        `Kick: ${skeleton.kick.totalM}m — {KI_PATTERN_N} に以下から最適なものを選ぶか同スタイルでオリジナル命名。参照: ${ph.kick}`,
        `Pull: ${skeleton.pull.totalM}m — {PL_PATTERN_N} に以下から最適なものを選ぶか同スタイルでオリジナル命名。参照: ${ph.pull}`,
        `Pre-Main: ${skeleton.preMain.totalM}m — {PM_CONTENT} に以下から最適なものを使う（@rest=${skeleton.preMain.segments[0]?.restHint ?? '30sec'} 変更禁止）。参照: ${ph.pm}`,
        `Main カテゴリ: ${skeleton.mainCategory}（変更不可）・rest: ${skeleton.main.segments[0]?.restHint ?? '30sec'}（変更不可）`,
      ].join('\n');

      const skeletonDesc = [
        `W-up ${skeleton.warmUp.totalM}m（Cho多段階）+ Drill ${skeleton.drill.totalM}m（W-up内技術段階） / Kick ${skeleton.kick.totalM}m`,
        `Pull ${skeleton.pull.totalM}m / Pre-Main ${skeleton.preMain.totalM}m / Main ${skeleton.main.totalM}m / Down ${skeleton.down.totalM}m`,
        `合計: ${skeleton.targetDist}m（変更禁止）`,
      ].join('\n');

      const adjustNotes = skeleton.adjustmentNotes.length
        ? `適用済み補正: ${skeleton.adjustmentNotes.join(', ')}`
        : '';

      const sprint50mDirective = generationMode === 'sprint_50m'
        ? `【50m特化モード指示】
- マスターズ向け50m特化メニューとして設計する。
- 短距離・スプリント品質を最優先し、量よりも1本ごとの質を重視する。
- スタート、浮き上がり、15m、25m、後半失速対策、最大速度、テンポ維持を意識した内容にする。
- 十分なレストを前提に、フォーム崩れを防ぎながら高品質なスピード刺激を入れる。
- ジュニア向けではなく、マスターズが安全に取り組める表現にする。`
        : '';
      const explanationDirective = explanationLevel === 'technical'
        ? `【説明レベル指示】競泳経験者向けに、専門用語中心で簡潔に書く。`
        : `【説明レベル指示】専門用語を使いすぎず、意図や目的をわかりやすく説明する。`;

      const buildUserPrompt = (retryHint = '') =>
        `${retryHint}【タスク】以下のテンプレートの {PLACEHOLDER} スロットをオリジナルのコンテンツラベルで埋めてください。
**数値・本数・@rest・強度番号（①〜⑦）は絶対変更禁止。{PLACEHOLDER} 部分のみ書き換える。**

【多様性の徹底】同じ条件でも毎回異なる内容を生成すること。前回と同じドリル名・パターン名・コーチングポイントは使わない。
- ドリル・パターンの軸を変える（感覚軸 / 技術軸 / 動作軸 / タイミング軸 / パワー軸など）
- coachingPoint・intentionの切り口を毎回変える（今日のテーマを明確に立てる）
- Pre-Mainの構成を期・距離タイプごとに変化させる（Broken/Des/Negative split/Pyramid等）

【重要】コンテンツラベルは固定パターンを使い回さず、下記条件（種目・期・レベル・状況）に最適なオリジナル内容を毎回新鮮に生成すること。
- {WU_PATTERN} → 種目と期に合ったW-upの泳法フォーカスを自由命名（例: SKPS build / odd:Ba even:Fr Des 等）
- {DR_DRILL_N} → ${stroke} 固有の具体的なドリル名をオリジナル生成（形よりも水感・ブレーキゼロを意識した命名で）
- {KI_PATTERN_N} → キックの目的・感覚・構成を反映した自由命名
- {PL_PATTERN_N} → プルの狙い・テンポ・フォーム指示を反映した自由命名
- {PM_CONTENT} → Pre-Mainの内容を期・距離タイプ・コンディションに合わせて自由生成

【入力条件】
- 期: ${PERIOD_LABELS[period] ?? period}
- 種目: ${stroke}
- 生成モード: ${generationModeLabel}
- 対象レース: ${raceEventLabel}
- プール種別: ${poolLengthLabel}
- ベストタイム: ${bestTime || '未入力'}
- 説明レベル: ${explanationLevelLabel}
- 総距離: ${distance}m（骨格で確定済み・変更禁止）
- 年齢: ${age}　距離タイプ: ${distanceType}
- レベル: ${level}
- 状況: ${condition}　練習時間: ${practiceTime}分
${sprint50mDirective ? `${sprint50mDirective}\n` : ''}${explanationDirective}
${adjustNotes ? `- ${adjustNotes}` : ''}
${condition.includes('絶好調') ? `【絶好調コンディション指示】
- intention: ピーク状態を活かした「攻めの練習」の狙いを前向きに書く。今日の感覚の鋭さを最大限に使う視点で。
- coachingPoint: 感覚の鋭さ・TSS最小化の極限追求・タイムへのこだわりを具体的に書く
- caution: 好調時こそ「やりすぎ」に陥るリスク・翌日への疲労管理・技術の雑さへの警戒を言及する
- expectedEffect: ピーク状態で積んだ質の高い練習が身体・神経系にどう定着するかを具体的に書く` : condition.includes('疲労残り') || condition.includes('月経期') ? `【高疲労・回復優先指示】
- intention: 疲労状態での「質を落とさない賢い練習」の意義を書く。無理せず技術に集中する狙いで。
- coachingPoint: フォーム保持・体力消耗を最小化する泳ぎ・感覚確認に絞った意識点を書く
- caution: 疲労蓄積のリスク・強度超過の危険性・回復を優先する判断基準を具体的に書く
- expectedEffect: 疲労下でも技術確認・軽負荷での身体メンテナンスによる回復促進効果を書く` : condition.includes('疲労') ? `【軽〜中疲労対応指示】
- intention: 疲労を考慮した「丁寧な技術練習」の狙いを書く。量より質・感覚優先の視点で。
- coachingPoint: 疲労があっても維持できるフォームのポイント・省エネな泳ぎの意識を具体的に書く
- caution: 疲労サインへの敏感な対応・早めの強度調整・本数削減の基準を書く` : ''}
${(level.includes('フィットネス') || level.includes('初心者') || level.includes('一般スイマー')) ? `【初級レベル対応指示】
- Drill: 基本動作に特化した易しいドリル名をオリジナル生成（キャッチ感覚・体位・呼吸タイミング系）
- coachingPoint: フォームの基礎・感覚づくり・怪我予防を前面に出す
- intention: スピードより「動きを覚える」「水に慣れる」視点で書く
- caution: 過負荷・フォーム崩れ・体力消耗に敏感に言及する` : (level.includes('トップ選手') || level.includes('競技選手')) ? `【上級レベル対応指示】
- Drill: 高強度・感覚系のドリル名をオリジナル生成（パワー伝達・ストロークレート・レース動作系）
- coachingPoint: TSS最小化・タイム向上・レースペース意識を具体的に書く
- intention: レースシミュレーション・目標タイムに紐づけた狙いで書く
- caution: オーバートレーニング・技術の雑さ・メンタルケアを言及する` : `【中級レベル対応指示】
- Drill: 種目の技術課題に即したドリル名をオリジナル生成（フォーム維持・効率向上系）
- coachingPoint: フォーム維持と体力向上のバランスを書く
- intention: 期の目標に沿ったバランスの取れた狙いを書く`}

【骨格（各ブロック距離・強度は確定済み）】
${skeletonDesc}

【ブロック別コンテンツ生成ガイド】
${patternHints}

【テンプレート（{PLACEHOLDER}のみ置き換える・数値変更禁止）】
warmUp  : "${tmpl.warmUpTemplate}"
drill   : ""  ← DrillはwarmUpに統合済み。必ず空文字 "" で出力すること
kick    : "${tmpl.kickTemplate}"
pull    : "${tmpl.pullTemplate}"
preMain : "${tmpl.preMainTemplate}"
main    : "${tmpl.mainTemplate}"
down    : "${tmpl.downStr}"（変更禁止）

【絶対ルール（違反すると再生成）】
- kick・pull・preMainは絶対に空文字 "" にしない。warmUpにキック・プル要素が含まれていても、それぞれ独立したセットとして出力すること
- テンプレート内の強度表記（①〜⑦、A1/A2/EN1/EN2/EN3/AN1/AN2/MAX）は一切変更禁止。（{KI_PATTERN_N}）（EN1）の形式のまま、{KI_PATTERN_N} だけを置き換えること
- {PLACEHOLDER} 以外の数値・本数・@rest・強度記号は変更禁止

【出力形式】JSONのみ（説明文不要）。以下の全キーを含むこと。
- {PLACEHOLDER}を埋めた完成形のテキストをそのまま出力（テンプレの数値は一切変えない）
- intention/coachingPoint/cautionはこの8条件に合わせた固有の内容で書く（汎用文禁止）
- warmUpM〜downMは骨格の数値をそのままコピー（変更禁止）

{
  "purpose": "【目的】1行（期・種目・状況を反映）",
  "warmUp": "(テンプレートwarmUpを{PLACEHOLDER}埋め済みで出力)",
  "drill":  "(テンプレートdrillを{PLACEHOLDER}埋め済みで出力)",
  "kick":   "(テンプレートkickを{PLACEHOLDER}埋め済みで出力)",
  "pull":   "(テンプレートpullを{PLACEHOLDER}埋め済みで出力)",
  "preMain":"(テンプレートpreMainを{PM_CONTENT}埋め済みで出力)",
  "dive":   "${tmpl.diveStr}",
  "rest":   "${tmpl.restStr}",
  "main":   "(テンプレートmainを{PLACEHOLDER}埋め済みで出力)",
  "down":   "${tmpl.downStr}",
  "total":  "${tmpl.totalStr}",
  "intention": "今日の狙い（2〜4行。期の目的×コンディション×距離タイプの戦略意図を統合した固有の狙い。汎用文禁止）",
  "coachingPoint": "指導ポイント（3つ。① TSS最小化 ② 水感・ブレーキゼロ ③ このセッション固有の技術焦点。各ポイントは何をどう意識するかまで具体的に）",
  "caution": "注意点（3つ。状況・年齢・疲労・月経期を反映した固有の注意。汎用文禁止）",
  "expectedEffect": "期待効果（2〜3行。① 生理的適応 ② 技術的発展 ③ メンタル・成功体験 の3軸で具体的に。汎用文禁止）",
  "warmUpM": ${skeleton.warmUp.totalM},
  "drillM":  ${skeleton.drill.totalM},
  "kickM":   ${skeleton.kick.totalM},
  "pullM":   ${skeleton.pull.totalM},
  "preMainM":${skeleton.preMain.totalM},
  "mainM":   ${skeleton.main.totalM},
  "downM":   ${skeleton.down.totalM}
}`;

      // ============================================================
      // LLM呼び出し
      // ============================================================
      const openai = new OpenAI({ apiKey });
      const TEXT_KEYS = [
        'purpose', 'warmUp', 'drill', 'kick', 'pull', 'preMain',
        'dive', 'rest', 'main', 'down', 'total',
        'intention', 'coachingPoint', 'caution', 'expectedEffect',
      ];

      /**
       * LLMレスポンスをパースし、骨格のM値・totalで強制上書きする。
       * 距離の正確性は骨格が保証するため、M値はLLM出力に依存しない。
       */
      // 強度ラベル（A1/EN1等）をskeleton値で復元する。LLMが誤って変更した場合も正しい値に戻す。
      const restoreBlockIntensities = (
        text: string,
        segments: Array<{ intensity: string }>,
      ): string => {
        if (!text) return text;
        const INTENSITY_RE = /（(A[12]|EN[1-4]|AN[12]|MAX)）/g;
        const parts = text.split(' → ');
        if (parts.length === segments.length) {
          return parts
            .map((part, i) => part.replace(INTENSITY_RE, `（${segments[i].intensity}）`))
            .join(' → ');
        }
        // セグメント数が合わない場合は先頭セグメントの強度で統一
        if (segments.length >= 1) {
          return text.replace(INTENSITY_RE, `（${segments[0].intensity}）`);
        }
        return text;
      };

      const parseAndAssemble = (raw: string): Record<string, unknown> | null => {
        try {
          const parsed = JSON.parse(raw) as Record<string, unknown>;
          if (!TEXT_KEYS.every((k) => typeof parsed[k] === 'string')) return null;

          // kick/pull/preMainが空文字の場合はLLMの誤出力 → リトライ対象
          const REQUIRED_NON_EMPTY = ['kick', 'pull', 'preMain'] as const;
          if (REQUIRED_NON_EMPTY.some((k) => String(parsed[k] ?? '').trim() === '')) return null;

          const result: Record<string, unknown> = Object.fromEntries(
            TEXT_KEYS.map((k) => [k, String(parsed[k] ?? '')])
          );

          // mainテンプレートはプレースホルダーなし → 骨格テンプレートで強制上書き（LLM書き換え防止）
          result.main = tmpl.mainTemplate;

          // 強度ラベルをskeleton値で強制復元（LLMが変更しても正しい値に戻す）
          // warmUpはwarmUp + drillセグメントを連結した構成
          result.warmUp  = restoreBlockIntensities(
            String(result.warmUp),
            [...skeleton.warmUp.segments, ...skeleton.drill.segments],
          );
          result.kick    = restoreBlockIntensities(String(result.kick),    skeleton.kick.segments);
          result.pull    = restoreBlockIntensities(String(result.pull),    skeleton.pull.segments);
          result.preMain = restoreBlockIntensities(String(result.preMain), skeleton.preMain.segments);

          // 骨格M値で強制上書き（距離の算術保証）
          result.warmUpM  = skeleton.warmUp.totalM;
          result.drillM   = skeleton.drill.totalM;
          result.kickM    = skeleton.kick.totalM;
          result.pullM    = skeleton.pull.totalM;
          result.preMainM = skeleton.preMain.totalM;
          result.mainM    = skeleton.main.totalM;
          result.downM    = skeleton.down.totalM;
          result.total    = tmpl.totalStr;

          return result;
        } catch {
          return null;
        }
      };

      const doGenerate = async (retryHint = '', temp = 0.45): Promise<string | null> => {
        const completion = await openai.chat.completions.create({
          model,
          messages: [
            { role: 'system', content: systemContent },
            { role: 'user',   content: buildUserPrompt(retryHint) },
          ],
          temperature: temp,
          max_tokens: 8192,
          response_format: { type: 'json_object' },
        });
        return completion.choices[0]?.message?.content?.trim() ?? null;
      };

      // 初回生成
      let rawContent = await doGenerate();
      if (!rawContent) {
        console.error('[custom-menu] Empty completion');
        return ensureJson500();
      }

      let result = parseAndAssemble(rawContent);

      // JSONパース失敗・kick/pull/preMain空文字のリトライ
      if (!result) {
        const retryHint = '【再試行】以下を必ず守って再生成してください:\n- JSONの全キーを含めること\n- kick・pull・preMainは絶対に空文字 "" にしない（warmUpに同種要素があっても独立したセットを出力）\n- 強度表記（A1/EN1等）はテンプレートのままコピーし変更しない\n\n';
        rawContent = await doGenerate(retryHint, 0.3);
        if (rawContent) result = parseAndAssemble(rawContent);
      }

      // コンテンツ品質バリデーション（プレースホルダー未充填・空文字・汎用文検出）
      if (result) {
        const qualityIssues: string[] = [];
        const checkFields = ['warmUp', 'kick', 'pull', 'preMain', 'main'];
        for (const field of checkFields) {
          const val = String(result[field] ?? '');
          const match = val.match(/\{[A-Z_0-9]+\}/);
          if (match) qualityIssues.push(`${field}にプレースホルダー${match[0]}が残っています`);
          if (['kick', 'pull', 'preMain'].includes(field) && val.trim() === '') {
            qualityIssues.push(`${field}が空文字です。warmUpに同種の要素があっても必ず独立したセットとして出力してください`);
          }
        }
        const intention = String(result.intention ?? '');
        if (intention.length < 60) qualityIssues.push('intentionが短すぎます（60文字以上必要）');
        const genericPhrases = ['基礎を固める', 'スタミナをつける', '体力向上を図る', '体調に注意してください', '無理しないように'];
        for (const phrase of genericPhrases) {
          if (intention.includes(phrase)) qualityIssues.push(`intentionに汎用表現「${phrase}」が含まれています`);
        }
        if (qualityIssues.length > 0) {
          console.warn('[custom-menu] content quality issues:', qualityIssues);
          const qualityRetryHint = `【品質修正が必要です】以下の問題を修正して再生成してください:\n${qualityIssues.map(i => `- ${i}`).join('\n')}\nRT Japan スタイルの具体的なパターン名・コーチの語り口で書き直すこと。\n\n`;
          rawContent = await doGenerate(qualityRetryHint, 0.4);
          if (rawContent) result = parseAndAssemble(rawContent) ?? result;
        }
      }

      if (!result) {
        return NextResponse.json({ menu: rawContent, result: null });
      }

      // 距離・時間の整合性メモ（参考情報として付与）
      const dtValidation = validateDistanceTime(distance, practiceTime);
      if (dtValidation && (dtValidation.status === 'dense' || dtValidation.status === 'not_recommended')) {
        const timeNum = parseInt(practiceTime, 10) || 90;
        const suggestion = dtValidation.suggestedPracticeTime
          ? `余裕を持って取り組むには${dtValidation.suggestedPracticeTime}分を推奨します。`
          : '体調に合わせて調整してください。';
        const coachNote = `※${timeNum}分で${distance}mは高強度設計です。${suggestion}`;
        const existing = String(result.expectedEffect ?? '').trim();
        result.expectedEffect = existing ? `${existing}\n\n${coachNote}` : coachNote;
      }

      return NextResponse.json({ result, menu: null });

    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('[custom-menu] POST error (inner):', message);

      const errObj = err as { status?: number; response?: { status?: number; headers?: Headers; body?: unknown }; message?: string };
      const status = errObj?.status ?? errObj?.response?.status;
      const contentType = (errObj?.response?.headers as unknown as Record<string, unknown>)?.['content-type'] ?? '';

      const isAuthError  = String(message).includes('API key') || String(message).includes('401') || String(message).includes('Incorrect API key');
      const isQuotaError = String(message).includes('429') || String(message).includes('quota') || String(message).includes('billing');

      let errorText: string;
      if (status === 401 || status === 403) {
        errorText = 'キーが無効か権限不足です。OpenAIのAPIキーとモデルの利用可否を確認してください。';
      } else if (String(contentType).includes('text/html')) {
        errorText = 'OpenAIではなくHTMLが返っています。認証・プロキシ・ネットワークを確認してください。';
      } else if (isAuthError) {
        errorText = 'APIキーが無効です。.env.ai の OPENAI_API_KEY を確認してください。';
      } else if (isQuotaError) {
        errorText = 'OpenAIの利用枠を超えました。Billingで支払い方法を追加するか、「クイック作成」ボタンをご利用ください。';
      } else {
        errorText = `メニュー生成エラー: ${message}`;
      }

      console.error('[custom-menu] Error detail:', errorText);
      return ensureJson500();
    }
  } catch (outerErr: unknown) {
    const msg = outerErr instanceof Error ? outerErr.message : String(outerErr);
    console.error('[custom-menu] POST uncaught (500):', msg);
    return ensureJson500();
  }
}
