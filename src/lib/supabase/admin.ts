/**
 * Supabase サーバー用クライアント（anon key）
 * メニュー保存・プロフィール等に使用。RLS に従う。
 * ※認証チェックは必ず getUser() で行い、user_id はそちらから取得すること
 */
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export function getSupabaseAdmin() {
  if (!url || !anonKey) return null;
  return createClient(url, anonKey);
}

/** 開発用バイパス時に RLS をバイパスするクライアント。本番では未設定推奨 */
export function getSupabaseServiceRole() {
  if (!url || !serviceRoleKey) return null;
  return createClient(url, serviceRoleKey, { auth: { persistSession: false } });
}

export function isSupabaseConfigured(): boolean {
  return Boolean(url && anonKey);
}
