import { NextResponse } from 'next/server';
import { createClient, getEffectiveUser } from '@/lib/supabase/server';

const VALID_PLANS = ['free', 'basic', 'standard', 'pro'] as const;
type PlanId = typeof VALID_PLANS[number];

// POST: プラン興味登録（支払いなし・意向確認のみ）
export async function POST(req: Request) {
  const user = await getEffectiveUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const sb = await createClient();
  if (!sb) return NextResponse.json({ error: 'DB error' }, { status: 500 });

  const { plan_id } = await req.json() as { plan_id: PlanId };
  if (!plan_id || !VALID_PLANS.includes(plan_id)) {
    return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
  }

  // upsert: 1ユーザーにつき最新の選択1件を保持
  const { error } = await sb
    .from('plan_interests')
    .upsert({ user_id: user.id, plan_id, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// GET: 管理者用 - プラン別興味集計
export async function GET() {
  const user = await getEffectiveUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const sb = await createClient();
  if (!sb) return NextResponse.json({ error: 'DB error' }, { status: 500 });

  const { data: profile } = await sb.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { data, error } = await sb
    .from('plan_interests')
    .select('plan_id, updated_at, profiles(display_name)')
    .order('updated_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ interests: data });
}
