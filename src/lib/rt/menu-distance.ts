/**
 * メニュー・ブロックの距離計算ユーティリティ
 * 各セッションのTotalを合算し、総距離の整合を確保するために使用
 */

/** ブロック文字列から距離合計を算出（複数構成 → や + に対応） */
export function sumBlockDistance(text: string): number {
  if (!text || typeof text !== 'string') return 0;
  const parts = text.trim().split(/\s*[→＋+]\s*/);
  let sum = 0;
  for (const part of parts) {
    const p = part.trim();
    const cdMatch = p.match(/(\d+)\s*[×x]\s*(\d+)\s*m(?!\w)/);
    const dMatch = p.match(/(\d+)\s*m(?!\w)/);
    if (cdMatch) {
      sum += parseInt(cdMatch[1], 10) * parseInt(cdMatch[2], 10);
    } else if (dMatch) {
      sum += parseInt(dMatch[1], 10);
    }
  }
  return sum;
}

/** メニューresultオブジェクトから全ブロックの距離合計を算出 */
export function sumMenuDistance(result: Record<string, string>): number {
  const blocks = ['warmUp', 'drill', 'kick', 'pull', 'preMain', 'dive', 'rest', 'main', 'down'];
  let sum = 0;
  for (const key of blocks) {
    sum += sumBlockDistance(result[key] ?? '');
  }
  return sum;
}
