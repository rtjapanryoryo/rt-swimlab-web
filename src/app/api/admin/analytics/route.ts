import { NextResponse } from 'next/server';
import { getEffectiveUser, createClient } from '@/lib/supabase/server';
import { getSupabaseServiceRole } from '@/lib/supabase/admin';

type Period = '7d' | '30d' | '3m' | '6m' | 'all' | 'custom';

function getPeriodConfig(period: Period, now: Date, from?: string, to?: string) {
  if (period === 'custom' && from && to) {
    const fromDate = new Date(from);
    const toDate   = new Date(to);
    toDate.setHours(23, 59, 59, 999);
    const diffDays = Math.round((toDate.getTime() - fromDate.getTime()) / 86400000);
    return { days: diffDays <= 60 ? diffDays : null, months: diffDays > 60 ? 24 : null, since: fromDate.toISOString(), until: toDate.toISOString() };
  }
  switch (period) {
    case '7d':  return { days: 7,   months: null, since: new Date(now.getTime() - 7  * 86400000).toISOString(), until: undefined };
    case '30d': return { days: 30,  months: null, since: new Date(now.getTime() - 30 * 86400000).toISOString(), until: undefined };
    case '3m':  return { days: 90,  months: 3,    since: new Date(now.getFullYear(), now.getMonth() - 2, 1).toISOString(), until: undefined };
    case '6m':  return { days: 180, months: 6,    since: new Date(now.getFullYear(), now.getMonth() - 5, 1).toISOString(), until: undefined };
    case 'all': return { days: null, months: 24,  since: null, until: undefined };
    default:    return { days: 30,  months: null, since: new Date(now.getTime() - 30 * 86400000).toISOString(), until: undefined };
  }
}

