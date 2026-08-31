import contextConfig from '../../../content/ai/custom/context-config.json';
import coachingGuidanceConfig from '../../../content/ai/custom/coaching-guidance.json';
import evaluationConfig from '../../../content/ai/custom/evaluation-cases.json';

type PromptPlan = {
  template: string;
  totalM: number;
  estimatedDurationMinutes: number;
  segments: Array<{
    label: string;
    rounds: number;
    repetitions: number;
    distanceM: number;
    totalM: number;
    intensity: string;
    intensityNumber: string;
    timing: {
      type: 'circle' | 'rest';
      display: string;
    };
  }>;
};

export type CustomMenuPromptInput = {
  generationMode: 'standard' | 'sprint_50m';
  raceEvent: string;
  raceEvent2?: string;
  period: string;
  age: string;
  level: string;
  condition: string;
  poolLength: 'short_course' | 'long_course';
  mainSetTime: string;
  bestTimeSummary: string;
  plan: PromptPlan;
};

export type CustomMenuEvaluationCase = {
  id: string;
  title: string;
  inputSummary: string[];
  expected: string[];
};

type GuidanceEntry = {
  label: string;
  coachingPoints: string[];
  cautions: string[];
};

export type SelectedCustomMenuGuidance = {
  category: string;
  key: string;
  label: string;
  coachingPoints: string[];
  cautions: string[];
};

export const CUSTOM_MENU_CONTEXT_VERSIONS = Object.freeze({
  ...contextConfig.manifest,
});

export const CUSTOM_MENU_MODEL_DEFAULTS = Object.freeze({
  ...contextConfig.modelDefaults,
});

export const CUSTOM_MENU_MANAGEMENT_LOCATIONS = Object.freeze([
  {
    path: 'content/ai/custom/context-config.json',
    label: 'プロンプト・出力形式・モデル既定値',
    status: 'active' as const,
  },
  {
    path: 'content/ai/custom/coaching-guidance.json',
    label: '種目・距離・期・生成モード別の指導ナレッジ',
    status: 'active' as const,
  },
  {
    path: 'src/lib/ai-context/custom-menu-context.ts',
    label: '入力条件からAI向け文章を組み立てる処理',
    status: 'active' as const,
  },
  {
    path: 'src/lib/rt/main-set-generator.ts',
    label: 'メインセットの距離・本数・強度・サークル算出',
    status: 'active' as const,
  },
  {
    path: 'src/lib/rt/training-timing.ts',
    label: 'ベストタイムを使ったサークル・Rest算出',
    status: 'active' as const,
  },
  {
    path: 'content/ai/custom/evaluation-cases.json',
    label: '変更前後を比較する固定評価ケース',
    status: 'active' as const,
  },
]);

export const CUSTOM_MENU_INACTIVE_KNOWLEDGE_SOURCES = Object.freeze([
  'content/common/coach-philosophy.md',
  'content/common/custom-period-rules.md',
  'content/common/menu-dictionary.md',
  'content/common/menu-examples.md',
  'content/common/menu-patterns.md',
  'content/common/rt-japan-practice-samples.md',
  'content/common/session-patterns-db.md',
  'content/common/swimming-science-references.md',
]);

export function getRaceEventLabel(raceEvent: string): string | null {
  const labels = contextConfig.labels.raceEvents as Record<string, string>;
  return labels[raceEvent] ?? null;
}

export function getPeriodLabel(period: string): string {
  const labels = contextConfig.labels.periods as Record<string, string>;
  return labels[period] ?? period;
}

function toGuidanceEntryMap(value: unknown): Record<string, GuidanceEntry> {
  return value as Record<string, GuidanceEntry>;
}

/**
 * 大きな知識ファイルを毎回すべて送らず、今回の条件に関係する指導観点だけを選びます。
 * 数量はサーバー側で確定するため、このナレッジは説明文の具体化にだけ使用します。
 */
export function getCustomMenuCoachingGuidance(input: Pick<
  CustomMenuPromptInput,
  'generationMode' | 'raceEvent' | 'period'
>): SelectedCustomMenuGuidance[] {
  const eventMatch = input.raceEvent.match(/^([A-Za-z]+)_(\d+)m$/);
  const strokeKey = eventMatch?.[1];
  const distanceKey = eventMatch?.[2];
  const groups: Array<{
    category: string;
    key: string | undefined;
    entries: Record<string, GuidanceEntry>;
  }> = [
    {
      category: '種目',
      key: strokeKey,
      entries: toGuidanceEntryMap(coachingGuidanceConfig.strokeGuidance),
    },
    {
      category: '距離',
      key: distanceKey,
      entries: toGuidanceEntryMap(coachingGuidanceConfig.distanceGuidance),
    },
    {
      category: '期',
      key: input.period,
      entries: toGuidanceEntryMap(coachingGuidanceConfig.periodGuidance),
    },
    {
      category: '生成モード',
      key: input.generationMode,
      entries: toGuidanceEntryMap(coachingGuidanceConfig.generationModeGuidance),
    },
  ];

  return groups.flatMap(({ category, key, entries }) => {
    if (!key || !entries[key]) return [];
    return [{ category, key, ...entries[key] }];
  });
}

