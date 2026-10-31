\set ON_ERROR_STOP on
-- Run only after the isolated test_outfit_chat_rls.sql harness.
create role anon nologin;
create role service_role nologin;
\ir ../supabase/migrations/20261031160000_outfit_visual_quota.sql
\ir ../supabase/migrations/20261031160000_outfit_visual_quota.sql
set role authenticated;
do $$ begin
  begin
    perform public.consume_outfit_visual_quota('00000000-0000-4000-8000-000000000001','search');
    raise exception 'Client bypassed server-only quota';
  exception when insufficient_privilege then null; end;
  begin
    perform count(*) from public.outfit_visual_usage;
    raise exception 'Usage records exposed to client';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
set role service_role;
do $$ begin
  for i in 1..5 loop
    if not public.consume_outfit_visual_quota('00000000-0000-4000-8000-000000000001','search') then raise exception 'Valid search allowance denied'; end if;
  end loop;
  if public.consume_outfit_visual_quota('00000000-0000-4000-8000-000000000001','search') then raise exception 'Search allowance exceeded'; end if;
  for i in 1..25 loop
    if not public.consume_outfit_visual_quota('00000000-0000-4000-8000-000000000001','render') then raise exception 'Valid image allowance denied'; end if;
  end loop;
  if public.consume_outfit_visual_quota('00000000-0000-4000-8000-000000000001','render') then raise exception 'Image allowance exceeded'; end if;
  if not public.consume_outfit_visual_quota('00000000-0000-4000-8000-000000000002','search') then raise exception 'Independent user allowance denied'; end if;
end $$;
reset role;
select 'PASS: durable per-user search/image limits and server-only permission boundary' as result;
