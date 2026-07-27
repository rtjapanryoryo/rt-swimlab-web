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
  const [message, setMessage] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch('/api/best-times', { credentials: 'include', cache: 'no-store' })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? 'ベストタイムを読み込めませんでした');
        const nextRecords = (data.records ?? []) as BestTimeRecord[];
        setRecords(nextRecords);
        setValues(valuesFromRecords(nextRecords));
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

  function updateValue(key: string, field: keyof InputValue, value: string) {
    setValues((current) => ({
      ...current,
      [key]: {
        ...(current[key] ?? EMPTY_INPUT_VALUE),
        [field]: value,
      },
    }));
    setErrors((current) => {
      const next = { ...current };
      delete next[key];
      return next;
    });
    setMessage(null);
  }

  async function handleSave() {
    const nextErrors: Record<string, string> = {};
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
          nextErrors[key] = '分は0〜99、秒は0〜59、小数点以下は2桁で入力してください';
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
      setMessage('入力形式を確認してください');
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
      </section>

      <section className="space-y-5">
        <div>
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

        <div>
          <p className="mb-2 text-sm font-semibold text-slate-700">種目</p>
          <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="種目">
            {STROKES.map((item) => (
              <button
                key={item.value}
                type="button"
                role="tab"
                aria-selected={stroke === item.value}
                onClick={() => setStroke(item.value)}
                className={`shrink-0 rounded-lg border px-4 py-2 text-sm font-semibold transition-colors ${
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

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="hidden grid-cols-[90px_minmax(260px,1fr)_minmax(150px,200px)] gap-4 border-b border-slate-200 bg-slate-50 px-5 py-3 text-xs font-semibold text-slate-500 sm:grid">
          <span>距離</span>
          <span>ベストタイム</span>
          <span>記録日（任意）</span>
        </div>
        <div className="divide-y divide-slate-100">
          {visibleEvents.map((event) => {
            const key = personalBestKey(event.stroke, event.distanceM, poolLength);
            const value = values[key] ?? EMPTY_INPUT_VALUE;
            return (
              <div
                key={key}
                className="grid gap-3 px-5 py-4 sm:grid-cols-[90px_minmax(260px,1fr)_minmax(150px,200px)] sm:items-start sm:gap-4"
              >
                <div>
                  <span className="text-xs font-medium text-slate-400 sm:hidden">距離</span>
                  <p className="text-base font-semibold tabular-nums text-slate-900">{event.distanceM}m</p>
                </div>
                <div>
                  <span className="mb-1 block text-xs font-medium text-slate-500 sm:sr-only">ベストタイム</span>
                  <div className="grid grid-cols-3 gap-2">
                    {([
                      ['minutes', '分', '0'],
                      ['seconds', '秒', '00'],
                      ['centiseconds', '1/100秒', '00'],
                    ] as const).map(([field, label, placeholder]) => (
                      <label key={field} className="min-w-0">
                        <span className="mb-1 block text-center text-[11px] font-medium text-slate-500">
                          {label}
                        </span>
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          maxLength={2}
                          value={value[field]}
                          onChange={(inputEvent) =>
                            updateValue(key, field, normalizeDigits(inputEvent.target.value))
                          }
                          placeholder={placeholder}
                          aria-label={`${event.distanceM}mの${label}`}
                          className={`w-full rounded-lg border px-2 py-2.5 text-center text-sm tabular-nums outline-none transition-colors ${
                            errors[key]
                              ? 'border-red-400 focus:ring-2 focus:ring-red-100'
                              : 'border-slate-200 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100'
                          }`}
                        />
                      </label>
                    ))}
                  </div>
                  {errors[key] && <span className="mt-1 block text-xs text-red-600">{errors[key]}</span>}
                </div>
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-slate-500 sm:sr-only">記録日（任意）</span>
                  <input
                    type="date"
                    value={value.recordedOn}
                    onChange={(event) => updateValue(key, 'recordedOn', event.target.value)}
                    aria-label={`${event.distanceM}mの記録日`}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-700 outline-none transition-colors focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100"
                  />
                </label>
              </div>
            );
          })}
        </div>
      </section>

      <div className="flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p
          role="status"
          className={`min-h-5 text-sm ${
            message?.includes('保存しました') ? 'text-cyan-700' : 'text-amber-700'
          }`}
        >
          {message}
        </p>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded-lg bg-cyan-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? '保存中...' : '入力したタイムを保存'}
        </button>
      </div>
    </div>
  );
}
