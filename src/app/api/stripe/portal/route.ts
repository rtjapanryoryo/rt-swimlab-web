import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient, getEffectiveUser } from '@/lib/supabase/server';

export async function POST(req: Request) {
  const user = await getEffectiveUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 });

  const stripe = new Stripe(secretKey);
  const sb = await createClient();
  if (!sb) return NextResponse.json({ error: 'DB error' }, { status: 500 });

  const { return_url } = await req.json() as { return_url?: string };
  const returnUrl = return_url ?? `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://rt-swimlab-web-tl3a.vercel.app'}/mypage/settings`;

  // stripe_customer_id を取得 or 作成
  const { data: profile } = await sb
    .from('profiles')
    .select('stripe_customer_id, display_name')
    .eq('id', user.id)
    .single();

  let customerId = profile?.stripe_customer_id as string | null;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email ?? undefined,
      name: profile?.display_name ?? undefined,
      metadata: { supabase_user_id: user.id },
    });
    customerId = customer.id;
    await sb.from('profiles').update({ stripe_customer_id: customerId }).eq('id', user.id);
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });

  return NextResponse.json({ url: session.url });
}
