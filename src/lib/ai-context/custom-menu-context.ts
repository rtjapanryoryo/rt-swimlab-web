import contextConfig from '../../../content/ai/custom/context-config.json';

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

export const CUSTOM_MENU_CONTEXT_VERSIONS = Object.freeze({
  ...contextConfig.manifest,
});

export const CUSTOM_MENU_MODEL_DEFAULTS = Object.freeze({
  ...contextConfig.modelDefaults,
});

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
  };
}
