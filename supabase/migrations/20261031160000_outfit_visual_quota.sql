-- Server-only allowance: 5 searches and 25 mannequin boards per user per UTC day.
begin;
create table if not exists public.outfit_visual_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  usage_day date not null,
  searches integer not null default 0,
  renders integer not null default 0,
  primary key (user_id, usage_day)
);
alter table public.outfit_visual_usage enable row level security;
revoke all on public.outfit_visual_usage from public, anon, authenticated;
create or replace function public.consume_outfit_visual_quota(p_user_id uuid, p_kind text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare accepted boolean;
begin
  if p_kind is null or p_kind not in ('search','render') or p_user_id is null then raise exception 'Invalid quota request'; end if;
  insert into public.outfit_visual_usage(user_id, usage_day, searches, renders)
  values (p_user_id, (now() at time zone 'UTC')::date, case when p_kind='search' then 1 else 0 end, case when p_kind='render' then 1 else 0 end)
  on conflict (user_id, usage_day) do update
    set searches = public.outfit_visual_usage.searches + case when p_kind='search' then 1 else 0 end,
        renders = public.outfit_visual_usage.renders + case when p_kind='render' then 1 else 0 end
    where (p_kind='search' and public.outfit_visual_usage.searches < 5)
       or (p_kind='render' and public.outfit_visual_usage.renders < 25)
  returning true into accepted;
  return coalesce(accepted, false);
end;
$$;
revoke all on function public.consume_outfit_visual_quota(uuid,text) from public, anon, authenticated;
grant execute on function public.consume_outfit_visual_quota(uuid,text) to service_role;
commit;
