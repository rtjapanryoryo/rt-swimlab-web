import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * セッションを更新し、保護されたパスへの未ログインアクセスを /login にリダイレクト
 */
export async function updateSession(request: NextRequest) {
  if (!url || !anonKey) {
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();

  // 保護対象パス: /, /mypage, /admin
  const isProtected =
    request.nextUrl.pathname === '/' ||
    request.nextUrl.pathname.startsWith('/mypage') ||
    request.nextUrl.pathname.startsWith('/admin');
  const isAuthPage = request.nextUrl.pathname === '/login'
    || request.nextUrl.pathname === '/signup'
    || request.nextUrl.pathname === '/forgot-password'
    || request.nextUrl.pathname === '/update-password';

  if (isProtected && !user) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isAuthPage && user) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return response;
}
