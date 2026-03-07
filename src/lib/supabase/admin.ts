/**
 * Supabase サーバー用クライアント（anon key）
 * メニュー保存・プロフィール等に使用。RLS に従う。
 * ※認証チェックは必ず getUser() で行い、user_id はそちらから取得すること
 */
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function getSupabaseAdmin() {
  if (!url || !anonKey) return null;
  return createClient(url, anonKey);
}

export function isSupabaseConfigured(): boolean {
  return Boolean(url && anonKey);
}
