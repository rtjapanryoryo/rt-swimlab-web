/**
 * サーバー用 Supabase クライアント（Route Handlers, Server Components）
 * クッキーからセッションを読み取り、認証済みユーザー情報を取得可能
 */
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export async function createClient() {
  if (!url || !anonKey) {
    return null;
  }
  const cookieStore = await cookies();
  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) =>
          cookieStore.set(name, value, options)
        );
      },
    },
  });
}

/**
 * 現在ログイン中のユーザーを取得。未ログインなら null
 */
export async function getUser() {
  const supabase = await createClient();
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

/** 開発用バイパス時は { id, isBypass: true } を返す */
export type EffectiveUser = { id: string; email?: string | null; isBypass?: boolean };

/**
 * 認証済みユーザーを取得。開発用バイパス有効時は cookie の user id を返す。
 * API Route では必ずこちらを使用すること。
 */
export async function getEffectiveUser(): Promise<EffectiveUser | null> {
  const user = await getUser();
  if (user) return { ...user, isBypass: false };

  const bypassId = process.env.DEV_BYPASS_USER_ID;
  if (
    !bypassId ||
    process.env.NODE_ENV !== 'development' ||
    process.env.DEV_BYPASS_AUTH !== 'true'
  ) {
    return null;
  }

  const cookieStore = await cookies();
  const bypassCookie = cookieStore.get('dev-bypass-user-id')?.value?.trim();
  if (bypassCookie === bypassId) {
    return { id: bypassId, isBypass: true };
  }
  return null;
}
