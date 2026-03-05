/**
 * 後方互換のため re-export
 * 新規は lib/supabase/admin.ts を使用
 */
export { getSupabaseAdmin as getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/admin';
