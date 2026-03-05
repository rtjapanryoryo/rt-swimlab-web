/**
 * Supabase 管理用クライアント（service_role）
 * メニュー保存など、RLS をバイパスする操作に使用
 * ※認証チェックは必ず getUser() で行い、user_id はそちらから取得すること
 */
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export function getSupabaseAdmin() {
  if (!url || !serviceRoleKey) return null;
  return createClient(url, serviceRoleKey);
}

export function isSupabaseConfigured(): boolean {
  return Boolean(url && serviceRoleKey);
}
