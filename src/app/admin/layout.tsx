import { redirect } from 'next/navigation';
import { getEffectiveUser, createClient } from '@/lib/supabase/server';
import { getSupabaseServiceRole } from '@/lib/supabase/admin';
import AdminSidebar from './AdminSidebar';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getEffectiveUser();
  if (!user) redirect('/login?redirect=/admin');

  const sb = user.isBypass ? getSupabaseServiceRole() : await createClient();
  if (!sb) redirect('/login');

  const { data: me } = await sb
    .from('profiles')
    .select('role, display_name')
    .eq('id', user.id)
    .single();

  if (me?.role !== 'admin') redirect('/mypage');

  return (
    <div className="flex min-h-screen bg-slate-50">
      <AdminSidebar adminName={me.display_name ?? 'Admin'} />
      <div className="flex-1 flex flex-col ml-56 min-h-screen">
        {children}
      </div>
    </div>
  );
}
