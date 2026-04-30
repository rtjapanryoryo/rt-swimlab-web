import { NextResponse } from 'next/server';
import { getEffectiveUser, createClient } from '@/lib/supabase/server';

// PUT /api/admin/drills/reorder  body: { orders: [{id, sort_order},...] }
export async function PUT(req: Request) {
  const user = await getEffectiveUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const sb = await createClient();
  if (!sb) return NextResponse.json({ error: 'DB error' }, { status: 500 });

  const { data: profile } = await sb.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json() as { orders?: { id: string; sort_order: number }[] };
  if (!Array.isArray(body.orders) || body.orders.length === 0) {
    return NextResponse.json({ error: 'orders required' }, { status: 400 });
  }

  const updates = body.orders.map(({ id, sort_order }) => {
    if (typeof id !== 'string' || typeof sort_order !== 'number' || !Number.isFinite(sort_order)) {
      throw new Error('invalid item');
    }
    return { id, sort_order: Math.trunc(sort_order) };
  });

  const errors: string[] = [];
  await Promise.all(
    updates.map(async ({ id, sort_order }) => {
      const { error } = await sb.from('drill_items').update({ sort_order }).eq('id', id);
      if (error) errors.push(`${id}: ${error.message}`);
    })
  );

  if (errors.length > 0) {
    return NextResponse.json({ error: errors.join(', ') }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
