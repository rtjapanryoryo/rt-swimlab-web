import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import path from 'path';
import { config as loadEnv } from 'dotenv';
import OpenAI from 'openai';
import { getEffectiveUser, createClient, getServiceRole } from '@/lib/supabase/server';
import { IS_DEMO_PERIOD, calcUsageStatus, MAINTENANCE_MODE } from '@/lib/plan-limits';
import {
  buildCustomMenuSystemPrompt,
  buildCustomMenuUserPrompt,
  CUSTOM_MENU_CONTEXT_VERSIONS,
  CUSTOM_MENU_MODEL_DEFAULTS,
  getRaceEventLabel,
} from '@/lib/ai-context/custom-menu-context';
import {
  generateMainSetPlan,
  MAIN_SET_RULE_VERSION,
  type MainSetEvent,
} from '@/lib/rt/main-set-generator';
import type { TrainingInput, TrainingResult } from '@/lib/rt/generator';
import {
  formatPersonalBest,
  TIMING_RULE_VERSION,
  type PersonalBestTimingReference,
} from '@/lib/rt/training-timing';

// APIルートでも .env.ai を読む（next.config経由で読めない場合のフォールバック）。
try {
  loadEnv({ path: path.resolve(process.cwd(), '.env.ai') });
} catch {
  // .env.aiがなくても、Vercelまたはシェルの環境変数で続行します。
}

const MAIN_SET_TIMES = new Set(['20', '30', '45', '60']);
const INTERNAL_ERROR = {
  error: 'internal_error',
  message: '現在生成できません。時間をおいて再試行してください',
} as const;

type GeneratedCopy = {
  purpose: string;
  intention: string;
  coachingPoint: string;
  caution: string;
  expectedEffect: string;
};

function getOpenAIStatus(): { configured: boolean; reason?: 'missing' | 'placeholder' } {
  const key = (process.env.OPENAI_API_KEY || '').trim();
  if (!key) return { configured: false, reason: 'missing' };
  if (key === 'YOUR_API_KEY_HERE') return { configured: false, reason: 'placeholder' };
  return { configured: true };
}

function normalizeGenerationMode(value: unknown): 'standard' | 'sprint_50m' {
  return value === 'sprint_50m' ? 'sprint_50m' : 'standard';
}

function normalizePoolLength(value: unknown): 'short_course' | 'long_course' {
  return value === 'long_course' ? 'long_course' : 'short_course';
}

function normalizeRaceEvent(value: unknown, optional = false): string {
  const event = typeof value === 'string' ? value.trim() : '';
  if (optional && !event) return '';
  return getRaceEventLabel(event) ? event : '';
}

function parseRaceEvent(raceEvent: string): Omit<MainSetEvent, 'personalBest'> | null {
  const match = raceEvent.match(/^(Fr|Ba|Br|Fly|IM)_(\d+)m$/);
  if (!match) return null;
  return {
    raceEvent,
    stroke: match[1] as MainSetEvent['stroke'],
    raceDistanceM: Number(match[2]),
  };
}

function normalizeGeneratedText(value: unknown): string {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean).join('\n');
  }
  return typeof value === 'string' ? value.trim() : '';
}

function parseGeneratedCopy(raw: string): GeneratedCopy | null {
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const result: GeneratedCopy = {
      purpose: normalizeGeneratedText(parsed.purpose),
      intention: normalizeGeneratedText(parsed.intention),
      coachingPoint: normalizeGeneratedText(parsed.coachingPoint),
      caution: normalizeGeneratedText(parsed.caution),
      expectedEffect: normalizeGeneratedText(parsed.expectedEffect),
    };
    return Object.values(result).every(Boolean) ? result : null;
  } catch {
    return null;
  }
}

function requiredInputErrors(body: Record<string, unknown>): string[] {
  const fields = [
    ['period', '目的（期）'],
    ['raceEvent', 'メイン種目1'],
    ['age', '年齢'],
    ['level', 'レベル'],
    ['condition', '状況'],
    ['mainSetTime', 'メインセット時間'],
  ] as const;
  return fields
    .filter(([key]) => !String(body[key] ?? '').trim())
    .map(([, label]) => label);
}

async function loadPersonalBest(args: {
  client: NonNullable<Awaited<ReturnType<typeof createClient>>>;
  userId: string;
  event: Omit<MainSetEvent, 'personalBest'>;
  poolLength: 'short_course' | 'long_course';
}): Promise<PersonalBestTimingReference | null> {
  const { data, error } = await args.client
    .from('personal_best_times')
    .select('stroke, distance_m, pool_length, time_centiseconds')
    .eq('user_id', args.userId)
    .eq('stroke', args.event.stroke)
    .eq('distance_m', args.event.raceDistanceM)
    .eq('pool_length', args.poolLength)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data || Number(data.time_centiseconds) <= 0) return null;
  return {
    stroke: String(data.stroke),
    distanceM: Number(data.distance_m),
    poolLength: data.pool_length as 'short_course' | 'long_course',
    timeCentiseconds: Number(data.time_centiseconds),
  };
}

