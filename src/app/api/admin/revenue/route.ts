import { NextResponse } from 'next/server';
import { getEffectiveUser, createClient } from '@/lib/supabase/server';
import { getSupabaseServiceRole } from '@/lib/supabase/admin';

// カウンセリングプランの単価（completed のみ収益計上）
const COUNSELING_PRICES: Record<string, number> = {
  free:    0,
  athlete: 1500,
  coach:   2980,
};

export async function GET() {
  const user = await getEffectiveUser();
  if (!user) return NextResponse.json({ error: 'login_required' }, { status: 401 });

  const authSb = user.isBypass ? getSupabaseServiceRole() : await createClient();
  if (!authSb) return NextResponse.json({ error: 'not_configured' }, { status: 503 });

  const { data: me } = await authSb.from('profiles').select('role').eq('id', user.id).single();
  if (me?.role !== 'admin') return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const sb = getSupabaseServiceRole() ?? authSb;

  // ── subscriptions ──────────────────────────────────────────
  let subs: Array<{
    user_id: string; plan: string; status: string;
    price_monthly: number; started_at: string;
    cancelled_at: string | null; created_at: string;
  }> | null = null;
  let subsError = false;
  try {
    const { data, error } = await sb.from('subscriptions').select('*');
    if (error) subsError = true;
    else subs = data;
  } catch { subsError = true; }

  // ── counseling_requests ────────────────────────────────────
  type CounselingRow = {
    id: string; plan_type: 'free' | 'athlete' | 'coach';
    status: string; created_at: string; updated_at: string;
  };
  let counseling: CounselingRow[] = [];
  try {
    const { data } = await sb
      .from('counseling_requests')
      .select('id, plan_type, status, created_at, updated_at');
    counseling = (data ?? []) as CounselingRow[];
  } catch { /* テーブル未作成時は空のまま */ }

  // ── subscriptions 未準備の場合でもカウンセリングは返す ──
  if (subsError || !subs) {
    const counselingKpi = calcCounselingKpi(counseling);
    return NextResponse.json({
      subscriptionsReady: false,
      kpi: null, planDist: [], monthlyTrend: [],
      counselingKpi,
      counselingTrend: buildCounselingTrend(counseling),
      counselingPlanDist: buildCounselingPlanDist(counseling),
    });
  }

  // ── subscription KPI ───────────────────────────────────────
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const activeSubs = subs.filter(s => s.status === 'active');
  const mrr  = activeSubs.reduce((sum, s) => sum + s.price_monthly, 0);

  const planMap = new Map<string, { count: number; revenue: number }>();
  activeSubs.forEach(s => {
    const cur = planMap.get(s.plan) ?? { count: 0, revenue: 0 };
    planMap.set(s.plan, { count: cur.count + 1, revenue: cur.revenue + s.price_monthly });
  });

  const monthlyTrend: { month: string; mrr: number; newSubs: number; counselingRevenue: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const mStart = d.toISOString();
    const mEnd   = new Date(d.getFullYear(), d.getMonth() + 1, 1).toISOString();
    const activeThen = subs.filter(
      s => s.started_at <= mEnd && (!s.cancelled_at || s.cancelled_at > mStart)
    );
    const completedCounseling = counseling.filter(
      c => c.status === 'completed' && c.updated_at >= mStart && c.updated_at < mEnd
    );
    const counselingRevenue = completedCounseling.reduce(
      (sum, c) => sum + (COUNSELING_PRICES[c.plan_type] ?? 0), 0
    );
    monthlyTrend.push({
      month: `${d.getMonth() + 1}月`,
      mrr:   activeThen.reduce((sum, s) => sum + s.price_monthly, 0),
      newSubs: subs.filter(s => s.started_at >= mStart && s.started_at < mEnd).length,
      counselingRevenue,
    });
  }

  return NextResponse.json({
    subscriptionsReady: true,
    kpi: {
      mrr,
      arr: mrr * 12,
      activeCount: activeSubs.length,
      totalCount: subs.length,
      newThisMonth: subs.filter(s => s.created_at >= monthStart).length,
      cancelledThisMonth: subs.filter(s => s.cancelled_at && s.cancelled_at >= monthStart).length,
      arpu: activeSubs.length > 0 ? Math.round(mrr / activeSubs.length) : 0,
    },
    planDist: Array.from(planMap.entries()).map(([name, v]) => ({ name, ...v })),
    monthlyTrend,
    counselingKpi: calcCounselingKpi(counseling),
    counselingTrend: buildCounselingTrend(counseling),
    counselingPlanDist: buildCounselingPlanDist(counseling),
  });
}

// ── カウンセリング集計ヘルパー ─────────────────────────────

type CounselingRow = { plan_type: 'free' | 'athlete' | 'coach'; status: string; created_at: string; updated_at: string };

function calcCounselingKpi(rows: CounselingRow[]) {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const completed = rows.filter(r => r.status === 'completed');
  const totalRevenue = completed.reduce((sum, r) => sum + (COUNSELING_PRICES[r.plan_type] ?? 0), 0);
  const thisMonthCompleted = completed.filter(r => r.updated_at >= monthStart);
  const thisMonthRevenue = thisMonthCompleted.reduce((sum, r) => sum + (COUNSELING_PRICES[r.plan_type] ?? 0), 0);

  return {
    totalSessions:      rows.length,
    completedSessions:  completed.length,
    pendingSessions:    rows.filter(r => r.status === 'pending').length,
    confirmedSessions:  rows.filter(r => r.status === 'confirmed').length,
    totalRevenue,
    thisMonthRevenue,
    thisMonthSessions:  thisMonthCompleted.length,
  };
}

function buildCounselingTrend(rows: CounselingRow[]) {
  const now = new Date();
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    const mStart = d.toISOString();
    const mEnd   = new Date(d.getFullYear(), d.getMonth() + 1, 1).toISOString();
    const completed = rows.filter(r => r.status === 'completed' && r.updated_at >= mStart && r.updated_at < mEnd);
    return {
      month: `${d.getMonth() + 1}月`,
      sessions: completed.length,
      revenue:  completed.reduce((sum, r) => sum + (COUNSELING_PRICES[r.plan_type] ?? 0), 0),
    };
  });
}

function buildCounselingPlanDist(rows: CounselingRow[]) {
  const labels: Record<string, string> = { free: '無料', athlete: '選手', coach: 'コーチ' };
  const map = new Map<string, { count: number; revenue: number }>();
  rows.forEach(r => {
    const cur = map.get(r.plan_type) ?? { count: 0, revenue: 0 };
    map.set(r.plan_type, {
      count: cur.count + 1,
      revenue: cur.revenue + (r.status === 'completed' ? (COUNSELING_PRICES[r.plan_type] ?? 0) : 0),
    });
  });
  return Array.from(map.entries()).map(([id, v]) => ({ id, name: labels[id] ?? id, ...v }));
}
