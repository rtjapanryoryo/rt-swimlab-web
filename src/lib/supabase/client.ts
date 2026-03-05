/**
 * ブラウザ用 Supabase クライアント
 * - 認証（signIn, signUp, signOut）
 * - セッション付きで API を呼ぶ場合に使用
 */
import { createBrowserClient } from '@supabase/ssr';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function createClient() {
  if (!url || !url.trim()) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL が .env.ai に未設定です。設定後は npm run dev を再起動してください。');
  }
  if (!anonKey || !anonKey.trim()) {
    throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY が .env.ai に未設定です。設定後は npm run dev を再起動してください。');
  }
  return createBrowserClient(url, anonKey);
}

export function isAuthConfigured(): boolean {
  return Boolean(url && anonKey);
}
