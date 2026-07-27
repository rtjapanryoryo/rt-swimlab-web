'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  hasSwimTimeValue,
  parseSwimTimeParts,
  personalBestKey,
  PERSONAL_BEST_EVENTS,
  POOL_LENGTHS,
  splitSwimTime,
  STROKES,
  type PoolLength,
  type SwimTimeParts,
  type StrokeCode,
} from '@/lib/personal-best-times';

type BestTimeRecord = {
  id: string;
  stroke: StrokeCode;
  distance_m: number;
  pool_length: PoolLength;
  time_centiseconds: number;
  recorded_on: string | null;
  updated_at: string;
};

type InputValue = SwimTimeParts & {
  recordedOn: string;
};

type TimeField = keyof SwimTimeParts;

const EMPTY_INPUT_VALUE: InputValue = {
  minutes: '',
  seconds: '',
  centiseconds: '',
  recordedOn: '',
};

function valuesFromRecords(records: BestTimeRecord[]): Record<string, InputValue> {
  return Object.fromEntries(
    records.map((record) => {
      const time = splitSwimTime(record.time_centiseconds);
      return [
        personalBestKey(record.stroke, record.distance_m, record.pool_length),
        {
          ...time,
          recordedOn: record.recorded_on ?? '',
        },
      ];
    })
  );
}

// 日本語IMEで全角数字が入っても、入力欄には半角数字だけを保持します。
function normalizeDigits(value: string): string {
  return value
    .replace(/[０-９]/g, (digit) => String.fromCharCode(digit.charCodeAt(0) - 0xfee0))
    .replace(/\D/g, '')
    .slice(0, 2);
}

