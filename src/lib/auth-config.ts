/**
 * 認証設定の確認（サーバー側のみ）
 * - Vercel では実行時の env を参照するため、ビルド時 inlining に依存しない
 */
export function getAuthConfiguredServer(): boolean {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
  const anonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim();
  return url.length > 0 && anonKey.length > 0;
}
