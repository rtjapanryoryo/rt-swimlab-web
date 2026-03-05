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
import { getUser } from '@/lib/supabase/server';
import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase/admin';

export async function POST(request: NextRequest) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json(
      { error: 'login_required', message: 'ログインが必要です。' },
      { status: 401 }
    );
  }

  const sb = getSupabaseAdmin();
  if (!sb) {
    return NextResponse.json(
      { error: 'not_configured', message: 'メニュー保存は未設定です。' },
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
    const input = body.input ?? {};
    const result = body.result ?? {};
    const source = body.source === 'custom' ? 'custom' : 'quick';

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

    return NextResponse.json({ id: data.id, created_at: data.created_at });
  } catch (e) {
    console.error('[menus] POST error:', e);
    return NextResponse.json(
      { error: 'internal_error', message: 'エラーが発生しました。' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json(
      { error: 'login_required', message: 'ログインが必要です。' },
      { status: 401 }
    );
  }

  const sb = getSupabaseAdmin();
  if (!sb) {
    return NextResponse.json(
      { error: 'not_configured', message: 'メニュー一覧は未設定です。' },
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
