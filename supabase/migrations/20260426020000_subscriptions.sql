-- Stripeサブスクリプション管理テーブル

alter table public.profiles
  add column if not exists stripe_customer_id text;

create table if not exists public.subscriptions (
  id                   text primary key,           -- stripe subscription id
  user_id              uuid not null references auth.users(id) on delete cascade,
  plan_id              text not null check (plan_id in ('free', 'basic', 'standard', 'pro')),
  status               text not null,              -- active | canceled | past_due | trialing | incomplete
  current_period_start timestamptz,
  current_period_end   timestamptz,
  cancel_at_period_end boolean not null default false,
  canceled_at          timestamptz,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

alter table public.subscriptions enable row level security;

DROP POLICY IF EXISTS "users_read_own" ON public.subscriptions;
create policy "users_read_own" on public.subscriptions
  for select using (auth.uid() = user_id);

DROP POLICY IF EXISTS "admins_read_all" ON public.subscriptions;
create policy "admins_read_all" on public.subscriptions
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

DROP POLICY IF EXISTS "service_role_all" ON public.subscriptions;
create policy "service_role_all" on public.subscriptions
  for all using (true);
