-- counseling_requests の FK を auth.users から profiles に変更
-- PostgREST が profiles(display_name) の JOIN を解決できるようにする
-- テーブルが既に存在する場合の修正用

do $$
begin
  -- 既存の FK を削除して profiles を参照する FK に付け替える
  if exists (
    select 1 from information_schema.table_constraints
    where table_name = 'counseling_requests'
    and constraint_type = 'FOREIGN KEY'
    and constraint_name like '%user_id%'
  ) then
    alter table public.counseling_requests
      drop constraint if exists counseling_requests_user_id_fkey;

    alter table public.counseling_requests
      add constraint counseling_requests_user_id_fkey
      foreign key (user_id) references public.profiles(id) on delete cascade;
  end if;
end $$;
