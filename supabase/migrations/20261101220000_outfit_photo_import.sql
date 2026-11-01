begin;
create table if not exists public.outfit_import_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  usage_day date not null,
  requests integer not null check (requests between 1 and 3),
  primary key(user_id, usage_day)
);
alter table public.outfit_import_usage enable row level security;
revoke all on public.outfit_import_usage from public, anon, authenticated;
create or replace function public.consume_outfit_import_quota(p_user_id uuid) returns boolean
language plpgsql security definer set search_path = '' as $$
declare affected integer;
begin
  if p_user_id is null then return false; end if;
  insert into public.outfit_import_usage as usage(user_id, usage_day, requests)
    values(p_user_id, (now() at time zone 'UTC')::date, 1)
    on conflict(user_id, usage_day) do update set requests = usage.requests + 1 where usage.requests < 3;
  get diagnostics affected = row_count;
  return affected = 1;
end $$;
revoke all on function public.consume_outfit_import_quota(uuid) from public, anon, authenticated;
grant execute on function public.consume_outfit_import_quota(uuid) to service_role;

-- Atomic, retry-safe metadata import. Photos/crops never enter this RPC.
create or replace function public.import_outfit_items(p_items jsonb)
returns table(id uuid, user_id uuid, name text, category text, primary_colour text)
language plpgsql security invoker set search_path = '' as $$
declare owner_id uuid := auth.uid(); item jsonb;
begin
  if owner_id is null then raise exception 'Sign in required' using errcode = '42501'; end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' then raise exception 'Invalid import'; end if;
  if jsonb_array_length(p_items) not between 1 and 20 then raise exception 'Invalid import size'; end if;
  if (select count(distinct v->>'client_item_id') from jsonb_array_elements(p_items) v) <> jsonb_array_length(p_items) then raise exception 'Duplicate import keys'; end if;
  for item in select value from jsonb_array_elements(p_items) loop
    if jsonb_typeof(item) <> 'object'
      or jsonb_typeof(item->'client_item_id') is distinct from 'string'
      or jsonb_typeof(item->'name') is distinct from 'string'
      or jsonb_typeof(item->'category') is distinct from 'string'
      or jsonb_typeof(item->'primary_colour') is distinct from 'string'
      or jsonb_typeof(item->'subcategory') is distinct from 'string'
      or item->>'client_item_id' is null or length(item->>'client_item_id') > 600 or item->>'client_item_id' !~ '^photo:[a-f0-9]{64}:'
      or item->>'name' is null or length(btrim(item->>'name')) not between 1 and 100
      or item->>'category' is null or item->>'category' not in ('tops','shirts','knitwear','jackets','bottoms','skirts','dresses','jumpsuits','sets','shoes','accessories','other')
      or item->>'primary_colour' is null or length(item->>'primary_colour') > 40
      or item->>'subcategory' is null or length(item->>'subcategory') > 200 then raise exception 'Invalid garment'; end if;
  end loop;
  insert into public.wardrobe_items(user_id, client_item_id, name, category, primary_colour, subcategory, status)
    select owner_id, v->>'client_item_id', btrim(v->>'name'), v->>'category', v->>'primary_colour', v->>'subcategory', 'available' from jsonb_array_elements(p_items) v
    on conflict on constraint wardrobe_items_user_id_client_item_id_key do nothing;
  return query select w.id, w.user_id, w.name, w.category, w.primary_colour from public.wardrobe_items w
    where w.user_id = owner_id and w.client_item_id in (select v->>'client_item_id' from jsonb_array_elements(p_items) v);
end $$;
revoke all on function public.import_outfit_items(jsonb) from public, anon;
grant execute on function public.import_outfit_items(jsonb) to authenticated;
commit;
