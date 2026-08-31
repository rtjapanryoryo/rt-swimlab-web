import { expect, test } from '@playwright/test';

import {
  buildCustomMenuSystemPrompt,
  buildCustomMenuUserPrompt,
  CUSTOM_MENU_CONTEXT_VERSIONS,
  getCustomMenuCoachingGuidance,
  getCustomMenuContextSummary,
} from '../src/lib/ai-context/custom-menu-context';
import { MAIN_SET_RULE_VERSION } from '../src/lib/rt/main-set-generator';
import { TIMING_RULE_VERSION } from '../src/lib/rt/training-timing';
import {
  removeRedundantPlanQuantities,
  sanitizeCustomMenuGeneratedCopy,
} from '../src/lib/ai-context/custom-menu-copy';

test('system promptを移行前と同じ内容で組み立てる', () => {
  expect(buildCustomMenuSystemPrompt()).toBe(`あなたはRT Japanの水泳コーチです。
今回作成するのは、ウォームアップやダウンを含まない「メインセットのみ」です。

【最優先ルール】
- 距離、本数、強度、サークル、Restはサーバーが計算済みです。変更を提案したり、別の数値を書いたりしないでください。
- 複数setでは、総本数と各setの本数を区別してください。1set分の本数を全体本数として説明しないでください。
- 説明文では距離、本数、セット数、サークル、Restの数値を繰り返さないでください。確定値は表に表示します。
- メイン種目1を中心にし、メイン種目2がある場合は補助種目として扱ってください。
- メイン種目2がある場合は、メイン種目1との役割の違いを明確にし、指導ポイントと注意点の両方にメイン種目2固有の観点を含めてください。
- 年齢、レベル、コンディションを反映し、安全性とフォーム維持を優先してください。
- 苦しくなってフォームが崩れる場合は、タイムより技術確認を優先する注意を含めてください。
- 指導ポイントと注意点は、それぞれ3項目を改行区切りで出力してください。
- 説明文は確定済みの強度と一致させてください。A1/A2やEasyをレースペース、最大速度、高強度として説明しないでください。
- 抽象的な一般論ではなく、今回の種目・目的・強度に合う具体的な文章にしてください。
- JSON以外は出力しないでください。`);
});

test('AI説明から表と重複する数量表現を除去する', () => {
  expect(removeRedundantPlanQuantities(
    'このメインセットでは、50m自由形を12本行うことで、持続的なスピードを高めます。サークル1:10の中で、フォームを維持します。',
  )).toBe(
    'このメインセットでは、50m自由形に取り組むことで、持続的なスピードを高めます。フォームを維持します。',
  );

  const sanitized = sanitizeCustomMenuGeneratedCopy({
    purpose: '2setでスピードを磨く',
    intention: '自由形を合計24本泳ぐことで持久力を高める',
    coachingPoint: 'フォームを保つ',
    caution: 'Rest 1分で呼吸を整える',
    expectedEffect: '持続力を高める',
  });
  expect(sanitized.purpose).toBe('複数セットでスピードを磨く');
  expect(sanitized.intention).toBe('自由形に取り組むことで持久力を高める');
  expect(sanitized.caution).toBe('呼吸を整える');
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
      segments: [
        {
          label: 'Main 1',
          rounds: 2,
          repetitions: 11,
          distanceM: 50,
          totalM: 1100,
          intensity: 'EN1',
          intensityNumber: '②',
          timing: { type: 'circle', display: '1:00' },
        },
        {
          label: 'Main 2',
          rounds: 1,
          repetitions: 4,
          distanceM: 50,
          totalM: 200,
          intensity: 'AN1',
          intensityNumber: '⑤',
          timing: { type: 'rest', display: '45秒' },
        },
      ],
    },
  });

  expect(prompt).toContain('- メイン種目1: 自由形 50m');
  expect(prompt).toContain('- メイン種目2: なし');
  expect(prompt).toContain('- 目的: ② 基礎形成期');
  expect(prompt).toContain('自由形 50m: 30.00');
  expect(prompt).toContain('合計距離: 1300m');
  expect(prompt).toContain('Main 1: 総本数22本（11本×2set）、1本50m、合計1100m、強度② EN1、サークル 1:00');
  expect(prompt).toContain('推定所要時間: 約28分');
  expect(prompt).toContain('【今回参照する指導コンテキスト】');
  expect(prompt).toContain('### 種目: 自由形');
  expect(prompt).toContain('### 距離: 50m');
  expect(prompt).toContain('### 期: 基礎形成期');
  expect(prompt).toContain('最初のストロークへ滑らかにつなげる');
  expect(prompt).toContain('指定された強度に合うテンポ');
  expect(prompt).not.toContain('プル・呼吸・キック・グライド');
  expect(prompt).toContain('"coachingPoint": "具体的な指導ポイント1\\n具体的な指導ポイント2\\n具体的な指導ポイント3"');
  expect(prompt).not.toContain('undefined');
});

