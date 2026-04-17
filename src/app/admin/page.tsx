import { redirect } from 'next/navigation';
import { getEffectiveUser, createClient } from '@/lib/supabase/server';
import { getSupabaseServiceRole } from '@/lib/supabase/admin';
import AdminDashboard from './AdminDashboard';

/**
 * サーバーコンポーネントとして role=admin を検証してからのみ描画。
 * 未ログイン → /login、非 admin → /mypage に即リダイレクト。
 * クライアントにページシェルが届く前にアクセス制御を完了させる。
 */
export default async function AdminPage() {
  const user = await getEffectiveUser();
  if (!user) redirect('/login?redirect=/admin');

  const sb = user.isBypass ? getSupabaseServiceRole() : await createClient();
  if (!sb) redirect('/login');

  const { data: me } = await sb.from('profiles').select('role').eq('id', user.id).single();
  if (me?.role !== 'admin') redirect('/mypage');

  return <AdminDashboard />;
}
