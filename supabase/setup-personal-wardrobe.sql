-- Static Threads personal wardrobe setup. Run in your Supabase project SQL Editor.
-- Creates private per-account tables/functions/bucket. No provider activation or credentials.

-- Source: supabase/schema.sql
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.wardrobe_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_item_id text,
  name text not null,
  brand text,
  category text not null,
  subcategory text,
  size text,
  fit text,
  primary_colour text,
  secondary_colours text[] not null default '{}',
  pattern text,
  material text,
  seasons text[] not null default '{}',
  occasions text[] not null default '{}',
  image_url text,
  status text not null default 'available',
  wear_count integer not null default 0,
  last_worn_date date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, client_item_id)
);

create table if not exists public.outfit_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  occasion text,
  item_ids uuid[] not null default '{}',
  action text not null check (action in ('recommended','worn','liked','disliked','saved')),
  feedback text,
  created_at timestamptz not null default now()
);

create table if not exists public.purchase_checks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  retailer text not null,
  product_name text not null,
  product_url text,
  price_eur numeric,
  wardrobe_fit integer,
  utility_score integer,
  duplicate_risk integer,
  estimated_new_outfits integer,
  verdict text check (verdict in ('BUY','WAIT','SKIP')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.wardrobe_items enable row level security;
alter table public.outfit_events enable row level security;
alter table public.purchase_checks enable row level security;

drop policy if exists "profiles own rows" on public.profiles;
create policy "profiles own rows" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "wardrobe own rows" on public.wardrobe_items;
create policy "wardrobe own rows" on public.wardrobe_items
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "outfit events own rows" on public.outfit_events;
create policy "outfit events own rows" on public.outfit_events
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "purchase checks own rows" on public.purchase_checks;
create policy "purchase checks own rows" on public.purchase_checks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Require owned garment references for saved/worn outfit records.
-- Apply after schema.sql on an existing Supabase project. No service-role key in the app.
begin;
drop policy if exists "outfit event item ownership" on public.outfit_events;
create policy "outfit event item ownership" on public.outfit_events
  as restrictive for all to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and cardinality(item_ids) between 1 and 20
    and not exists (
      select 1 from unnest(item_ids) as selected(item_id)
      where not exists (
        select 1 from public.wardrobe_items as wardrobe
        where wardrobe.id = selected.item_id
          and wardrobe.user_id = (select auth.uid())
      )
    )
  );
commit;

-- Source: supabase/migrations/20261031160000_outfit_visual_quota.sql
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

-- Source: supabase/migrations/20261101220000_outfit_photo_import.sql
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