export async function GET(req: Request) {
  const user = await getEffectiveUser();
  if (!user) return NextResponse.json({ error: 'login_required' }, { status: 401 });

  const authSb = user.isBypass ? getSupabaseServiceRole() : await createClient();
  if (!authSb) return NextResponse.json({ error: 'not_configured' }, { status: 503 });

  const { data: me } = await authSb.from('profiles').select('role').eq('id', user.id).single();
  if (me?.role !== 'admin') return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const sb = getSupabaseServiceRole() ?? authSb;

  const { searchParams } = new URL(req.url);
  const period = (searchParams.get('period') ?? '30d') as Period;
  const from   = searchParams.get('from') ?? undefined;
  const to     = searchParams.get('to')   ?? undefined;

  const now = new Date();
  const cfg = getPeriodConfig(period, now, from, to);

  // admin 除外フィルター
  const { data: adminRows } = await sb.from('profiles').select('id').eq('role', 'admin');
  const adminIds    = (adminRows ?? []).map(r => r.id);
  const adminFilter = adminIds.length > 0 ? `(${adminIds.join(',')})` : null;

  const gl = (col = 'user_id') => {
    const q = sb.from('generation_logs').select(col);
    return adminFilter ? q.not('user_id', 'in', adminFilter) : q;
  };
  const glCount = () => {
    const q = sb.from('generation_logs').select('id', { count: 'exact', head: true });
    return adminFilter ? q.not('user_id', 'in', adminFilter) : q;
  };

  const applyRange = <T extends ReturnType<typeof gl>>(q: T) => {
    let r = q;
    if (cfg.since) r = r.gte('created_at', cfg.since) as T;
    if (cfg.until) r = r.lte('created_at', cfg.until) as T;
    return r;
  };

  // 期間内の generation_logs を取得（トレンド計算用）
  const glWithPeriod = applyRange(gl('created_at'));

  // ユーザー登録トレンド用
  const userRegBase = sb.from('profiles').select('created_at').neq('role', 'admin');
  const userRegQuery = cfg.since
    ? (cfg.until ? userRegBase.gte('created_at', cfg.since).lte('created_at', cfg.until) : userRegBase.gte('created_at', cfg.since))
    : userRegBase;

  const [
    { count: totalGens },
    { count: periodGens },
    { count: totalUsers },
    { count: periodUsers },
    { data: trendRows },
    { data: menuRows },
    { data: userRegRows },
  ] = await Promise.all([
    glCount(),
    cfg.since ? glCount().gte('created_at', cfg.since) : glCount(),
    sb.from('profiles').select('id', { count: 'exact', head: true }).neq('role', 'admin'),
    cfg.since
      ? sb.from('profiles').select('id', { count: 'exact', head: true }).neq('role', 'admin').gte('created_at', cfg.since)
      : sb.from('profiles').select('id', { count: 'exact', head: true }).neq('role', 'admin'),
    glWithPeriod,
    sb.from('menus').select('input'),
    userRegQuery,
  ]);

  const allRows = (trendRows as unknown as Array<{ created_at: string }> ?? []);
  const userRows = (userRegRows as unknown as Array<{ created_at: string }> ?? []);

  // ── 曜日・時間帯分布 ──────────────────────────────────────────────────────
  const WEEKDAY_LABELS = ['日', '月', '火', '水', '木', '金', '土'];
  const hourMap:    number[] = Array(24).fill(0);
  const weekdayMap: number[] = Array(7).fill(0);
  allRows.forEach(r => {
    const d = new Date(r.created_at);
    hourMap[d.getHours()]++;
    weekdayMap[d.getDay()]++;
  });
  const hourlyDist  = hourMap.map((count, h) => ({ hour: `${h}時`, count }));
  const weekdayDist = weekdayMap.map((count, i) => ({ day: WEEKDAY_LABELS[i], count }));

  // ── 日別 / 月別トレンド ───────────────────────────────────────────────────
  let dailyTrend:   { date: string; count: number }[]  = [];
  let monthlyTrend: { month: string; count: number }[] = [];

  const useDailyView = period === '7d' || period === '30d';
  const numDays   = period === '7d' ? 7 : 30;
  const numMonths = cfg.months ?? 24;

  if (useDailyView) {
    const dailyMap = new Map<string, number>();
    allRows.forEach(r => {
      const d = r.created_at.substring(0, 10);
      dailyMap.set(d, (dailyMap.get(d) ?? 0) + 1);
    });
    dailyTrend = Array.from({ length: numDays }, (_, i) => {
      const d = new Date(now.getTime() - (numDays - 1 - i) * 86400000);
      const key = d.toISOString().substring(0, 10);
      return { date: key.substring(5), count: dailyMap.get(key) ?? 0 };
    });
  } else {
    const monthlyMap: Record<string, number> = {};
    for (let i = numMonths - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthlyMap[key] = 0;
    }
    allRows.forEach(r => {
      const key = r.created_at.substring(0, 7);
      if (key in monthlyMap) monthlyMap[key]++;
    });
    monthlyTrend = Object.entries(monthlyMap).map(([month, count]) => ({
      month: `${Number(month.substring(5))}月`,
      count,
    }));
  }

  // ── ユーザー登録トレンド ──────────────────────────────────────────────────
  let userRegistrationTrend: { date: string; count: number }[] = [];
  if (useDailyView) {
    const regMap = new Map<string, number>();
    userRows.forEach(r => {
      const d = r.created_at.substring(0, 10);
      regMap.set(d, (regMap.get(d) ?? 0) + 1);
    });
    userRegistrationTrend = Array.from({ length: numDays }, (_, i) => {
      const d = new Date(now.getTime() - (numDays - 1 - i) * 86400000);
      const key = d.toISOString().substring(0, 10);
      return { date: key.substring(5), count: regMap.get(key) ?? 0 };
    });
  } else {
    const regMonthMap: Record<string, number> = {};
    for (let i = numMonths - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      regMonthMap[key] = 0;
    }
    userRows.forEach(r => {
      const key = r.created_at.substring(0, 7);
      if (key in regMonthMap) regMonthMap[key]++;
    });
    userRegistrationTrend = Object.entries(regMonthMap).map(([month, count]) => ({
      date: `${Number(month.substring(5))}月`,
      count,
    }));
  }

  // ── 利用パターン詳細（累計）──────────────────────────────────────────────
  const strokeMap   = new Map<string, number>();
  const periodMap   = new Map<string, number>();
  const levelMap    = new Map<string, number>();
  const distTypeMap = new Map<string, number>();
  const PERIOD_LABELS: Record<string, string> = {
    '1': '①回復', '2': '②基礎', '3': '③発展',
    '4': '④持久', '5': '⑤乳酸', '6': '⑥調整', '7': '⑦テーパー',
  };
  (menuRows ?? []).forEach(r => {
    const inp = r.input as Record<string, string> | null;
    if (!inp) return;
    if (inp.stroke)       strokeMap.set(inp.stroke, (strokeMap.get(inp.stroke) ?? 0) + 1);
    if (inp.period)       periodMap.set(inp.period, (periodMap.get(inp.period) ?? 0) + 1);
    if (inp.distanceType) distTypeMap.set(inp.distanceType, (distTypeMap.get(inp.distanceType) ?? 0) + 1);
    if (inp.level) {
      const short = inp.level.includes('トップ') || inp.level.includes('競技') ? '上級'
        : inp.level.includes('フィットネス') || inp.level.includes('初心者') || inp.level.includes('一般') ? '初中級'
        : '中級';
      levelMap.set(short, (levelMap.get(short) ?? 0) + 1);
    }
  });

  return NextResponse.json({
    period,
    kpi: {
      totalGenerations: totalGens     ?? 0,
      periodGenerations: periodGens   ?? 0,
      totalUsers:        totalUsers   ?? 0,
      periodUsers:       periodUsers  ?? 0,
    },
    charts: {
      dailyTrend,
      monthlyTrend,
      hourlyDist,
      weekdayDist,
      userRegistrationTrend,
      strokeDist:   Array.from(strokeMap.entries()).sort(([, a], [, b]) => b - a)
                      .map(([name, count]) => ({ name, count })),
      periodDist:   Array.from(periodMap.entries()).sort(([a], [b]) => a.localeCompare(b))
                      .map(([p, count]) => ({ name: PERIOD_LABELS[p] ?? `期${p}`, count })),
      levelDist:    Array.from(levelMap.entries()).map(([name, count]) => ({ name, count })),
      distTypeDist: Array.from(distTypeMap.entries()).map(([name, count]) => ({ name, count })),
    },
  });
}
