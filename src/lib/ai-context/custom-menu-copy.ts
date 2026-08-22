export type CustomMenuGeneratedCopy = {
  purpose: string;
  intention: string;
  coachingPoint: string;
  caution: string;
  expectedEffect: string;
};

/**
 * 本数・セット数・サークル等の確定値は表に表示するため、AI説明から重複する数量表現を除きます。
 * 文章側の数え間違いが、サーバーで確定したメニュー骨格と矛盾することも防ぎます。
 */
export function removeRedundantPlanQuantities(value: string): string {
  return value
    .replace(/を\s*(?:合計\s*)?\d+\s*本(?:ずつ)?(?:行う|泳ぐ|繰り返す)(?:ことで|ことにより|ことによって)?/gu, 'に取り組むことで')
    .replace(/(?:サークル|Circle)\s*\d+:\d{2}(?:の中で|で)?[、,]?\s*/giu, '')
    .replace(/(?:セット間\s*)?Rest\s*\d+(?::\d{2}|秒|分)(?:の間|で)?[、,]?\s*/giu, '')
    .replace(/(?:合計\s*)?\d+\s*本/gu, '複数本')
    .replace(/\d+\s*set/giu, '複数セット')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/、{2,}/g, '、')
    .trim();
}

export function sanitizeCustomMenuGeneratedCopy(
  copy: CustomMenuGeneratedCopy,
): CustomMenuGeneratedCopy {
  return {
    purpose: removeRedundantPlanQuantities(copy.purpose),
    intention: removeRedundantPlanQuantities(copy.intention),
    coachingPoint: removeRedundantPlanQuantities(copy.coachingPoint),
    caution: removeRedundantPlanQuantities(copy.caution),
    expectedEffect: removeRedundantPlanQuantities(copy.expectedEffect),
  };
}
