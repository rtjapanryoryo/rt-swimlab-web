import { NextResponse } from 'next/server';
import { getQuickSettings } from '@/lib/rt/content';

/**
 * GET: クイックメニュー用設定（セクション順など）。認証不要。
 */
export async function GET() {
  try {
    const settings = await getQuickSettings();
    return NextResponse.json(settings);
  } catch (e) {
    const message = e instanceof Error ? e.message : '設定の取得に失敗しました';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
