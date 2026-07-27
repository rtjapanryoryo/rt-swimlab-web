export const POOL_LENGTHS = [
  { value: 'short_course', label: '短水路（25m）' },
  { value: 'long_course', label: '長水路（50m）' },
] as const;

export type PoolLength = (typeof POOL_LENGTHS)[number]['value'];

export const STROKES = [
  { value: 'Fr', label: '自由形' },
  { value: 'Ba', label: '背泳ぎ' },
  { value: 'Br', label: '平泳ぎ' },
  { value: 'Fly', label: 'バタフライ' },
  { value: 'IM', label: '個人メドレー' },
] as const;

export type StrokeCode = (typeof STROKES)[number]['value'];

type EventDefinition = {
  stroke: StrokeCode;
  distanceM: number;
  poolLengths: readonly PoolLength[];
};

const BOTH_POOLS: readonly PoolLength[] = ['short_course', 'long_course'];
const SHORT_COURSE_ONLY: readonly PoolLength[] = ['short_course'];

export const PERSONAL_BEST_EVENTS: readonly EventDefinition[] = [
  { stroke: 'Fr', distanceM: 25, poolLengths: SHORT_COURSE_ONLY },
  { stroke: 'Fr', distanceM: 50, poolLengths: BOTH_POOLS },
  { stroke: 'Fr', distanceM: 100, poolLengths: BOTH_POOLS },
  { stroke: 'Fr', distanceM: 200, poolLengths: BOTH_POOLS },
  { stroke: 'Fr', distanceM: 400, poolLengths: BOTH_POOLS },
  { stroke: 'Fr', distanceM: 800, poolLengths: BOTH_POOLS },
  { stroke: 'Fr', distanceM: 1500, poolLengths: BOTH_POOLS },
  { stroke: 'Ba', distanceM: 25, poolLengths: SHORT_COURSE_ONLY },
  { stroke: 'Ba', distanceM: 50, poolLengths: BOTH_POOLS },
  { stroke: 'Ba', distanceM: 100, poolLengths: BOTH_POOLS },
  { stroke: 'Ba', distanceM: 200, poolLengths: BOTH_POOLS },
  { stroke: 'Br', distanceM: 25, poolLengths: SHORT_COURSE_ONLY },
  { stroke: 'Br', distanceM: 50, poolLengths: BOTH_POOLS },
  { stroke: 'Br', distanceM: 100, poolLengths: BOTH_POOLS },
  { stroke: 'Br', distanceM: 200, poolLengths: BOTH_POOLS },
  { stroke: 'Fly', distanceM: 25, poolLengths: SHORT_COURSE_ONLY },
  { stroke: 'Fly', distanceM: 50, poolLengths: BOTH_POOLS },
  { stroke: 'Fly', distanceM: 100, poolLengths: BOTH_POOLS },
  { stroke: 'Fly', distanceM: 200, poolLengths: BOTH_POOLS },
  { stroke: 'IM', distanceM: 100, poolLengths: SHORT_COURSE_ONLY },
  { stroke: 'IM', distanceM: 200, poolLengths: BOTH_POOLS },
  { stroke: 'IM', distanceM: 400, poolLengths: BOTH_POOLS },
] as const;

export function personalBestKey(
  stroke: StrokeCode,
  distanceM: number,
  poolLength: PoolLength
): string {
  return `${stroke}-${distanceM}-${poolLength}`;
}

export function isPersonalBestEvent(
  stroke: unknown,
  distanceM: unknown,
  poolLength: unknown
): stroke is StrokeCode {
  return PERSONAL_BEST_EVENTS.some(
    (event) =>
      event.stroke === stroke &&
      event.distanceM === distanceM &&
      event.poolLengths.includes(poolLength as PoolLength)
  );
}

/** 入力されたタイムを比較・計算しやすい1/100秒単位へ変換します。 */
export function parseSwimTime(value: string): number | null {
  const normalized = value.trim().replace('：', ':').replace('．', '.');
  if (!normalized) return null;

  const match = normalized.match(/^(?:(\d{1,2}):)?(\d{1,4})(?:\.(\d{1,2}))?$/);
  if (!match) return null;

  const minutes = Number(match[1] ?? 0);
  const seconds = Number(match[2]);
  const centiseconds = Number((match[3] ?? '0').padEnd(2, '0'));
  if (match[1] && seconds >= 60) return null;

  const total = (minutes * 60 + seconds) * 100 + centiseconds;
  return total > 0 && total < 360000 ? total : null;
}

export function formatSwimTime(timeCentiseconds: number): string {
  const totalSeconds = Math.floor(timeCentiseconds / 100);
  const centiseconds = timeCentiseconds % 100;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes === 0) {
    return `${seconds}.${String(centiseconds).padStart(2, '0')}`;
  }
  return `${minutes}:${String(seconds).padStart(2, '0')}.${String(centiseconds).padStart(2, '0')}`;
}
