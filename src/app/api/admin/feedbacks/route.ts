import { NextResponse } from 'next/server';
import { getEffectiveUser } from '@/lib/supabase/server';
import { getSupabaseServiceRole } from '@/lib/supabase/admin';
import type { FeedbackCategory, FeedbackStatus } from '@/types/feedback';

// GET /api/admin/feedbacks?status=pending&category=bug&limit=50&offset=0
export async function GET(req: Request) {
  const user = await getEffectiveUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const sb = getSupabaseServiceRole();
  if (!sb) return NextResponse.json({ error: 'DB error' }, { status: 500 });

  // 管理者ロール確認
  const { data: profile } = await sb
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const status   = searchParams.get('status')   as FeedbackStatus | null;
  const category = searchParams.get('category') as FeedbackCategory | null;
  const limit    = Math.min(Number(searchParams.get('limit') ?? 100), 200);
  const offset   = Number(searchParams.get('offset') ?? 0);

  let query = sb
    .from('feedbacks')
    .select('*, profiles(display_name)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (status)   query = query.eq('status', status);
  if (category) query = query.eq('category', category);

  const { data: feedbacks, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // 集計データ
  // stats は将来拡張用（RPC未定義のため省略）
  const stats = null;

  // カテゴリ別件数
  const { data: catCounts } = await sb
    .from('feedbacks')
    .select('category')
    .then(({ data }) => ({
      data: data
        ? Object.entries(
            data.reduce((acc: Record<string, number>, r) => {
              acc[r.category] = (acc[r.category] ?? 0) + 1;
              return acc;
            }, {})
          ).map(([name, count]) => ({ name, count }))
        : [],
    }));

  // ステータス別件数
  const { data: statusRaw } = await sb
    .from('feedbacks')
    .select('status');
  const statusCounts = statusRaw
    ? Object.entries(
        statusRaw.reduce((acc: Record<string, number>, r) => {
          acc[r.status] = (acc[r.status] ?? 0) + 1;
          return acc;
        }, {})
      ).map(([name, count]) => ({ name, count }))
    : [];

  // 過去30日のトレンド
  const since = new Date();
  since.setDate(since.getDate() - 29);
  const { data: trendRaw } = await sb
    .from('feedbacks')
    .select('created_at')
    .gte('created_at', since.toISOString());

  const trendMap: Record<string, number> = {};
  for (let i = 0; i < 30; i++) {
    const d = new Date(since);
    d.setDate(d.getDate() + i);
    trendMap[d.toISOString().slice(0, 10)] = 0;
  }
  (trendRaw ?? []).forEach(r => {
    const day = r.created_at.slice(0, 10);
    if (day in trendMap) trendMap[day]++;
  });
  const trend = Object.entries(trendMap).map(([date, count]) => ({ date, count }));

  return NextResponse.json({
    feedbacks,
    total: count ?? 0,
    charts: { catCounts, statusCounts, trend },
    stats,
  });
}