export default function BestTimesPage() {
  const [poolLength, setPoolLength] = useState<PoolLength>('short_course');
  const [stroke, setStroke] = useState<StrokeCode>('Fr');
  const [records, setRecords] = useState<BestTimeRecord[]>([]);
  const [values, setValues] = useState<Record<string, InputValue>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pendingFocus, setPendingFocus] = useState<{
    key: string;
    field: TimeField;
  } | null>(null);

  useEffect(() => {
    fetch('/api/best-times', { credentials: 'include', cache: 'no-store' })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? 'ベストタイムを読み込めませんでした');
        const nextRecords = (data.records ?? []) as BestTimeRecord[];
        setRecords(nextRecords);
        setValues(valuesFromRecords(nextRecords));
        setIsDirty(false);
      })
      .catch((error) => {
        setMessage(error instanceof Error ? error.message : 'ベストタイムを読み込めませんでした');
      })
      .finally(() => setLoading(false));
  }, []);

  const visibleEvents = useMemo(
    () => PERSONAL_BEST_EVENTS.filter(
      (event) => event.stroke === stroke && event.poolLengths.includes(poolLength)
    ),
    [poolLength, stroke]
  );
  const selectedPoolLabel = POOL_LENGTHS.find((pool) => pool.value === poolLength)?.label;
  const selectedStrokeLabel = STROKES.find((item) => item.value === stroke)?.label;

  useEffect(() => {
    if (!pendingFocus) return;

    // 非表示タブのエラーでも迷わないよう、タブ切替後に実際のエラー欄へフォーカスします。
    const timer = window.setTimeout(() => {
      document.getElementById(`best-time-${pendingFocus.key}-${pendingFocus.field}`)?.focus();
      setPendingFocus(null);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [pendingFocus, poolLength, stroke]);

  useEffect(() => {
    if (message !== 'ベストタイムを保存しました') return;
    const timer = window.setTimeout(() => setMessage(null), 3000);
    return () => window.clearTimeout(timer);
  }, [message]);

  function updateValue(key: string, field: keyof InputValue, value: string) {
    setValues((current) => ({
      ...current,
      [key]: {
        ...(current[key] ?? EMPTY_INPUT_VALUE),
        [field]: value,
      },
    }));
    setIsDirty(true);
    setErrors((current) => {
      const next = { ...current };
      delete next[key];
      return next;
    });
    setMessage(null);
  }

  function clearValue(key: string) {
    setValues((current) => ({
      ...current,
      [key]: { ...EMPTY_INPUT_VALUE },
    }));
    setErrors((current) => {
      const next = { ...current };
      delete next[key];
      return next;
    });
    setIsDirty(true);
    setMessage(null);
  }

  async function handleSave() {
    const nextErrors: Record<string, string> = {};
    let firstInvalid:
      | { key: string; field: TimeField; stroke: StrokeCode; poolLength: PoolLength }
      | null = null;
    const payload: Array<{
      stroke: StrokeCode;
      distance_m: number;
      pool_length: PoolLength;
      time_centiseconds: number;
      recorded_on: string | null;
    }> = [];

    for (const event of PERSONAL_BEST_EVENTS) {
      for (const eventPool of event.poolLengths) {
        const key = personalBestKey(event.stroke, event.distanceM, eventPool);
        const input = values[key];
        if (!input || !hasSwimTimeValue(input)) continue;
        const timeCentiseconds = parseSwimTimeParts(input);
        if (timeCentiseconds === null) {
          nextErrors[key] = '分は0〜99、秒は0〜59、小数は2桁で入力してください';
          firstInvalid ??= {
            key,
            field:
              Number(input.seconds || 0) > 59
                ? 'seconds'
                : input.centiseconds !== '' && input.centiseconds.length !== 2
                  ? 'centiseconds'
                  : 'minutes',
            stroke: event.stroke,
            poolLength: eventPool,
          };
          continue;
        }
        payload.push({
          stroke: event.stroke,
          distance_m: event.distanceM,
          pool_length: eventPool,
          time_centiseconds: timeCentiseconds,
          recorded_on: input.recordedOn || null,
        });
      }
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      setMessage('入力内容を確認してください。最初のエラー箇所を表示しています。');
      if (firstInvalid) {
        setPoolLength(firstInvalid.poolLength);
        setStroke(firstInvalid.stroke);
        setPendingFocus({ key: firstInvalid.key, field: firstInvalid.field });
      }
      return;
    }

    const deleteIds = records
      .filter((record) => {
        const key = personalBestKey(record.stroke, record.distance_m, record.pool_length);
        return !values[key] || !hasSwimTimeValue(values[key]);
      })
      .map((record) => record.id);

    setSaving(true);
    setMessage(null);
    try {
      const response = await fetch('/api/best-times', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ records: payload, delete_ids: deleteIds }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? '保存できませんでした');
      const nextRecords = (data.records ?? []) as BestTimeRecord[];
      setRecords(nextRecords);
      setValues(valuesFromRecords(nextRecords));
      setIsDirty(false);
      setMessage('ベストタイムを保存しました');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '保存できませんでした');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-48 rounded-lg bg-slate-200" />
        <div className="h-24 rounded-xl bg-slate-100" />
        <div className="h-64 rounded-xl bg-slate-100" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase text-cyan-600">Personal Best</p>
        <h1 className="mt-1 text-2xl font-semibold text-slate-900">ベストタイム</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          種目ごとのベストタイムを登録すると、今後のメニュー作成やサークルの目安に活用できます。
        </p>
      </header>

      <section className="rounded-xl border border-cyan-200 bg-cyan-50 px-5 py-4">
        <h2 className="text-sm font-semibold text-cyan-900">わかる範囲で入力してください</h2>
        <p className="mt-1 text-sm leading-relaxed text-cyan-800">
          タイムがわからない種目は空欄のままで大丈夫です。正確な記録がわからない場合は、なんとなく近いタイムを入力してください。あとからいつでも変更できます。
        </p>
        <p className="mt-2 text-xs font-medium text-cyan-700">
          入力例：1分05秒23　秒は0〜59、小数は2桁で入力してください。
        </p>
      </section>

      <div className="mx-auto max-w-3xl space-y-6">
      <section className="space-y-5">
        <div className="mx-auto max-w-md">
          <p className="mb-2 text-sm font-semibold text-slate-700">プール種別</p>
          <div className="inline-flex w-full max-w-md rounded-lg border border-slate-200 bg-slate-100 p-1">
            {POOL_LENGTHS.map((pool) => (
              <button
                key={pool.value}
                type="button"
                onClick={() => setPoolLength(pool.value)}
                className={`flex-1 rounded-md px-4 py-2 text-sm font-semibold transition-colors ${
                  poolLength === pool.value
                    ? 'bg-white text-cyan-700 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {pool.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mx-auto max-w-2xl">
          <p className="mb-2 text-sm font-semibold text-slate-700">種目</p>
          <div className="grid grid-cols-3 gap-2 sm:flex sm:justify-center" role="tablist" aria-label="種目">
            {STROKES.map((item) => (
              <button
                key={item.value}
                type="button"
                role="tab"
                aria-selected={stroke === item.value}
                onClick={() => setStroke(item.value)}
                className={`min-h-10 rounded-lg border px-2 py-2 text-sm font-semibold leading-tight transition-colors sm:shrink-0 sm:px-4 ${
                  stroke === item.value
                    ? 'border-cyan-500 bg-cyan-500 text-white'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-cyan-300'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="relative">
        <div className="sticky top-0 z-20 -mb-px flex items-center justify-center border border-slate-200 bg-white/95 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm backdrop-blur sm:hidden">
          <span>{selectedPoolLabel}</span>
          <span className="mx-2 text-slate-300" aria-hidden>・</span>
          <span className="text-cyan-700">{selectedStrokeLabel}</span>
        </div>
        <div className="overflow-hidden rounded-b-xl border border-slate-200 bg-white sm:rounded-xl">
          <div className="hidden grid-cols-[90px_minmax(0,1fr)] gap-4 border-b border-slate-200 bg-slate-50 px-5 py-3 text-xs font-semibold text-slate-500 sm:grid">
            <span>距離</span>
            <span className="text-center">ベストタイム</span>
          </div>
          <div className="divide-y divide-slate-100">
          {visibleEvents.map((event) => {
            const key = personalBestKey(event.stroke, event.distanceM, poolLength);
            const value = values[key] ?? EMPTY_INPUT_VALUE;
            const hasInput = [value.minutes, value.seconds, value.centiseconds].some(
              (part) => part !== ''
            );
            const hasValidTime = parseSwimTimeParts(value) !== null;
            return (
              <div
                key={key}
                className="grid gap-3 px-5 py-4 sm:grid-cols-[90px_minmax(0,1fr)] sm:items-start sm:gap-4"
              >
                <div>
                  <p className="text-base font-semibold tabular-nums text-slate-900">{event.distanceM}m</p>
                </div>
                <div>
                  <div className="mx-auto grid w-fit grid-cols-[68px_auto_68px_auto_76px] items-end gap-1 sm:grid-cols-[84px_auto_84px_auto_96px] sm:gap-1.5">
                    {([
                      ['minutes', '分'],
                      ['seconds', '秒'],
                      ['centiseconds', '小数（2桁）'],
                    ] as const).flatMap(([field, label], index) => {
                      const separator = index === 0 ? null : (
                        <span
                          key={`${field}-separator`}
                          aria-hidden
                          className="pb-2.5 text-base font-semibold text-slate-400"
                        >
                          {index === 1 ? ':' : '.'}
                        </span>
                      );
                      const input = (
                        <label key={field} className="min-w-0">
                          <span className="mb-1 block text-center text-[10px] font-medium text-slate-500 sm:text-[11px]">
                            {label}
                          </span>
                          <input
                            id={`best-time-${key}-${field}`}
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            maxLength={2}
                            value={value[field]}
                            onChange={(inputEvent) =>
                              updateValue(key, field, normalizeDigits(inputEvent.target.value))
                            }
                            placeholder="--"
                            aria-label={`${event.distanceM}mの${label}`}
                            className={`w-full rounded-lg border px-1.5 py-2.5 text-center text-sm tabular-nums outline-none transition-colors ${
                              errors[key]
                                ? 'border-red-400 focus:ring-2 focus:ring-red-100'
                                : 'border-slate-200 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100'
                            }`}
                          />
                        </label>
                      );
                      return separator ? [separator, input] : [input];
                    })}
                  </div>
                  <div className="mx-auto mt-2 flex min-h-8 max-w-[246px] items-start justify-between gap-2 sm:max-w-[378px]">
                    {errors[key] ? (
                      <span className="text-xs text-red-600">{errors[key]}</span>
                    ) : (
                      <span />
                    )}
                    {hasInput && (
                      <button
                        type="button"
                        onClick={() => clearValue(key)}
                        className="inline-flex min-h-8 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-600 shadow-sm transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                        title={`${event.distanceM}mのタイムをクリア`}
                      >
                        × クリア
                      </button>
                    )}
                  </div>
                  {hasValidTime && (
                    <label className="mx-auto mt-2 block max-w-[246px] sm:max-w-[220px]">
                      <span className="mb-1 block text-xs font-medium text-slate-500">記録日（任意）</span>
                      <input
                        type="date"
                        value={value.recordedOn}
                        onChange={(dateEvent) => updateValue(key, 'recordedOn', dateEvent.target.value)}
                        aria-label={`${event.distanceM}mの記録日`}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-700 outline-none transition-colors focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100"
                      />
                    </label>
                  )}
                </div>
              </div>
            );
          })}
          </div>
        </div>
      </section>

      <div
        className={`flex items-center justify-between gap-3 ${
          isDirty || saving || message
            ? 'sticky bottom-[86px] z-30 -mx-1 rounded-lg border border-slate-200 bg-white/95 px-3 py-2 shadow-lg backdrop-blur lg:bottom-4'
            : ''
        }`}
      >
        <p
          role="status"
          className={`min-h-5 text-xs sm:text-sm ${
            message?.includes('保存しました')
              ? 'text-emerald-700'
              : message
                ? 'text-red-600'
                : isDirty
                  ? 'text-amber-700'
                  : 'text-slate-500'
          }`}
        >
          {message ?? (isDirty ? '未保存の変更があります' : '保存済みです')}
        </p>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !isDirty}
          className="shrink-0 rounded-lg bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-50 sm:px-6"
        >
          {saving ? '保存中...' : 'すべての入力を保存'}
        </button>
      </div>
      </div>
    </div>
  );
}
