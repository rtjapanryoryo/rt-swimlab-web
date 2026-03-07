import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { EmailOtpType } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * ログイン後のリダイレクト先を role に応じて決定（セッション付きクライアント使用）
 */
async function getRedirectForUser(sb: SupabaseClient | null, userId: string, fallback: string): Promise<string> {
  if (!sb) return fallback;
  try {
    const { data } = await sb.from('profiles').select('role').eq('id', userId).single();
    if (data?.role === 'admin') return '/admin';
  } catch {
    /* profiles 未作成時は fallback */
  }
  return fallback;
}

/**
 * Supabase 認証コールバック
 * - OAuth (Google): code を exchangeCodeForSession でセッション化
 * - パスワードリセット: token_hash + type を verifyOtp で検証
 * - ログイン後: role に応じて /admin または /mypage へリダイレクト
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const origin = request.nextUrl.origin;
  const code = searchParams.get('code');
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  let next = searchParams.get('next') ?? '';
  if (!next.startsWith('/')) next = '';

  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.redirect(`${origin}/login?error=config`);
  }

  // OAuth (Google 等): code でセッション確立
  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.user) {
      const redirect = next || (await getRedirectForUser(supabase, data.user.id, '/mypage'));
      return NextResponse.redirect(`${origin}${redirect}`);
    }
    if (!error) return NextResponse.redirect(`${origin}${next || '/mypage'}`);
    console.error('[auth/callback] OAuth exchange error:', error);
    return NextResponse.redirect(`${origin}/login?error=oauth`);
  }

  // パスワードリセット: token_hash + type で検証
  if (tokenHash && type) {
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    });
    if (!error && data.user) {
      const redirect = next || (await getRedirectForUser(supabase, data.user.id, '/update-password'));
      return NextResponse.redirect(`${origin}${redirect}`);
    }
    if (!error) return NextResponse.redirect(`${origin}${next || '/'}`);
    console.error('[auth/callback] OTP verify error:', error);
    return NextResponse.redirect(`${origin}/forgot-password?error=expired`);
  }

  return NextResponse.redirect(`${origin}/login?error=invalid`);
}
