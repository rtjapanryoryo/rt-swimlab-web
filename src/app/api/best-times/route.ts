import { NextResponse } from 'next/server';
import { createClient, getEffectiveUser, getServiceRole } from '@/lib/supabase/server';
import {
  isPersonalBestEvent,
  MAX_SWIM_TIME_CENTISECONDS,
  type PoolLength,
  type StrokeCode,
} from '@/lib/personal-best-times';

type BestTimeInput = {
  stroke: StrokeCode;
  distance_m: number;
  pool_length: PoolLength;
  time_centiseconds: number;
  recorded_on: string | null;
};

function isDateOrNull(value: unknown): value is string | null {
  if (value === null) return true;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function parseBestTimeInput(value: unknown): BestTimeInput | null {
  if (!value || typeof value !== 'object') return null;
  const row = value as Record<string, unknown>;
  const distanceM = Number(row.distance_m);
  const timeCentiseconds = Number(row.time_centiseconds);

  if (!isPersonalBestEvent(row.stroke, distanceM, row.pool_length)) return null;
  if (
    !Number.isInteger(timeCentiseconds) ||
    timeCentiseconds <= 0 ||
    timeCentiseconds >= MAX_SWIM_TIME_CENTISECONDS
  ) {
    return null;
  }
  if (!isDateOrNull(row.recorded_on)) return null;

  return {
    stroke: row.stroke as StrokeCode,
    distance_m: distanceM,
    pool_length: row.pool_length as PoolLength,
    time_centiseconds: timeCentiseconds,
    recorded_on: row.recorded_on,
  };
}

export async function GET() {
  const user = await getEffectiveUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // ローカルの開発用バイパスにはSupabaseセッションがないため、サーバー限定のservice roleを使います。
  // どちらの経路でも全クエリを認証済みuser.idで絞り、他ユーザーの記録は扱いません。
  const supabase = user.isBypass ? getServiceRole() : await createClient();
  if (!supabase) return NextResponse.json({ error: 'DB error' }, { status: 500 });

  // RLSに加えてuser_idを明示し、本人以外の記録を取得しないことをコード上でも保証します。
  const { data, error } = await supabase
    .from('personal_best_times')
    .select('id, stroke, distance_m, pool_length, time_centiseconds, recorded_on, updated_at')
    .eq('user_id', user.id)
    .order('distance_m', { ascending: true });

  if (error) {
    console.error('[best-times] list error:', error.message);
    return NextResponse.json({ error: 'ベストタイムを読み込めませんでした' }, { status: 500 });
  }
  return NextResponse.json({ records: data ?? [] });
}

export async function PUT(request: Request) {
  const user = await getEffectiveUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => null) as {
    records?: unknown[];
    delete_ids?: unknown[];
  } | null;
  if (!body || !Array.isArray(body.records) || body.records.length > 50) {
    return NextResponse.json({ error: '入力内容が正しくありません' }, { status: 400 });
  }

  const records = body.records.map(parseBestTimeInput);
  if (records.some((record) => record === null)) {
    return NextResponse.json({ error: 'ベストタイムの形式が正しくありません' }, { status: 400 });
  }

  const deleteIds = Array.isArray(body.delete_ids)
    ? body.delete_ids.filter((id): id is string => typeof id === 'string' && /^[0-9a-f-]{36}$/i.test(id))
    : [];
  if (deleteIds.length > 50 || deleteIds.length !== (body.delete_ids?.length ?? 0)) {
    return NextResponse.json({ error: '削除対象が正しくありません' }, { status: 400 });
  }

  const uniqueEvents = new Set(
    (records as BestTimeInput[]).map(
      (record) => `${record.stroke}-${record.distance_m}-${record.pool_length}`
    )
  );
  if (uniqueEvents.size !== records.length) {
    return NextResponse.json({ error: '同じ種目の記録が重複しています' }, { status: 400 });
  }

  const supabase = user.isBypass ? getServiceRole() : await createClient();
  if (!supabase) return NextResponse.json({ error: 'DB error' }, { status: 500 });

  if (records.length > 0) {
    // user_idはリクエストから受け取らず、認証済みユーザーのIDだけを保存します。
    const rows = (records as BestTimeInput[]).map((record) => ({
      ...record,
      user_id: user.id,
    }));
    const { error } = await supabase
      .from('personal_best_times')
      .upsert(rows, { onConflict: 'user_id,stroke,distance_m,pool_length' });
    if (error) {
      console.error('[best-times] save error:', error.message);
      return NextResponse.json({ error: 'ベストタイムを保存できませんでした' }, { status: 500 });
    }
  }

  if (deleteIds.length > 0) {
    const { error } = await supabase
      .from('personal_best_times')
      .delete()
      .eq('user_id', user.id)
      .in('id', deleteIds);
    if (error) {
      console.error('[best-times] delete error:', error.message);
      return NextResponse.json({ error: 'ベストタイムを削除できませんでした' }, { status: 500 });
    }
  }

  const { data, error } = await supabase
    .from('personal_best_times')
    .select('id, stroke, distance_m, pool_length, time_centiseconds, recorded_on, updated_at')
    .eq('user_id', user.id)
    .order('distance_m', { ascending: true });

  if (error) {
    console.error('[best-times] reload error:', error.message);
    return NextResponse.json({ error: '保存後のベストタイムを読み込めませんでした' }, { status: 500 });
  }
  return NextResponse.json({ records: data ?? [] });
}
