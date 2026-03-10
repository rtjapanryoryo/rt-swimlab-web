/**
 * メニュー・ブロックの距離計算ユーティリティ
 * 各セッションのTotalを合算し、総距離の整合を確保するために使用
 */

/** 1つの文字列から全距離を抽出して合計（本数×距離m / 距離m の複数対応） */
function sumPartDistances(part: string): number {
  let sum = 0;
  // 本数×距離m または 距離×本数m（4×50m, 50×4m, 4x50m, 4*50m, 8×25 等）
  const cdRegex = /(\d+)\s*[×xX*・]\s*(\d+)\s*m?(?!\d)/g;
  for (const m of part.matchAll(cdRegex)) {
    const a = parseInt(m[1], 10);
    const b = parseInt(m[2], 10);
    sum += a * b;
  }
  // 本数×距離 にマッチした部分を一時置換し、残りの単独距離を拾う
  const withoutCd = part.replace(cdRegex, ' __USED__ ');
  const dRegex = /(\d+)\s*m(?!\w)/g;
  for (const m of withoutCd.matchAll(dRegex)) {
    sum += parseInt(m[1], 10);
  }
  return sum;
}

/** ブロック文字列から距離合計を算出（複数構成 → や + に対応） */
export function sumBlockDistance(text: string): number {
  if (!text || typeof text !== 'string') return 0;
  const parts = text.trim().split(/\s*[→＋+]\s*/);
  let sum = 0;
  for (const part of parts) {
    sum += sumPartDistances(part.trim());
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
