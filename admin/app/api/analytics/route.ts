import { NextResponse } from 'next/server';
import { getAdminUser, getServiceRole, createClient } from '@/lib/supabase/server';

export async function GET() {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  // service_role があれば使う（RLS バイパス）、なければ通常クライアント
  const sb = getServiceRole() ?? await createClient();

  // ── 1. 月別生成回数（過去6ヶ月）──
  let monthlyCounts: { month: string; count: number }[] = [];
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  const { data: monthlyLogs } = await sb
    .from('generation_logs')
    .select('created_at')
    .gte('created_at', sixMonthsAgo.toISOString());
  if (monthlyLogs) {
    const map: Record<string, number> = {};
    monthlyLogs.forEach((l: { created_at: string }) => {
      const month = l.created_at.slice(0, 7);
      map[month] = (map[month] ?? 0) + 1;
    });
    monthlyCounts = Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, count]) => ({ month, count }));
  }

  // ── 2. 時間帯別分布（0〜23時）──
  const { data: allLogs } = await sb
    .from('generation_logs')
    .select('created_at');

  const hourlyMap: Record<number, number> = {};
  for (let h = 0; h < 24; h++) hourlyMap[h] = 0;
  (allLogs ?? []).forEach((l: { created_at: string }) => {
    const hour = new Date(l.created_at).getHours();
    hourlyMap[hour] = (hourlyMap[hour] ?? 0) + 1;
  });
  const hourlyDistribution = Object.entries(hourlyMap).map(([hour, count]) => ({
    hour: Number(hour),
    label: `${hour}時`,
    count,
  }));

  // ── 3. ユーザー別利用回数（上位20名）──
  const { data: profiles } = await sb
    .from('profiles')
    .select('id, display_name, total_usage_count, created_at, role')
    .order('total_usage_count', { ascending: false })
    .limit(20);

  type ProfileRow = { id: string; display_name: string | null; total_usage_count: number; created_at: string; role: string };
  const userRanking = (profiles as ProfileRow[] ?? []).map(p => ({
    id: p.id,
    display_name: p.display_name ?? '（未設定）',
    count: p.total_usage_count,
    role: p.role,
    joined: p.created_at,
  }));

  // ── 4. サマリー数値 ──
  const thisMonth = new Date().toISOString().slice(0, 7);
  const thisMonthCount = monthlyCounts.find(m => m.month === thisMonth)?.count ?? 0;
  const totalUsers = profiles?.length ?? 0;
  const totalGenerated = (profiles as ProfileRow[] ?? []).reduce((sum: number, p: ProfileRow) => sum + (p.total_usage_count ?? 0), 0);

  return NextResponse.json({
    summary: { thisMonthCount, totalUsers, totalGenerated },
    monthlyCounts,
    hourlyDistribution,
    userRanking,
  });
}
