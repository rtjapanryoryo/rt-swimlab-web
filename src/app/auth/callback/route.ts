import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { EmailOtpType } from '@supabase/supabase-js';

/**
 * Supabase 認証コールバック
 * - OAuth (Google): code を exchangeCodeForSession でセッション化
 * - パスワードリセット: token_hash + type を verifyOtp で検証
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const origin = request.nextUrl.origin;
  const code = searchParams.get('code');
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  let next = searchParams.get('next') ?? '/';
  if (!next.startsWith('/')) next = '/';

  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.redirect(`${origin}/login?error=config`);
  }

  // OAuth (Google 等): code でセッション確立
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
    console.error('[auth/callback] OAuth exchange error:', error);
    return NextResponse.redirect(`${origin}/login?error=oauth`);
  }

  // パスワードリセット: token_hash + type で検証
  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    });
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
    console.error('[auth/callback] OTP verify error:', error);
    return NextResponse.redirect(`${origin}/forgot-password?error=expired`);
  }

  return NextResponse.redirect(`${origin}/login?error=invalid`);
}
