import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';

/**
 * サーバー側の env と各種サービス接続状態を返す。認証不要。
 */
export async function GET() {
  const key = (process.env.OPENAI_API_KEY || '').trim();
  const openaiConfigured = key.length > 0 && key !== 'YOUR_API_KEY_HERE';
  const openaiReason: 'missing' | 'placeholder' | undefined = openaiConfigured
    ? undefined
    : key === 'YOUR_API_KEY_HERE'
      ? 'placeholder'
      : 'missing';

  // Supabase 接続確認
  let supabaseOk = false;
  const sb = getSupabaseClient();
  if (sb) {
    try {
      const { error } = await sb.from('menus').select('id').limit(1);
      supabaseOk = !error;
    } catch {
      supabaseOk = false;
    }
  }

  return NextResponse.json({
    openaiConfigured,
    openaiReason,
    supabaseConfigured: !!sb,
    supabaseConnected: supabaseOk,
  });
}
