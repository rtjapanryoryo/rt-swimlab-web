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

  // admin を除外するため先にIDを取得
  const { data: adminRows } = await sb.from('profiles').select('id').eq('role', 'admin');
  const adminIds = (adminRows ?? []).map(r => r.id);
  const adminFilter = adminIds.length > 0 ? `(${adminIds.join(',')})` : null;

  const now = new Date();
  const monthStart        = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const prevMonthStart    = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
  const weekAgo           = new Date(now.getTime() -  7 * 24 * 60 * 60 * 1000).toISOString();
  const todayStart        = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const thirtyDaysAgo     = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const twelveMonthsAgo   = new Date(now.getFullYear(), now.getMonth() - 11, 1).toISOString();

  const pf  = () => sb.from('profiles').select('id', { count: 'exact', head: true }).neq('role', 'admin');
  const gl  = (col = 'user_id') => {
    const q = sb.from('generation_logs').select(col);
    return adminFilter ? q.not('user_id', 'in', adminFilter) : q;
  };
  const glCount = () => {
    const q = sb.from('generation_logs').select('id', { count: 'exact', head: true });
    return adminFilter ? q.not('user_id', 'in', adminFilter) : q;
  };

  const [
    { count: totalUsers },
    { count: newUsersMonth },
    { count: newUsersPrevMonth },
    { count: totalGens },
    { count: gensMonth },
    { count: gensPrevMonth },
    { data: dauRows },
    { data: wauRows },
    { data: mauRows },
    { data: sourceRows },
    { data: trendRows },
    { data: monthlyRows },
    { data: menuRows },
    { count: activePlans },
    { count: sessionLogs },
    { count: feedbackTotal },
    { count: feedbackPending },
  ] = await Promise.all([
    pf(),
    pf().gte('created_at', monthStart),
    pf().gte('created_at', prevMonthStart).lt('created_at', monthStart),
    glCount(),
    glCount().gte('created_at', monthStart),
    glCount().gte('created_at', prevMonthStart).lt('created_at', monthStart),
    gl().gte('created_at', todayStart),
    gl().gte('created_at', weekAgo),
    gl().gte('created_at', thirtyDaysAgo),
    sb.from('menus').select('source'),
    gl('created_at').gte('created_at', thirtyDaysAgo),
    gl('created_at').gte('created_at', twelveMonthsAgo),
    sb.from('menus').select('input'),
    sb.from('training_plans').select('id', { count: 'exact', head: true }),
    sb.from('training_sessions').select('id', { count: 'exact', head: true }).eq('status', 'done'),
    sb.from('feedbacks').select('id', { count: 'exact', head: true }),
    sb.from('feedbacks').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
  ]);

  // ── DAU / WAU / MAU ───────────────────────────────────────────────────────
  const toUids = (rows: unknown) => (rows as Array<{ user_id: string }> ?? []).map(r => r.user_id);
  const dau = new Set(toUids(dauRows)).size;
  const wau = new Set(toUids(wauRows)).size;
  const mau = new Set(toUids(mauRows)).size;

  // ── MoM 成長率 ───────────────────────────────────────────────────────────
  const newUsersMoMPct = (newUsersPrevMonth ?? 0) > 0
    ? Math.round((((newUsersMonth ?? 0) - (newUsersPrevMonth ?? 0)) / (newUsersPrevMonth ?? 0)) * 100)
    : null;
  const gensMoMPct = (gensPrevMonth ?? 0) > 0
    ? Math.round((((gensMonth ?? 0) - (gensPrevMonth ?? 0)) / (gensPrevMonth ?? 0)) * 100)
    : null;

  // ── Avg generations per MAU ──────────────────────────────────────────────
  const avgGensPerMau = mau > 0 && (gensMonth ?? 0) > 0
    ? Math.round(((gensMonth ?? 0) / mau) * 10) / 10
    : 0;

  // ── Quick vs Custom ──────────────────────────────────────────────────────
  const sourceCounts = { quick: 0, custom: 0 };
  (sourceRows ?? []).forEach(r => {
    if (r.source === 'quick') sourceCounts.quick++;
    else if (r.source === 'custom') sourceCounts.custom++;
  });

  // ── チャート集計 ─────────────────────────────────────────────────────────
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

  // ── 日別トレンド（30日・欠損0埋め）────────────────────────────────────
  const allRows = (trendRows as unknown as Array<{ created_at: string }> ?? []);
  const dailyMap = new Map<string, number>();
  allRows.forEach(r => {
    const d = r.created_at.substring(0, 10);
    dailyMap.set(d, (dailyMap.get(d) ?? 0) + 1);
  });
  const dailyTrend = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(now.getTime() - (29 - i) * 24 * 60 * 60 * 1000);
    const key = d.toISOString().substring(0, 10);
    return { date: key.substring(5), count: dailyMap.get(key) ?? 0 };
  });

  // ── 曜日別・時間帯別（過去30日）────────────────────────────────────────
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

  // ── 月間推移（過去12ヶ月）────────────────────────────────────────────
  const monthlyMapData: Record<string, number> = {};
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    monthlyMapData[key] = 0;
  }
  (monthlyRows as unknown as Array<{ created_at: string }> ?? []).forEach(r => {
    const key = r.created_at.substring(0, 7);
    if (key in monthlyMapData) monthlyMapData[key]++;
  });
  const monthlyTrend = Object.entries(monthlyMapData).map(([month, count]) => ({
    month: `${Number(month.substring(5))}月`,
    count,
  }));

  // ── ユーザーテーブル ─────────────────────────────────────────────────────
  const { data: topUsersWithName } = await sb
    .from('profiles')
    .select('id, display_name, role, total_usage_count, created_at')
    .neq('role', 'admin')
    .order('total_usage_count', { ascending: false })
    .limit(20);

  const userIds = (topUsersWithName ?? []).map(u => u.id);
  const { data: lastActiveLogs } = userIds.length > 0
    ? await sb.from('generation_logs')
        .select('user_id, created_at')
        .in('user_id', userIds)
        .order('created_at', { ascending: false })
    : { data: [] as { user_id: string; created_at: string }[] };

  const lastActiveMap = new Map<string, string>();
  (lastActiveLogs ?? []).forEach(r => {
    if (!lastActiveMap.has(r.user_id)) lastActiveMap.set(r.user_id, r.created_at);
  });

  return NextResponse.json({
    kpi: {
      totalUsers:        totalUsers      ?? 0,
      newUsersMonth:     newUsersMonth   ?? 0,
      newUsersMoMPct,
      totalGenerations:  totalGens       ?? 0,
      generationsMonth:  gensMonth       ?? 0,
      gensMoMPct,
      dau,
      wau,
      mau,
      avgGensPerMau,
      quickCount:  sourceCounts.quick,
      customCount: sourceCounts.custom,
      activePlans:     activePlans    ?? 0,
      sessionLogs:     sessionLogs    ?? 0,
      feedbackTotal:   feedbackTotal  ?? 0,
      feedbackPending: feedbackPending ?? 0,
    },
    charts: {
      dailyTrend,
      monthlyTrend,
      hourlyDist,
      weekdayDist,
      strokeDist:   Array.from(strokeMap.entries()).sort(([, a], [, b]) => b - a)
                      .map(([name, count]) => ({ name, count })),
      periodDist:   Array.from(periodMap.entries()).sort(([a], [b]) => a.localeCompare(b))
                      .map(([p, count]) => ({ name: PERIOD_LABELS[p] ?? `期${p}`, count })),
      levelDist:    Array.from(levelMap.entries()).map(([name, count]) => ({ name, count })),
      distTypeDist: Array.from(distTypeMap.entries()).map(([name, count]) => ({ name, count })),
    },
    users: (topUsersWithName ?? []).map(u => ({
      id:                u.id,
      display_name:      u.display_name,
      role:              u.role,
      total_usage_count: u.total_usage_count,
      created_at:        u.created_at,
      last_active:       lastActiveMap.get(u.id) ?? null,
    })),
  });
}
