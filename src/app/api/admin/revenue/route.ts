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

  // subscriptions テーブルが存在しない場合を想定
  let subs: Array<{
    user_id: string;
    plan: string;
    status: string;
    price_monthly: number;
    started_at: string;
    cancelled_at: string | null;
    created_at: string;
  }> | null = null;
  let subsError = false;

  try {
    const { data, error } = await sb.from('subscriptions').select('*');
    if (error) {
      subsError = true;
    } else {
      subs = data;
    }
  } catch {
    subsError = true;
  }

  if (subsError || !subs) {
    return NextResponse.json({ subscriptionsReady: false, kpi: null, planDist: [], monthlyTrend: [] });
  }

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const activeSubs   = subs.filter(s => s.status === 'active');
  const mrr          = activeSubs.reduce((sum, s) => sum + s.price_monthly, 0);
  const arr          = mrr * 12;

  const newThisMonth = subs.filter(s => s.created_at >= monthStart).length;
  const cancelledThisMonth = subs.filter(
    s => s.cancelled_at && s.cancelled_at >= monthStart
  ).length;

  // プラン別
  const planMap = new Map<string, { count: number; revenue: number }>();
  activeSubs.forEach(s => {
    const cur = planMap.get(s.plan) ?? { count: 0, revenue: 0 };
    planMap.set(s.plan, { count: cur.count + 1, revenue: cur.revenue + s.price_monthly });
  });
  const planDist = Array.from(planMap.entries()).map(([name, v]) => ({ name, ...v }));

  // 過去6ヶ月の月次MRR推移
  const monthlyTrend: { month: string; mrr: number; newSubs: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const mStart = d.toISOString();
    const mEnd   = new Date(d.getFullYear(), d.getMonth() + 1, 1).toISOString();
    const activeThen = subs.filter(
      s => s.started_at <= mEnd && (!s.cancelled_at || s.cancelled_at > mStart)
    );
    const mMRR = activeThen.reduce((sum, s) => sum + s.price_monthly, 0);
    const newInMonth = subs.filter(s => s.started_at >= mStart && s.started_at < mEnd).length;
    monthlyTrend.push({
      month: `${d.getMonth() + 1}月`,
      mrr:   mMRR,
      newSubs: newInMonth,
    });
  }

  return NextResponse.json({
    subscriptionsReady: true,
    kpi: {
      mrr,
      arr,
      activeCount:         activeSubs.length,
      totalCount:          subs.length,
      newThisMonth,
      cancelledThisMonth,
      arpu: activeSubs.length > 0 ? Math.round(mrr / activeSubs.length) : 0,
    },
    planDist,
    monthlyTrend,
  });
}
