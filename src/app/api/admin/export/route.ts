import { NextRequest, NextResponse } from 'next/server';
import { getEffectiveUser, createClient } from '@/lib/supabase/server';
import { getSupabaseServiceRole } from '@/lib/supabase/admin';

function toCSV(rows: (string | number | null | undefined)[][]): string {
  const escape = (v: string | number | null | undefined) =>
    `"${String(v ?? '').replace(/"/g, '""')}"`;
  return '\uFEFF' + rows.map(r => r.map(escape).join(',')).join('\n');
}

export async function GET(request: NextRequest) {
  const user = await getEffectiveUser();
  if (!user) return NextResponse.json({ error: 'login_required' }, { status: 401 });

  const authSb = user.isBypass ? getSupabaseServiceRole() : await createClient();
  if (!authSb) return NextResponse.json({ error: 'not_configured' }, { status: 503 });

  const { data: me } = await authSb.from('profiles').select('role').eq('id', user.id).single();
  if (me?.role !== 'admin') return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const sb = getSupabaseServiceRole() ?? authSb;
  const type = new URL(request.url).searchParams.get('type') ?? 'customers';

  const now = new Date();
  const fmtDate = (s: string | null) =>
    s ? new Date(s).toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '';

  if (type === 'customers') {
    const { data: profiles } = await sb
      .from('profiles')
      .select('id, display_name, role, total_usage_count, created_at')
      .order('total_usage_count', { ascending: false });

    const userIds = (profiles ?? []).map(p => p.id);
    if (userIds.length === 0) {
      const header = ['名前', '役割', 'プラン', '月額(円)', '累計利用', 'Quick', 'Custom', '週間頻度', '登録日', '最終利用日'];
      const csv = toCSV([header]);
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="customers_${now.toISOString().substring(0, 10)}.csv"`,
        },
      });
    }
    const [{ data: allLogs }, { data: menuRows }] = await Promise.all([
      sb.from('generation_logs').select('user_id, created_at').in('user_id', userIds).order('created_at', { ascending: false }),
      sb.from('menus').select('user_id, source').in('user_id', userIds),
    ]);
    let subRows: { user_id: string; plan: string; price_monthly: number; started_at: string }[] | null = null;
    const subRes = await sb
      .from('subscriptions')
      .select('user_id, plan, price_monthly, started_at')
      .in('user_id', userIds);
    if (!subRes.error && subRes.data) subRows = subRes.data;

    const lastActive = new Map<string, string>();
    (allLogs ?? []).forEach(r => { if (!lastActive.has(r.user_id)) lastActive.set(r.user_id, r.created_at); });

    const quickCount  = new Map<string, number>();
    const customCount = new Map<string, number>();
    (menuRows ?? []).forEach(r => {
      if (r.source === 'quick')  quickCount.set(r.user_id,  (quickCount.get(r.user_id)  ?? 0) + 1);
      if (r.source === 'custom') customCount.set(r.user_id, (customCount.get(r.user_id) ?? 0) + 1);
    });

    const subMap = new Map<string, { plan: string; price_monthly: number; started_at: string }>();
    (subRows ?? []).forEach((r: { user_id: string; plan: string; price_monthly: number; started_at: string }) => subMap.set(r.user_id, r));

    const header = ['名前', '役割', 'プラン', '月額(円)', '累計利用', 'Quick', 'Custom', '週間頻度', '登録日', '最終利用日'];
    const rows = (profiles ?? []).map(p => {
      const days = Math.max(1, Math.floor((now.getTime() - new Date(p.created_at).getTime()) / 86400000));
      const freq = (p.total_usage_count / (days / 7)).toFixed(1);
      const sub = subMap.get(p.id);
      return [
        p.display_name ?? '',
        p.role,
        sub?.plan ?? 'free',
        sub?.price_monthly ?? 0,
        p.total_usage_count,
        quickCount.get(p.id)  ?? 0,
        customCount.get(p.id) ?? 0,
        freq,
        fmtDate(p.created_at),
        fmtDate(lastActive.get(p.id) ?? null),
      ];
    });

    const csv = toCSV([header, ...rows]);
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="customers_${now.toISOString().substring(0,10)}.csv"`,
      },
    });
  }

  if (type === 'logs') {
    const { data: logs } = await sb
      .from('generation_logs')
      .select('user_id, content_details, created_at')
      .order('created_at', { ascending: false })
      .limit(5000);

    const { data: profiles } = await sb.from('profiles').select('id, display_name');
    const nameMap = new Map((profiles ?? []).map(p => [p.id, p.display_name ?? '']));

    const header = ['日時', 'ユーザー名', 'アクション'];
    const rows = (logs ?? []).map(l => [
      fmtDate(l.created_at),
      nameMap.get(l.user_id) ?? l.user_id,
      l.content_details,
    ]);

    const csv = toCSV([header, ...rows]);
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="logs_${now.toISOString().substring(0,10)}.csv"`,
      },
    });
  }

  if (type === 'revenue') {
    let subs: Array<{ user_id: string; plan: string; status: string; price_monthly: number; started_at: string; cancelled_at: string | null }> = [];
    try {
      const { data } = await sb.from('subscriptions').select('*').order('created_at', { ascending: false });
      subs = data ?? [];
    } catch { /* テーブル未作成 */ }

    const { data: profiles } = await sb.from('profiles').select('id, display_name');
    const nameMap = new Map((profiles ?? []).map(p => [p.id, p.display_name ?? '']));

    const header = ['ユーザー名', 'プラン', 'ステータス', '月額(円)', '開始日', 'キャンセル日'];
    const rows = subs.map(s => [
      nameMap.get(s.user_id) ?? s.user_id,
      s.plan,
      s.status,
      s.price_monthly,
      fmtDate(s.started_at),
      fmtDate(s.cancelled_at),
    ]);

    const csv = toCSV([header, ...rows]);
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="revenue_${now.toISOString().substring(0,10)}.csv"`,
      },
    });
  }

  return NextResponse.json({ error: 'invalid type' }, { status: 400 });
}
