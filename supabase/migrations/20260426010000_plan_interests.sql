-- プラン興味登録テーブル（支払いなし・意向確認のみ）
create table if not exists public.plan_interests (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  plan_id    text not null check (plan_id in ('free', 'basic', 'standard', 'pro')),
  updated_at timestamptz not null default now()
);

alter table public.plan_interests enable row level security;

DROP POLICY IF EXISTS "users_manage_own" ON public.plan_interests;
create policy "users_manage_own" on public.plan_interests
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

DROP POLICY IF EXISTS "admins_select_all" ON public.plan_interests;
create policy "admins_select_all" on public.plan_interests
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );
