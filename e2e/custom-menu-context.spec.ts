import { expect, test } from '@playwright/test';

import {
  buildCustomMenuSystemPrompt,
  buildCustomMenuUserPrompt,
  CUSTOM_MENU_CONTEXT_VERSIONS,
  getCustomMenuContextSummary,
} from '../src/lib/ai-context/custom-menu-context';
import { MAIN_SET_RULE_VERSION } from '../src/lib/rt/main-set-generator';
import { TIMING_RULE_VERSION } from '../src/lib/rt/training-timing';

test('system promptを移行前と同じ内容で組み立てる', () => {
  expect(buildCustomMenuSystemPrompt()).toBe(`あなたはRT Japanの水泳コーチです。
今回作成するのは、ウォームアップやダウンを含まない「メインセットのみ」です。

【最優先ルール】
- 距離、本数、強度、サークル、Restはサーバーが計算済みです。変更を提案したり、別の数値を書いたりしないでください。
- メイン種目1を中心にし、メイン種目2がある場合は補助種目として扱ってください。
- 年齢、レベル、コンディションを反映し、安全性とフォーム維持を優先してください。
- 苦しくなってフォームが崩れる場合は、タイムより技術確認を優先する注意を含めてください。
- 指導ポイントと注意点は、それぞれ3項目を改行区切りで出力してください。
- 抽象的な一般論ではなく、今回の種目・目的・強度に合う具体的な文章にしてください。
- JSON以外は出力しないでください。`);
});

test('user promptに入力、骨格、出力契約を欠けなく含める', () => {
  const prompt = buildCustomMenuUserPrompt({
    generationMode: 'standard',
    raceEvent: 'Fr_50m',
    period: '2',
    age: 'マスターズ（30〜39歳）',
    level: '一般スイマー（定期練習 / マスターズ継続）',
    condition: '良好（通常コンディション）',
    poolLength: 'long_course',
    mainSetTime: '30',
    bestTimeSummary: '自由形 50m: 30.00',
    plan: {
      template: 'Main 1：Fr 11×50m サークル 1:05（A1） → Main 2：Fr 15×50m サークル 1:00（EN1）',
      totalM: 1300,
      estimatedDurationMinutes: 28,
    },
  });

  expect(prompt).toContain('- メイン種目1: 自由形 50m');
  expect(prompt).toContain('- メイン種目2: なし');
  expect(prompt).toContain('- 目的: ② 基礎形成期');
  expect(prompt).toContain('自由形 50m: 30.00');
  expect(prompt).toContain('合計距離: 1300m');
  expect(prompt).toContain('推定所要時間: 約28分');
  expect(prompt).toContain('"coachingPoint": "具体的な指導ポイント1\\n具体的な指導ポイント2\\n具体的な指導ポイント3"');
  expect(prompt).not.toContain('undefined');
});

test('manifestと実装中の数値ルールバージョンを一致させる', () => {
  expect(CUSTOM_MENU_CONTEXT_VERSIONS.generationRuleVersion).toBe(MAIN_SET_RULE_VERSION);
  expect(CUSTOM_MENU_CONTEXT_VERSIONS.timingRuleVersion).toBe(TIMING_RULE_VERSION);

  const summary = getCustomMenuContextSummary();
  expect(summary.versions.contextVersion).toBe('custom-main-set-context-v1');
  expect(summary.outputFields).toEqual([
    'purpose',
    'intention',
    'coachingPoint',
    'caution',
    'expectedEffect',
  ]);
  expect(summary.managementLocations).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        path: 'content/ai/custom/context-config.json',
        status: 'active',
      }),
    ]),
  );
  expect(summary.inactiveKnowledgeSources).toContain('content/common/coach-philosophy.md');
  expect(summary.evaluation.version).toBe(summary.versions.evaluationVersion);
  expect(summary.evaluation.cases).toHaveLength(5);
  expect(new Set(summary.evaluation.cases.map((evaluationCase) => evaluationCase.id)).size).toBe(5);
  expect(summary.evaluation.commonCriteria).toEqual(
    expect.arrayContaining([
      expect.stringContaining('サーバーが確定した距離'),
      expect.stringContaining('Main 2'),
      expect.stringContaining('改行区切り'),
    ]),
  );
  for (const evaluationCase of summary.evaluation.cases) {
    expect(evaluationCase.title).not.toBe('');
    expect(evaluationCase.inputSummary.length).toBeGreaterThan(0);
    expect(evaluationCase.expected.length).toBeGreaterThan(0);
  }
});
