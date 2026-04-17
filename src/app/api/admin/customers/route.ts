import { NextResponse } from 'next/server';
import { getEffectiveUser, createClient } from '@/lib/supabase/server';
import { getSupabaseServiceRole } from '@/lib/supabase/admin';

export async function GET() {
  const user = await getEffectiveUser();
  if (!user) return NextResponse.json({ error: 'login_required' }, { status: 401 });

  const authSb = user.isBypass ? getSupabaseServiceRole() : await createClient();
  if (!authSb) return NextResponse.json({ error: 'not_configured' }, { status: 503 });

  const { data: me } = await authSb.from('profiles').select('role').eq('id', user.id).single();
  if (me?.role !== 'admin') return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const sb = getSupabaseServiceRole() ?? authSb;

  // 全プロフィール取得
  const { data: profiles } = await sb
    .from('profiles')
    .select('id, display_name, role, total_usage_count, created_at')
    .order('total_usage_count', { ascending: false });

  if (!profiles?.length) return NextResponse.json({ customers: [] });

  const userIds = profiles.map(p => p.id);

  // 最終利用日・今月利用数を generation_logs から集計
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const [{ data: allLogs }, { data: monthLogs }, { data: menuRows }] = await Promise.all([
    sb.from('generation_logs')
      .select('user_id, created_at')
      .in('user_id', userIds)
      .order('created_at', { ascending: false }),
    sb.from('generation_logs')
      .select('user_id')
      .in('user_id', userIds)
      .gte('created_at', monthStart),
    sb.from('menus')
      .select('user_id, source, created_at')
      .in('user_id', userIds),
  ]);

  let subRows: { user_id: string; plan: string; status: string; price_monthly: number; started_at: string | null; cancelled_at: string | null }[] | null = null;
  const subRes = await sb
    .from('subscriptions')
    .select('user_id, plan, status, price_monthly, started_at, cancelled_at')
    .in('user_id', userIds);
  if (!subRes.error && subRes.data) subRows = subRes.data;

  // ユーザーごとの最終利用日
  const lastActiveMap = new Map<string, string>();
  (allLogs ?? []).forEach(r => {
    if (!lastActiveMap.has(r.user_id)) lastActiveMap.set(r.user_id, r.created_at);
  });

  // 今月利用数
  const monthCountMap = new Map<string, number>();
  (monthLogs ?? []).forEach(r => {
    monthCountMap.set(r.user_id, (monthCountMap.get(r.user_id) ?? 0) + 1);
  });

  // Quick/Custom 件数
  const quickMap  = new Map<string, number>();
  const customMap = new Map<string, number>();
  const firstMenuMap = new Map<string, string>();
  (menuRows ?? []).forEach(r => {
    if (r.source === 'quick')  quickMap.set(r.user_id,  (quickMap.get(r.user_id)  ?? 0) + 1);
    if (r.source === 'custom') customMap.set(r.user_id, (customMap.get(r.user_id) ?? 0) + 1);
    const existing = firstMenuMap.get(r.user_id);
    if (!existing || r.created_at < existing) firstMenuMap.set(r.user_id, r.created_at);
  });

  // サブスクリプション情報
  const subMap = new Map<string, { plan: string; status: string; price_monthly: number; started_at: string | null; cancelled_at: string | null }>();
  (subRows ?? []).forEach(r => {
    subMap.set(r.user_id, {
      plan:          r.plan,
      status:        r.status,
      price_monthly: r.price_monthly,
      started_at:    r.started_at,
      cancelled_at:  r.cancelled_at,
    });
  });

  const customers = profiles.map(p => {
    const created = new Date(p.created_at);
    const daysSince = Math.max(1, Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)));
    const weeksSince = daysSince / 7;
    const freqPerWeek = parseFloat((p.total_usage_count / weeksSince).toFixed(1));

    const sub = subMap.get(p.id);
    const monthsActive = sub?.started_at
      ? Math.max(1, Math.ceil((now.getTime() - new Date(sub.started_at).getTime()) / (1000 * 60 * 60 * 24 * 30)))
      : 0;
    const totalSpend = sub ? sub.price_monthly * monthsActive : 0;

    return {
      id:               p.id,
      display_name:     p.display_name,
      role:             p.role,
      plan:             sub?.plan ?? 'free',
      status:           sub?.status ?? 'free',
      price_monthly:    sub?.price_monthly ?? 0,
      total_spend:      totalSpend,
      total_usage_count: p.total_usage_count,
      month_count:      monthCountMap.get(p.id) ?? 0,
      quick_count:      quickMap.get(p.id)  ?? 0,
      custom_count:     customMap.get(p.id) ?? 0,
      freq_per_week:    freqPerWeek,
      days_active:      daysSince,
      created_at:       p.created_at,
      first_menu_at:    firstMenuMap.get(p.id) ?? null,
      last_active:      lastActiveMap.get(p.id) ?? null,
      sub_started_at:   sub?.started_at ?? null,
    };
  });

  return NextResponse.json({ customers });
}