-- Source: supabase/migrations/20261104110000_personal_wardrobe.sql
begin;
alter table public.wardrobe_items add column if not exists revision integer not null default 1;
alter table public.wardrobe_items add column if not exists deleted_at timestamptz;
alter table public.wardrobe_items add column if not exists photo_id uuid;
create index if not exists wardrobe_owner_created on public.wardrobe_items(user_id, created_at desc, id);
create table if not exists public.wardrobe_photos (
  id uuid primary key,
  item_id uuid not null references public.wardrobe_items(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  path text not null unique,
  state text not null default 'staged' check (state in ('staged','current','removing')),
  created_at timestamptz not null default now(),
  check (path = user_id::text || '/' || item_id::text || '/' || id::text || '.jpg')
);
create index if not exists wardrobe_photos_owner_item on public.wardrobe_photos(user_id, item_id);
alter table public.wardrobe_photos enable row level security;
drop policy if exists "wardrobe photos owner reads" on public.wardrobe_photos;
create policy "wardrobe photos owner reads" on public.wardrobe_photos for select to authenticated using (user_id = (select auth.uid()));
revoke all on public.wardrobe_photos from public, anon, authenticated;
grant select on public.wardrobe_photos to authenticated;
-- Keep metadata-only imports compatible, but require RPCs for lifecycle changes.
revoke all on public.wardrobe_items from public, anon, authenticated;
grant select on public.wardrobe_items to authenticated;
grant insert (id,user_id,client_item_id,name,brand,category,subcategory,size,fit,primary_colour,secondary_colours,pattern,material,seasons,occasions,image_url,status,wear_count,last_worn_date,notes) on public.wardrobe_items to authenticated;

create or replace function public.save_wardrobe_item(p_id uuid, p_revision integer, p_item jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare w public.wardrobe_items; v text; allowed text[] := array['casual','smart-casual','office','formal','sport','travel','black-tie'];
begin
  if auth.uid() is null then raise exception 'Sign in required' using errcode='42501'; end if;
  if p_id is null or p_revision is null or p_revision<0 or p_item is null or jsonb_typeof(p_item) <> 'object' then raise exception 'Invalid item'; end if;
  foreach v in array array['name','category','brand','subcategory','size','fit','primary_colour','material','notes','status'] loop
    if jsonb_typeof(p_item->v) is distinct from 'string' or length(p_item->>v) > (case when v='notes' then 1000 when v='subcategory' then 200 else 100 end) then raise exception 'Invalid item field'; end if;
  end loop;
  if length(btrim(p_item->>'name')) < 1 or p_item->>'category' not in ('tops','shirts','knitwear','jackets','bottoms','trousers','jeans','shorts','skirts','dresses','jumpsuits','sets','shoes','accessories','other') or p_item->>'status' not in ('available','laundry','repair','stored') or p_item->>'fit' not in ('slim','regular','relaxed','oversized','unknown') then raise exception 'Invalid garment'; end if;
  if jsonb_typeof(p_item->'occasions') is distinct from 'array' then raise exception 'Invalid occasions'; end if;
  if jsonb_array_length(p_item->'occasions') > 7 or exists(select 1 from jsonb_array_elements(p_item->'occasions') e where jsonb_typeof(e)<>'string' or not (e#>>'{}'=any(allowed))) then raise exception 'Invalid occasions'; end if;
  select * into w from public.wardrobe_items where id=p_id and user_id=auth.uid() for update;
  if found then
    if w.deleted_at is not null or w.revision is distinct from p_revision then raise exception 'This item changed. Reload before editing.' using errcode='40001'; end if;
    update public.wardrobe_items set name=btrim(p_item->>'name'), category=p_item->>'category', brand=p_item->>'brand', subcategory=p_item->>'subcategory', size=p_item->>'size', fit=p_item->>'fit', primary_colour=p_item->>'primary_colour', material=p_item->>'material', notes=p_item->>'notes', status=p_item->>'status', occasions=array(select jsonb_array_elements_text(p_item->'occasions')), revision=revision+1, updated_at=now() where id=p_id returning * into w;
  else
    if p_revision <> 0 then raise exception 'Item unavailable' using errcode='40001'; end if;
    insert into public.wardrobe_items(id,user_id,name,category,brand,subcategory,size,fit,primary_colour,material,notes,status,occasions) values(p_id,auth.uid(),btrim(p_item->>'name'),p_item->>'category',p_item->>'brand',p_item->>'subcategory',p_item->>'size',p_item->>'fit',p_item->>'primary_colour',p_item->>'material',p_item->>'notes',p_item->>'status',array(select jsonb_array_elements_text(p_item->'occasions'))) returning * into w;
  end if;
  return to_jsonb(w);
end $$;

create or replace function public.wardrobe_photo_action(p_item_id uuid, p_photo_id uuid, p_revision integer, p_action text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare w public.wardrobe_items; ph public.wardrobe_photos;
begin
  if auth.uid() is null then raise exception 'Sign in required' using errcode='42501'; end if;
  select * into w from public.wardrobe_items where id=p_item_id and user_id=auth.uid() for update;
  if not found then raise exception 'Item unavailable' using errcode='42501'; end if;
  if p_action='stage' then
    if w.deleted_at is not null or w.revision is distinct from p_revision or p_photo_id is null then raise exception 'Reload item before uploading' using errcode='40001'; end if;
    if (select count(*) from public.wardrobe_photos where item_id=p_item_id) >= 5 then raise exception 'Clean up pending photos before uploading'; end if;
    insert into public.wardrobe_photos(id,item_id,user_id,path) values(p_photo_id,p_item_id,auth.uid(),auth.uid()::text||'/'||p_item_id::text||'/'||p_photo_id::text||'.jpg');
    select * into ph from public.wardrobe_photos where id=p_photo_id;
    return to_jsonb(ph);
  end if;
  select * into ph from public.wardrobe_photos where id=p_photo_id and item_id=p_item_id and user_id=auth.uid() for update;
  if not found then raise exception 'Photo unavailable' using errcode='42501'; end if;
  if p_action='attach' then
    if w.deleted_at is not null or w.revision is distinct from p_revision or ph.state<>'staged' then raise exception 'Reload item before attaching' using errcode='40001'; end if;
    if not exists(select 1 from storage.objects where bucket_id='wardrobe-private' and name=ph.path) then raise exception 'Photo upload incomplete'; end if;
    update public.wardrobe_photos set state='removing' where item_id=p_item_id and state='current';
    update public.wardrobe_photos set state='current' where id=p_photo_id;
    update public.wardrobe_items set photo_id=p_photo_id, revision=revision+1, updated_at=now() where id=p_item_id returning * into w;
  elsif p_action='remove' then
    if ph.state='current' then
      if w.deleted_at is null and w.revision is distinct from p_revision then raise exception 'Reload item before removing' using errcode='40001'; end if;
      update public.wardrobe_items set photo_id=null, revision=revision+1, updated_at=now() where id=p_item_id returning * into w;
    end if;
    update public.wardrobe_photos set state='removing' where id=p_photo_id;
  elsif p_action='finish' then
    if ph.state<>'removing' or exists(select 1 from storage.objects where bucket_id='wardrobe-private' and name=ph.path) then raise exception 'Photo deletion incomplete'; end if;
    delete from public.wardrobe_photos where id=p_photo_id;
  else raise exception 'Unknown photo action'; end if;
  return to_jsonb(w);
end $$;

create or replace function public.delete_wardrobe_item(p_id uuid, p_revision integer, p_finish boolean default false) returns boolean
language plpgsql security definer set search_path = '' as $$
declare w public.wardrobe_items;
begin
  if auth.uid() is null then raise exception 'Sign in required' using errcode='42501'; end if;
  select * into w from public.wardrobe_items where id=p_id and user_id=auth.uid() for update;
  if not found then return true; end if;
  if p_finish then
    if w.deleted_at is null or exists(select 1 from public.wardrobe_photos where item_id=p_id) or exists(select 1 from storage.objects where bucket_id='wardrobe-private' and name like auth.uid()::text||'/'||p_id::text||'/%') then raise exception 'Photo deletion still pending'; end if;
    delete from public.wardrobe_items where id=p_id;
  elsif w.deleted_at is null then
    if w.revision is distinct from p_revision then raise exception 'Reload item before deleting' using errcode='40001'; end if;
    -- Lock photo rows, serialising against in-flight object insertion/deletion.
    perform 1 from public.wardrobe_photos where item_id=p_id for update;
    update public.wardrobe_photos set state='removing' where item_id=p_id;
    update public.wardrobe_items set deleted_at=now(), status='stored', photo_id=null, revision=revision+1, updated_at=now() where id=p_id;
  end if;
  return true;
end $$;

-- Called by Storage RLS. Locking the photo reservation prevents an upload from
-- racing past deletion cleanup and leaving an untracked object behind.
create or replace function public.wardrobe_storage_allowed(p_path text, p_operation text) returns boolean
language plpgsql security definer set search_path = '' as $$
declare ph public.wardrobe_photos;
begin
  if auth.uid() is null then return false; end if;
  if p_operation in ('insert','delete') then
    select * into ph from public.wardrobe_photos where path=p_path and user_id=auth.uid() for update;
  else
    select * into ph from public.wardrobe_photos where path=p_path and user_id=auth.uid();
  end if;
  if not found then return false; end if;
  return case p_operation when 'insert' then ph.state='staged' when 'delete' then ph.state='removing' when 'select' then exists(select 1 from public.wardrobe_items where id=ph.item_id and user_id=auth.uid()) else false end;
end $$;

revoke all on function public.save_wardrobe_item(uuid,integer,jsonb), public.wardrobe_photo_action(uuid,uuid,integer,text), public.delete_wardrobe_item(uuid,integer,boolean), public.wardrobe_storage_allowed(text,text) from public, anon;
grant execute on function public.save_wardrobe_item(uuid,integer,jsonb), public.wardrobe_photo_action(uuid,uuid,integer,text), public.delete_wardrobe_item(uuid,integer,boolean), public.wardrobe_storage_allowed(text,text) to authenticated;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('wardrobe-private','wardrobe-private',false,3145728,array['image/jpeg']) on conflict(id) do update set public=false,file_size_limit=3145728,allowed_mime_types=array['image/jpeg'];
drop policy if exists "wardrobe private access" on storage.objects;
create policy "wardrobe private access" on storage.objects for all to authenticated using (bucket_id='wardrobe-private') with check (bucket_id='wardrobe-private');
drop policy if exists "wardrobe private select guard" on storage.objects;
create policy "wardrobe private select guard" on storage.objects as restrictive for select to public using (bucket_id<>'wardrobe-private' or public.wardrobe_storage_allowed(name,'select'));
drop policy if exists "wardrobe private insert guard" on storage.objects;
create policy "wardrobe private insert guard" on storage.objects as restrictive for insert to public with check (bucket_id<>'wardrobe-private' or public.wardrobe_storage_allowed(name,'insert'));
drop policy if exists "wardrobe private delete guard" on storage.objects;
create policy "wardrobe private delete guard" on storage.objects as restrictive for delete to public using (bucket_id<>'wardrobe-private' or public.wardrobe_storage_allowed(name,'delete'));
drop policy if exists "wardrobe private immutable" on storage.objects;
create policy "wardrobe private immutable" on storage.objects as restrictive for update to public using (bucket_id<>'wardrobe-private') with check (bucket_id<>'wardrobe-private');
commit;

