import contextConfig from '../../../content/ai/custom/context-config.json';
import evaluationConfig from '../../../content/ai/custom/evaluation-cases.json';

type PromptPlan = {
  template: string;
  totalM: number;
  estimatedDurationMinutes: number;
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
合計距離: ${input.plan.totalM}m
推定所要時間: 約${input.plan.estimatedDurationMinutes}分

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
