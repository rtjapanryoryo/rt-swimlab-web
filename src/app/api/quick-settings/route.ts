import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getUser } from '@/lib/supabase/server';
import { getQuickSettings } from '@/lib/rt/content';

/**
 * GET: クイックメニュー用設定（セクション順など）。未ログインなら 401 + JSON。
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'login_required', message: 'ログインが必要です' },
        { status: 401, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
      );
    }
    const settings = await getQuickSettings();
    return NextResponse.json(settings);
  } catch (e: unknown) {
    console.error('[quick-settings] GET error:', e);
    return NextResponse.json(
      { error: 'internal_error', message: '現在生成できません。時間をおいて再試行してください' },
      { status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  }
}
