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

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const weekAgo   = new Date(now.getTime() - 7  * 24 * 60 * 60 * 1000).toISOString();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [
    { count: totalUsers },
    { count: newUsersMonth },
    { count: totalGens },
    { count: gensMonth },
    { data: dauRows },
    { data: wauRows },
    { data: sourceRows },
    { data: trendRows },
    { data: menuRows },
    { data: topUserRows },
  ] = await Promise.all([
    sb.from('profiles').select('id', { count: 'exact', head: true }),
    sb.from('profiles').select('id', { count: 'exact', head: true }).gte('created_at', monthStart),
    sb.from('generation_logs').select('id', { count: 'exact', head: true }),
    sb.from('generation_logs').select('id', { count: 'exact', head: true }).gte('created_at', monthStart),
    sb.from('generation_logs').select('user_id').gte('created_at', todayStart),
    sb.from('generation_logs').select('user_id').gte('created_at', weekAgo),
    sb.from('menus').select('source'),
    sb.from('generation_logs').select('created_at').gte('created_at', thirtyDaysAgo),
    sb.from('menus').select('input'),
    sb.from('profiles')
      .select('id, display_name, role, total_usage_count, created_at')
      .order('total_usage_count', { ascending: false })
      .limit(20),
  ]);

  // 日別トレンド（過去30日・欠損日を0で埋める）
  const dailyMap = new Map<string, number>();
  (trendRows ?? []).forEach(r => {
    const d = (r.created_at as string).substring(0, 10);
    dailyMap.set(d, (dailyMap.get(d) ?? 0) + 1);
  });
  const dailyTrend = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(now.getTime() - (29 - i) * 24 * 60 * 60 * 1000);
    const key = d.toISOString().substring(0, 10);
    return { date: key.substring(5), count: dailyMap.get(key) ?? 0 };
  });

  const dau = new Set((dauRows ?? []).map(r => r.user_id)).size;
  const wau = new Set((wauRows ?? []).map(r => r.user_id)).size;

  const sourceCounts = { quick: 0, custom: 0 };
  (sourceRows ?? []).forEach(r => {
    if (r.source === 'quick') sourceCounts.quick++;
    else if (r.source === 'custom') sourceCounts.custom++;
  });

  const strokeMap  = new Map<string, number>();
  const periodMap  = new Map<string, number>();
  const levelMap   = new Map<string, number>();
  const distTypeMap = new Map<string, number>();

  const PERIOD_LABELS: Record<string, string> = {
    '1': '①回復', '2': '②基礎', '3': '③発展',
    '4': '④持久', '5': '⑤乳酸', '6': '⑥調整', '7': '⑦テーパー',
  };

  (menuRows ?? []).forEach(r => {
    const inp = r.input as Record<string, string> | null;
    if (!inp) return;
    if (inp.stroke) strokeMap.set(inp.stroke, (strokeMap.get(inp.stroke) ?? 0) + 1);
    if (inp.period) periodMap.set(inp.period, (periodMap.get(inp.period) ?? 0) + 1);
    if (inp.distanceType) distTypeMap.set(inp.distanceType, (distTypeMap.get(inp.distanceType) ?? 0) + 1);
    if (inp.level) {
      const short = inp.level.includes('トップ') || inp.level.includes('競技') ? '上級'
        : inp.level.includes('フィットネス') || inp.level.includes('初心者') ? '初級' : '中級';
      levelMap.set(short, (levelMap.get(short) ?? 0) + 1);
    }
  });

  // ユーザーごとの最終利用日
  const userIds = (topUserRows ?? []).map(u => u.id);
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
      totalUsers:        totalUsers       ?? 0,
      newUsersMonth:     newUsersMonth    ?? 0,
      totalGenerations:  totalGens        ?? 0,
      generationsMonth:  gensMonth        ?? 0,
      dau,
      wau,
      quickCount:  sourceCounts.quick,
      customCount: sourceCounts.custom,
    },
    charts: {
      dailyTrend,
      strokeDist:   Array.from(strokeMap.entries()).sort(([,a],[,b]) => b - a)
                      .map(([name, count]) => ({ name, count })),
      periodDist:   Array.from(periodMap.entries()).sort(([a],[b]) => a.localeCompare(b))
                      .map(([p, count]) => ({ name: PERIOD_LABELS[p] ?? `期${p}`, count })),
      levelDist:    Array.from(levelMap.entries()).map(([name, count]) => ({ name, count })),
      distTypeDist: Array.from(distTypeMap.entries()).map(([name, count]) => ({ name, count })),
    },
    users: (topUserRows ?? []).map(u => ({
      id:                  u.id,
      display_name:        u.display_name,
      role:                u.role,
      total_usage_count:   u.total_usage_count,
      created_at:          u.created_at,
      last_active:         lastActiveMap.get(u.id) ?? null,
    })),
  });
}