export function buildCustomMenuSystemPrompt(): string {
  const prompt = contextConfig.systemPrompt;
  return [
    prompt.role,
    prompt.scope,
    '',
    prompt.ruleHeading,
    ...prompt.rules.map((rule) => `- ${rule}`),
  ].join('\n');
}

/**
 * AIへ送る入力文はここだけで組み立てます。
 * API処理から文章生成を分離し、管理者が最終的なコンテキストを追えるようにします。
 */
export function buildCustomMenuUserPrompt(input: CustomMenuPromptInput): string {
  const primaryLabel = getRaceEventLabel(input.raceEvent) ?? input.raceEvent;
  const secondaryLabel = input.raceEvent2
    ? getRaceEventLabel(input.raceEvent2) ?? input.raceEvent2
    : 'なし';
  const outputExample = JSON.stringify(contextConfig.outputContract.example, null, 2);
  const segmentSummary = input.plan.segments.map((segment) => {
    const totalRepetitions = segment.rounds * segment.repetitions;
    const timingLabel = segment.timing.type === 'circle' ? 'サークル' : 'Rest';
    return `- ${segment.label}: 総本数${totalRepetitions}本（${segment.repetitions}本×${segment.rounds}set）、1本${segment.distanceM}m、合計${segment.totalM}m、強度${segment.intensityNumber} ${segment.intensity}、${timingLabel} ${segment.timing.display}`;
  }).join('\n');
  const selectedGuidance = getCustomMenuCoachingGuidance(input);
  const guidanceSummary = selectedGuidance.map((guidance) => [
    `### ${guidance.category}: ${guidance.label}`,
    ...guidance.coachingPoints.map((point) => `- 指導観点: ${point}`),
    ...guidance.cautions.map((caution) => `- 注意観点: ${caution}`),
  ].join('\n')).join('\n');

  return `【入力条件】
- 生成モード: ${input.generationMode === 'sprint_50m' ? '50m特化' : '通常'}
- メイン種目1: ${primaryLabel}
- メイン種目2: ${secondaryLabel}
- 目的: ${getPeriodLabel(input.period)}
- 年齢: ${input.age}
- レベル: ${input.level}
- コンディション: ${input.condition}
- プール: ${input.poolLength === 'long_course' ? '長水路' : '短水路'}
- メインセット時間: ${input.mainSetTime}分

【登録済みベストタイム】
${input.bestTimeSummary}

【変更禁止のメインセット骨格】
${input.plan.template}
${segmentSummary}
合計距離: ${input.plan.totalM}m
推定所要時間: 約${input.plan.estimatedDurationMinutes}分

【今回参照する指導コンテキスト】
以下の観点を丸写しせず、今回の入力条件とメインセットに合わせて具体化してください。
${guidanceSummary}

${contextConfig.outputContract.instruction}
${outputExample}`;
}

export function getCustomMenuContextSummary() {
  return {
    versions: CUSTOM_MENU_CONTEXT_VERSIONS,
    modelDefaults: CUSTOM_MENU_MODEL_DEFAULTS,
    systemPrompt: buildCustomMenuSystemPrompt(),
    outputFields: Object.keys(contextConfig.outputContract.example),
    outputExample: contextConfig.outputContract.example,
    coachingGuidance: {
      version: coachingGuidanceConfig.version,
      description: coachingGuidanceConfig.description,
      groups: [
        { title: '種目', entries: Object.entries(coachingGuidanceConfig.strokeGuidance) },
        { title: '距離', entries: Object.entries(coachingGuidanceConfig.distanceGuidance) },
        { title: '期', entries: Object.entries(coachingGuidanceConfig.periodGuidance) },
        { title: '生成モード', entries: Object.entries(coachingGuidanceConfig.generationModeGuidance) },
      ],
    },
    evaluation: {
      version: evaluationConfig.version,
      purpose: evaluationConfig.purpose,
      commonCriteria: evaluationConfig.commonCriteria,
      cases: evaluationConfig.cases as CustomMenuEvaluationCase[],
    },
    managementLocations: CUSTOM_MENU_MANAGEMENT_LOCATIONS,
    inactiveKnowledgeSources: CUSTOM_MENU_INACTIVE_KNOWLEDGE_SOURCES,
  };
}
