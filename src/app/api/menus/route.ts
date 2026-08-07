/**
 * メニュー保存・一覧取得 API
 * - POST: メニューを保存
 * - GET: ログインユーザーのメニュー一覧を取得（日付・時間でソート）
 */
import path from 'path';
import { config as loadEnv } from 'dotenv';
import { NextRequest, NextResponse } from 'next/server';

try {
  loadEnv({ path: path.resolve(process.cwd(), '.env.ai') });
} catch {
  // .env.ai が無くても続行
}
import { createClient, getEffectiveUser } from '@/lib/supabase/server';
import { getSupabaseServiceRole, isSupabaseConfigured } from '@/lib/supabase/admin';

export async function POST(request: NextRequest) {
  const user = await getEffectiveUser();
  if (!user) {
    return NextResponse.json(
      { error: 'login_required', message: 'ログインが必要です。' },
      { status: 401 }
    );
  }

  const sb = user.isBypass ? getSupabaseServiceRole() : (await createClient());
  if (!sb) {
    return NextResponse.json(
      { error: 'not_configured', message: user.isBypass ? 'バイパス時は SUPABASE_SERVICE_ROLE_KEY が必要です。' : 'メニュー保存は未設定です。' },
      { status: 503 }
    );
  }

  try {
    const body = (await request.json()) as {
      input?: Record<string, unknown>;
      result?: Record<string, unknown>;
      source?: string;
    };

    const user_id = user.id;
    const user_email = user.email ?? '';
    const input = { ...(body.input ?? {}) };
    const result = body.result ?? {};
    const source = body.source === 'custom' ? 'custom' : 'quick';

    const generationContext = result.generationContext as
      | { mainSetTimeMinutes?: unknown }
      | undefined;
    const mainSetDistance = Number(result.mainM);
    const isMainSetOnly =
      source === 'custom' &&
      Number(generationContext?.mainSetTimeMinutes) > 0 &&
      Number.isFinite(mainSetDistance) &&
      mainSetDistance > 0;

    if (isMainSetOnly) {
      // custom画面に残っている旧quick入力を保存しないよう、生成結果のメイン距離を正とします。
      input.distance = String(mainSetDistance);
      input.distanceType = '';
      input.practiceTime = '';
    }

    const { data, error } = await sb
      .from('menus')
      .insert({
        user_id,
        user_email,
        input,
        result,
        source,
      })
      .select('id, created_at')
      .single();

    if (error) {
      console.error('[menus] insert error:', error);
      return NextResponse.json(
        { error: 'insert_failed', message: '保存に失敗しました。' },
        { status: 500 }
      );
    }

    // 累計生成回数 +1（profile 未存在時は service_role で upsert）+ 基本ログ
    let nextCount = 0;
    try {
      const { data: profile } = await sb.from('profiles').select('total_usage_count').eq('id', user_id).single();
      nextCount = (profile?.total_usage_count ?? 0) + 1;
      if (profile) {
        await sb.from('profiles').update({ total_usage_count: nextCount, updated_at: new Date().toISOString() }).eq('id', user_id);
      } else {
        const admin = getSupabaseServiceRole();
        if (admin) {
          const authUser = user as { user_metadata?: { full_name?: string } };
          await admin.from('profiles').upsert(
            {
              id: user_id,
              role: 'user',
              display_name: authUser?.user_metadata?.full_name ?? (user_email || null),
              total_usage_count: nextCount,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'id' }
          );
        }
      }
      const logLabel =
        source === 'custom'
          ? `メニュー生成（カスタム） 累計${nextCount}回目`
          : `メニュー生成（クイック） 累計${nextCount}回目`;
      await sb.from('generation_logs').insert({ user_id, content_details: logLabel });
    } catch (e) {
      console.warn('[menus] profile/log update failed (non-fatal):', e);
    }

    // 即時反映用に新件数を返す（楽観的更新でラグ解消）
    let quick_count = 0;
    let custom_count = 0;
    let custom_count_this_month = 0;
    try {
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);

      const [quickRes, customRes, customMonthRes] = await Promise.all([
        sb.from('menus').select('id', { count: 'exact', head: true }).eq('user_id', user_id).eq('source', 'quick'),
        sb.from('menus').select('id', { count: 'exact', head: true }).eq('user_id', user_id).eq('source', 'custom'),
        sb.from('menus').select('id', { count: 'exact', head: true }).eq('user_id', user_id).eq('source', 'custom').gte('created_at', monthStart.toISOString()),
      ]);
      quick_count = quickRes.count ?? 0;
      custom_count = customRes.count ?? 0;
      custom_count_this_month = customMonthRes.count ?? 0;
    } catch {
      /* 非致命的 */
    }

    return NextResponse.json({
      id: data.id,
      created_at: data.created_at,
      total_usage_count: quick_count + custom_count,
      quick_count,
      custom_count,
      custom_count_this_month,
    });
  } catch (e) {
    console.error('[menus] POST error:', e);
    return NextResponse.json(
      { error: 'internal_error', message: 'エラーが発生しました。' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const user = await getEffectiveUser();
  if (!user) {
    return NextResponse.json(
      { error: 'login_required', message: 'ログインが必要です。' },
      { status: 401 }
    );
  }

  const sb = user.isBypass ? getSupabaseServiceRole() : await createClient();
  if (!sb) {
    return NextResponse.json(
      { error: 'not_configured', message: user.isBypass ? 'バイパス時は SUPABASE_SERVICE_ROLE_KEY が必要です。' : 'メニュー一覧は未設定です。' },
      { status: 503 }
    );
  }

  const user_id = user.id;
  const { searchParams } = new URL(request.url);
  const from = searchParams.get('from'); // YYYY-MM-DD
  const to = searchParams.get('to');   // YYYY-MM-DD
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '50', 10), 100);

  try {
    let query = sb
      .from('menus')
      .select('id, input, result, source, created_at')
      .eq('user_id', user_id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (from) {
      query = query.gte('created_at', `${from}T00:00:00.000Z`);
    }
    if (to) {
      query = query.lte('created_at', `${to}T23:59:59.999Z`);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[menus] select error:', error);
      return NextResponse.json(
        { error: 'select_failed', message: '取得に失敗しました。' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      menus: data ?? [],
      configured: isSupabaseConfigured(),
    });
  } catch (e) {
    console.error('[menus] GET error:', e);
    return NextResponse.json(
      { error: 'internal_error', message: 'エラーが発生しました。' },
      { status: 500 }
    );
  }
}
