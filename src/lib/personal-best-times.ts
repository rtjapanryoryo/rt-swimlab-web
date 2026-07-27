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

export const MAX_SWIM_TIME_CENTISECONDS = 600000;

export type SwimTimeParts = {
  minutes: string;
  seconds: string;
  centiseconds: string;
};

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

export function hasSwimTimeValue(parts: SwimTimeParts): boolean {
  return [parts.minutes, parts.seconds, parts.centiseconds].some(
    (value) => value !== '' && Number(value) > 0
  );
}

/** 3つの入力欄を、比較・計算しやすい1/100秒単位へ変換します。 */
export function parseSwimTimeParts(parts: SwimTimeParts): number | null {
  const { minutes, seconds, centiseconds } = parts;
  if (![minutes, seconds, centiseconds].every((value) => value === '' || /^\d{1,2}$/.test(value))) {
    return null;
  }
  if (centiseconds !== '' && centiseconds.length !== 2) return null;

  const minuteValue = Number(minutes || 0);
  const secondValue = Number(seconds || 0);
  const centisecondValue = Number(centiseconds || 0);
  if (minuteValue > 99 || secondValue > 59 || centisecondValue > 99) return null;

  const total = (minuteValue * 60 + secondValue) * 100 + centisecondValue;
  return total > 0 && total < MAX_SWIM_TIME_CENTISECONDS ? total : null;
}

export function splitSwimTime(timeCentiseconds: number): SwimTimeParts {
  const totalSeconds = Math.floor(timeCentiseconds / 100);
  const centiseconds = timeCentiseconds % 100;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return {
    minutes: minutes > 0 ? String(minutes) : '',
    seconds: String(seconds).padStart(2, '0'),
    centiseconds: String(centiseconds).padStart(2, '0'),
  };
}
