/**
 * 試合前強度ガード
 *
 * コーチ-AI衝突防止の核心：
 * 試合が近いのに高強度を提案してハレーションを起こさないよう、
 * 残日数に応じて強度上限を自動的に制限する。
 *
 * 「提案」として扱う — コーチが上書き可能。
 */

export interface IntensityGuardResult {
  intensityCeilingStep: number | null;  // null = 制限なし
  warning: string | null;               // UI に表示する警告文
  forbiddenPatterns: string[];          // LLM に渡す除外パターン
}

/**
 * 試合まで残り日数から強度ガードを計算する
 */
export function calcIntensityGuard(daysToMeet: number): IntensityGuardResult {
  // テーパー期（7日以内）
  if (daysToMeet <= 7) {
    return {
      intensityCeilingStep: 2, // EN1以下
      warning: `⚠ 試合まで${daysToMeet}日。テーパー期のため強度上限をEN1（②）に制限しています。`,
      forbiddenPatterns: [
        '耐乳酸MAX', 'ダイハード', '1H/1E Alt', 'ベストアベレージ',
        'Negative split', 'Variable', 'Underwater 3→5→7', 'odd: Hard / even: Easy',
        '2H/2E pattern', 'strong finish last 10m',
      ],
    };
  }

  // 調整期（8〜21日）
  if (daysToMeet <= 21) {
    return {
      intensityCeilingStep: 3, // EN2以下
      warning: `⚠ 試合まで${daysToMeet}日。調整期のため強度上限をEN2（③）に制限しています。`,
      forbiddenPatterns: [
        '耐乳酸MAX', 'ダイハード', '1H/1E Alt',
        'odd: Hard / even: Easy', '2H/2E pattern',
      ],
    };
  }

  // 高強度注意期間（22〜35日）
  if (daysToMeet <= 35) {
    return {
      intensityCeilingStep: null, // 制限なし（ただし注意喚起）
      warning: `試合まで${daysToMeet}日。高強度練習後は十分な回復を確保してください。`,
      forbiddenPatterns: ['耐乳酸MAX', 'ダイハード'],
    };
  }

  // 制限なし
  return {
    intensityCeilingStep: null,
    warning: null,
    forbiddenPatterns: [],
  };
}

/**
 * 強度ステップから人間が読めるラベルを返す
 */
export function intensityStepLabel(step: number): string {
  const map: Record<number, string> = {
    1: 'A1/A2（①）',
    2: 'EN1（②）',
    3: 'EN2（③）',
    4: 'EN3（④）',
    5: 'AN1（⑤）',
    6: 'AN2（⑥）',
    7: 'MAX（⑦）',
  };
  return map[step] ?? `Step ${step}`;
}
