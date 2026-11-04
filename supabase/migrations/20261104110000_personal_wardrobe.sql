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
