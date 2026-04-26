import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@/lib/supabase/server';

const PLAN_BY_PRICE: Record<string, 'basic' | 'standard' | 'pro'> = {
  // price_xxx: 'basic' など、Stripe Price IDを設定後にここに追加
};

function getPlanId(sub: Stripe.Subscription): 'basic' | 'standard' | 'pro' | 'free' {
  const priceId = sub.items.data[0]?.price.id ?? '';
  return PLAN_BY_PRICE[priceId] ?? 'free';
}

export async function POST(req: Request) {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secretKey || !webhookSecret) return new NextResponse('Not configured', { status: 503 });

  const stripe = new Stripe(secretKey);
  const body = await req.text();
  const sig = req.headers.get('stripe-signature') ?? '';

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch {
    return new NextResponse('Webhook signature invalid', { status: 400 });
  }

  const sb = await createClient();
  if (!sb) return new NextResponse('DB error', { status: 500 });

  const syncSubscription = async (sub: Stripe.Subscription) => {
    const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id;
    const { data: profile } = await sb
      .from('profiles')
      .select('id')
      .eq('stripe_customer_id', customerId)
      .single();
    if (!profile) return;

    const periodStart = (sub as unknown as { current_period_start: number }).current_period_start;
    const periodEnd   = (sub as unknown as { current_period_end: number }).current_period_end;

    await sb.from('subscriptions').upsert({
      id: sub.id,
      user_id: profile.id,
      plan_id: getPlanId(sub),
      status: sub.status,
      current_period_start: periodStart ? new Date(periodStart * 1000).toISOString() : null,
      current_period_end:   periodEnd   ? new Date(periodEnd   * 1000).toISOString() : null,
      cancel_at_period_end: sub.cancel_at_period_end,
      canceled_at: sub.canceled_at ? new Date(sub.canceled_at * 1000).toISOString() : null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' });
  };

  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
      await syncSubscription(event.data.object as Stripe.Subscription);
      break;
  }

  return NextResponse.json({ received: true });
}