export async function GET() {
  try {
    const user = await getEffectiveUser();
    const status = getOpenAIStatus();
    if (!user) return NextResponse.json({ openaiConfigured: false });
    return NextResponse.json({
      openaiConfigured: status.configured,
      openaiReason: status.reason,
    });
  } catch (error) {
    console.error('[custom-menu] GET error:', error instanceof Error ? error.message : 'unknown error');
    return NextResponse.json(INTERNAL_ERROR, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (MAINTENANCE_MODE) {
    return NextResponse.json(
      { error: 'メンテナンス中です。近日中に正式公開予定です。' },
      { status: 503 },
    );
  }

  try {
    const user = await getEffectiveUser();
    if (!user) {
      return NextResponse.json(
        { error: 'login_required', message: 'ログインが必要です' },
        { status: 401 },
      );
    }

    if (!IS_DEMO_PERIOD && !user.isBypass) {
      const client = await createClient();
      if (client) {
        const monthStart = new Date();
        monthStart.setDate(1);
        monthStart.setHours(0, 0, 0, 0);
        const [totalResult, monthResult] = await Promise.all([
          client.from('generation_logs').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
          client.from('generation_logs').select('*', { count: 'exact', head: true }).eq('user_id', user.id).gte('created_at', monthStart.toISOString()),
        ]);
        const usage = calcUsageStatus({
          planId: 'free',
          customCountTotal: totalResult.count ?? 0,
          customCountThisMonth: monthResult.count ?? 0,
        });
        if (usage.isLimitReached) {
          return NextResponse.json(
            { error: 'limit_reached', message: 'カスタム生成の上限に達しました。プランをアップグレードしてください。' },
            { status: 429 },
          );
        }
      }
    }

    let body: Record<string, unknown>;
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return NextResponse.json({ error: 'リクエストのJSON形式が不正です。' }, { status: 400 });
    }

    const missingItems = requiredInputErrors(body);
    if (missingItems.length > 0) {
      return NextResponse.json(
        { error: '入力が不足しています。以下の項目を入力してください。', missingItems },
        { status: 400 },
      );
    }

    const raceEvent = normalizeRaceEvent(body.raceEvent);
    const rawRaceEvent2 = normalizeRaceEvent(body.raceEvent2, true);
    const raceEvent2 = rawRaceEvent2 === raceEvent ? '' : rawRaceEvent2;
    const primary = parseRaceEvent(raceEvent);
    const secondary = raceEvent2 ? parseRaceEvent(raceEvent2) : null;
    const mainSetTime = String(body.mainSetTime ?? '');
    if (!primary || (raceEvent2 && !secondary) || !MAIN_SET_TIMES.has(mainSetTime)) {
      return NextResponse.json({ error: 'メイン種目またはメインセット時間が不正です。' }, { status: 400 });
    }

    const poolLength = normalizePoolLength(body.poolLength);
    const client = user.isBypass ? getServiceRole() : await createClient();
    let primaryBest: PersonalBestTimingReference | null = null;
    let secondaryBest: PersonalBestTimingReference | null = null;
    if (client) {
      try {
        // 種目・距離・プール種別が完全一致する本人の記録だけを使用し、推測換算は行いません。
        [primaryBest, secondaryBest] = await Promise.all([
          loadPersonalBest({ client, userId: user.id, event: primary, poolLength }),
          secondary
            ? loadPersonalBest({ client, userId: user.id, event: secondary, poolLength })
            : Promise.resolve(null),
        ]);
      } catch (error) {
        // 記録取得に失敗しても生成自体は止めず、安全側のRestへフォールバックします。
        console.warn('[custom-menu] personal best lookup failed (non-fatal):', error instanceof Error ? error.message : 'unknown error');
      }
    }

    const generationMode = normalizeGenerationMode(body.generationMode);
    const input: TrainingInput = {
      period: String(body.period),
      stroke: primary.stroke,
      distance: '',
      age: String(body.age),
      distanceType: '',
      level: String(body.level),
      condition: String(body.condition),
      practiceTime: '',
      generationMode,
      poolLength,
      raceEvent,
      raceEvent2,
      bestTime: '',
      explanationLevel: 'technical',
      mainSetTime: mainSetTime as TrainingInput['mainSetTime'],
    };

    const primaryEvent: MainSetEvent = { ...primary, personalBest: primaryBest };
    const secondaryEvent: MainSetEvent | null = secondary
      ? { ...secondary, personalBest: secondaryBest }
      : null;
    const plan = generateMainSetPlan({ input, primaryEvent, secondaryEvent });

    const apiKey = (process.env.OPENAI_API_KEY || '').trim().replace(/\r?\n/g, '');
    const model = (process.env.OPENAI_MODEL || CUSTOM_MENU_MODEL_DEFAULTS.model).trim()
      || CUSTOM_MENU_MODEL_DEFAULTS.model;
    if (!apiKey || apiKey === 'YOUR_API_KEY_HERE') {
      return NextResponse.json(INTERNAL_ERROR, { status: 500 });
    }

    const bestTimeSummary = [
      `${getRaceEventLabel(raceEvent)}: ${primaryBest ? formatPersonalBest(primaryBest.timeCentiseconds) : '登録なし（Restで設計）'}`,
      ...(secondary ? [
        `${getRaceEventLabel(raceEvent2)}: ${secondaryBest ? formatPersonalBest(secondaryBest.timeCentiseconds) : '登録なし（Restで設計）'}`,
      ] : []),
    ].join('\n');

    const systemPrompt = buildCustomMenuSystemPrompt();
    const userPrompt = buildCustomMenuUserPrompt({
      generationMode,
      raceEvent,
      raceEvent2: secondary ? raceEvent2 : undefined,
      period: input.period,
      age: input.age,
      level: input.level,
      condition: input.condition,
      poolLength,
      mainSetTime,
      bestTimeSummary,
      plan,
    });

    const openai = new OpenAI({ apiKey });
    const completion = await openai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: CUSTOM_MENU_MODEL_DEFAULTS.temperature,
      max_tokens: CUSTOM_MENU_MODEL_DEFAULTS.maxTokens,
      response_format: {
        type: CUSTOM_MENU_MODEL_DEFAULTS.responseFormat as 'json_object',
      },
    });
    const raw = completion.choices[0]?.message?.content?.trim() ?? '';
    const generated = parseGeneratedCopy(raw);
    if (!generated) {
      console.error('[custom-menu] invalid OpenAI response shape');
      return NextResponse.json(INTERNAL_ERROR, { status: 500 });
    }

    const bestTimeReferences = [
      {
        raceEvent,
        display: primaryBest ? formatPersonalBest(primaryBest.timeCentiseconds) : null,
        source: primaryBest ? 'personal_best' as const : 'none' as const,
      },
      ...(secondary ? [{
        raceEvent: raceEvent2,
        display: secondaryBest ? formatPersonalBest(secondaryBest.timeCentiseconds) : null,
        source: secondaryBest ? 'personal_best' as const : 'none' as const,
      }] : []),
    ];
    const result: TrainingResult = {
      purpose: generated.purpose,
      warmUp: '',
      drill: '',
      kick: '',
      pull: '',
      preMain: '',
      dive: '',
      rest: '',
      main: plan.template,
      down: '',
      total: `メインセット合計：${plan.totalM.toLocaleString()}m`,
      warmUpM: 0,
      drillM: 0,
      kickM: 0,
      pullM: 0,
      preMainM: 0,
      mainM: plan.totalM,
      downM: 0,
      intention: generated.intention,
      coachingPoint: generated.coachingPoint,
      caution: generated.caution,
      expectedEffect: generated.expectedEffect,
      generationContext: {
        timingRuleVersion: TIMING_RULE_VERSION,
        contextVersion: CUSTOM_MENU_CONTEXT_VERSIONS.contextVersion,
        promptVersion: CUSTOM_MENU_CONTEXT_VERSIONS.promptVersion,
        knowledgeVersion: CUSTOM_MENU_CONTEXT_VERSIONS.knowledgeVersion,
        outputContractVersion: CUSTOM_MENU_CONTEXT_VERSIONS.outputContractVersion,
        evaluationVersion: CUSTOM_MENU_CONTEXT_VERSIONS.evaluationVersion,
        generationRuleVersion: MAIN_SET_RULE_VERSION,
        model,
        bestTimeSource: primaryBest ? 'personal_best' : 'none',
        bestTimeDisplay: primaryBest ? formatPersonalBest(primaryBest.timeCentiseconds) : null,
        bestTimeEvent: raceEvent,
        poolLength,
        bestTimeReferences,
        mainSetTimeMinutes: Number(mainSetTime),
        estimatedDurationMinutes: plan.estimatedDurationMinutes,
      },
    };

    return NextResponse.json({ result, menu: null });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown error';
    console.error('[custom-menu] POST error:', message);
    return NextResponse.json(INTERNAL_ERROR, { status: 500 });
  }
}