test('入力条件に関係する指導ナレッジだけを選ぶ', () => {
  const guidance = getCustomMenuCoachingGuidance({
    generationMode: 'sprint_50m',
    raceEvent: 'Fr_50m',
    period: '4',
  });

  expect(guidance.map((item) => `${item.category}:${item.key}`)).toEqual([
    '種目:Fr',
    '距離:50',
    '期:4',
    '生成モード:sprint_50m',
  ]);
  expect(guidance.flatMap((item) => item.coachingPoints).join('\n')).toContain('ローリング');
  expect(guidance.flatMap((item) => item.coachingPoints).join('\n')).toContain('スタート');
  expect(guidance.flatMap((item) => item.coachingPoints).join('\n')).not.toContain('平泳ぎ');
});

test('メイン種目2がある場合だけ補助種目の指導ナレッジを選ぶ', () => {
  const guidance = getCustomMenuCoachingGuidance({
    generationMode: 'standard',
    raceEvent: 'Fr_100m',
    raceEvent2: 'Fly_50m',
    period: '3',
  });

  expect(guidance.map((item) => `${item.category}:${item.key}`)).toEqual([
    '種目:Fr',
    '距離:100',
    '補助種目:Fly',
    '補助距離:50',
    '期:3',
    '生成モード:standard',
  ]);
  expect(guidance.flatMap((item) => item.coachingPoints).join('\n')).toContain('うねり');
});

test('メイン種目2がある場合は出力項目の役割分担を明示する', () => {
  const prompt = buildCustomMenuUserPrompt({
    generationMode: 'standard',
    raceEvent: 'Fr_100m',
    raceEvent2: 'Fly_50m',
    period: '3',
    age: 'マスターズ（40歳以上）',
    level: '一般スイマー（定期練習 / マスターズ継続）',
    condition: '良好（通常コンディション）',
    poolLength: 'short_course',
    mainSetTime: '45',
    bestTimeSummary: '自由形 100m: 登録なし\nバタフライ 50m: 登録なし',
    plan: {
      template: 'Main 1：Fr 12×100m Rest 25秒（Easy） → Main 2：Fly 15×50m Rest 15秒（Easy）',
      totalM: 1950,
      estimatedDurationMinutes: 45,
      segments: [],
    },
  });

  expect(prompt).toContain('【Main 2がある場合の出力内訳】');
  expect(prompt).toContain('Main 1固有・Main 2固有・両方に共通する観点を各1項目');
  expect(prompt).toContain('注意点3項目にもMain 2固有の注意を最低1項目');
});

test('manifestと実装中の数値ルールバージョンを一致させる', () => {
  expect(CUSTOM_MENU_CONTEXT_VERSIONS.generationRuleVersion).toBe(MAIN_SET_RULE_VERSION);
  expect(CUSTOM_MENU_CONTEXT_VERSIONS.timingRuleVersion).toBe(TIMING_RULE_VERSION);

  const summary = getCustomMenuContextSummary();
  expect(summary.versions.contextVersion).toBe('custom-main-set-context-v1');
  expect(summary.versions.promptVersion).toBe('custom-main-set-prompt-v7');
  expect(summary.versions.knowledgeVersion).toBe('custom-main-set-knowledge-v4');
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
      expect.objectContaining({
        path: 'content/ai/custom/coaching-guidance.json',
        status: 'active',
      }),
    ]),
  );
  expect(summary.coachingGuidance.version).toBe(summary.versions.knowledgeVersion);
  expect(summary.coachingGuidance.groups.map((group) => group.title)).toEqual([
    '種目',
    '距離',
    '期',
    '生成モード',
  ]);
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
