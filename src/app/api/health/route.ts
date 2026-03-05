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

  // クライアント側の認証に必要な NEXT_PUBLIC_ 変数（サインアップ/ログインで使用）
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
  const anonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim();
  const authConfigured = url.length > 0 && anonKey.length > 0;

  return NextResponse.json({
    openaiConfigured,
    openaiReason,
    supabaseConfigured: !!sb,
    supabaseConnected: supabaseOk,
    authConfigured,
    authMissing: !authConfigured
      ? [
          !url.length && 'NEXT_PUBLIC_SUPABASE_URL',
          !anonKey.length && 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
        ].filter(Boolean)
      : [],
  });
}
