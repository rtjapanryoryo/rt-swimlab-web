-- カウンセリング申し込みテーブル
-- user_id は profiles(id) を参照することで PostgREST の JOIN を有効化
create table if not exists public.counseling_requests (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references public.profiles(id) on delete cascade,
  plan_type             text not null check (plan_type in ('free', 'athlete', 'coach')),
  preferred_datetime_1  text not null,
  preferred_datetime_2  text,
  preferred_datetime_3  text,
  message               text,
  status                text not null default 'pending'
                          check (status in ('pending', 'confirmed', 'completed', 'cancelled')),
  admin_note            text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- RLS
alter table public.counseling_requests enable row level security;

-- ユーザーは自分の申し込みのみ参照・作成可
DROP POLICY IF EXISTS "users_select_own" ON public.counseling_requests;
create policy "users_select_own" on public.counseling_requests
  for select using (auth.uid() = user_id);

DROP POLICY IF EXISTS "users_insert_own" ON public.counseling_requests;
create policy "users_insert_own" on public.counseling_requests
  for insert with check (auth.uid() = user_id);

-- 管理者は全件参照・更新可
DROP POLICY IF EXISTS "admins_all" ON public.counseling_requests;
create policy "admins_all" on public.counseling_requests
  for all using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- updated_at 自動更新トリガー
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists counseling_requests_updated_at on public.counseling_requests;
create trigger counseling_requests_updated_at
  before update on public.counseling_requests
  for each row execute function public.set_updated_at();
