\set ON_ERROR_STOP on
-- Disposable PostgreSQL test database only, after the existing RLS/import tests.
create schema storage;
create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);
alter table storage.objects enable row level security;
grant usage on schema storage to authenticated, anon;
grant select,insert,update,delete on storage.objects to authenticated;
\ir ../supabase/migrations/20261104110000_personal_wardrobe.sql
\ir ../supabase/migrations/20261104110000_personal_wardrobe.sql
create function public.test_assert(ok boolean, message text) returns void language plpgsql as $$ begin if ok is distinct from true then raise exception '%', message; end if; end $$;
set role authenticated;
set request.jwt.claim.sub='00000000-0000-4000-8000-000000000001';
select public.save_wardrobe_item('00000000-0000-4000-8000-000000000101',0,'{"name":"My kurta","brand":"","category":"tops","subcategory":"kurta","size":"M","fit":"regular","primary_colour":"blue","material":"cotton","notes":"","status":"available","occasions":["casual"]}');
select public.test_assert((select name='My kurta' and revision=1 from public.wardrobe_items where id='00000000-0000-4000-8000-000000000101'),'Create failed');
do $$ begin
  begin update public.wardrobe_items set photo_id=gen_random_uuid(); raise exception 'Direct lifecycle update allowed'; exception when insufficient_privilege then null; end;
  begin delete from public.wardrobe_items; raise exception 'Direct delete bypass allowed'; exception when insufficient_privilege then null; end;
  begin perform public.save_wardrobe_item('00000000-0000-4000-8000-000000000101',0,'{"name":"Stale","brand":"","category":"tops","subcategory":"","size":"","fit":"unknown","primary_colour":"","material":"","notes":"","status":"available","occasions":[]}'); raise exception 'Stale update allowed'; exception when serialization_failure then null; end;
end $$;
select public.wardrobe_photo_action('00000000-0000-4000-8000-000000000101','00000000-0000-4000-8000-000000000201',1,'stage');
insert into storage.objects(bucket_id,name) values('wardrobe-private','00000000-0000-4000-8000-000000000001/00000000-0000-4000-8000-000000000101/00000000-0000-4000-8000-000000000201.jpg');
select public.wardrobe_photo_action('00000000-0000-4000-8000-000000000101','00000000-0000-4000-8000-000000000201',1,'attach');
select public.test_assert((select revision=2 and photo_id='00000000-0000-4000-8000-000000000201' from public.wardrobe_items where id='00000000-0000-4000-8000-000000000101'),'Attach failed');
select public.test_assert((select count(*)=1 from storage.objects),'Owner photo read failed');
-- Another user cannot read, attach, stage, delete or upload to the first user's paths.
set request.jwt.claim.sub='00000000-0000-4000-8000-000000000002';
select public.test_assert((select count(*)=0 from public.wardrobe_photos),'Photo metadata leaked');
select public.test_assert((select count(*)=0 from storage.objects),'Object leaked');
do $$ begin
  begin perform public.wardrobe_photo_action('00000000-0000-4000-8000-000000000101','00000000-0000-4000-8000-000000000202',2,'stage'); raise exception 'Foreign stage allowed'; exception when insufficient_privilege then null; end;
  begin perform public.wardrobe_photo_action('00000000-0000-4000-8000-000000000101','00000000-0000-4000-8000-000000000201',2,'attach'); raise exception 'Foreign attach allowed'; exception when insufficient_privilege then null; end;
  begin insert into storage.objects(bucket_id,name) values('wardrobe-private','00000000-0000-4000-8000-000000000001/00000000-0000-4000-8000-000000000101/00000000-0000-4000-8000-000000000299.jpg'); raise exception 'Foreign upload allowed'; exception when insufficient_privilege then null; end;
end $$;
select public.delete_wardrobe_item('00000000-0000-4000-8000-000000000101',2,false);
set request.jwt.claim.sub='00000000-0000-4000-8000-000000000001';
select public.test_assert((select deleted_at is null from public.wardrobe_items where id='00000000-0000-4000-8000-000000000101'),'Foreign delete changed item');
-- Private objects are immutable, and active photos cannot be removed behind metadata.
update storage.objects set name='bad' where bucket_id='wardrobe-private';
delete from storage.objects where bucket_id='wardrobe-private';
select public.test_assert((select count(*)=1 from storage.objects),'Current photo was mutable');
-- Stage without upload cannot attach; abandoned upload remains explicitly cleanable.
select public.wardrobe_photo_action('00000000-0000-4000-8000-000000000101','00000000-0000-4000-8000-000000000202',2,'stage');
do $$ begin
  begin perform public.wardrobe_photo_action('00000000-0000-4000-8000-000000000101','00000000-0000-4000-8000-000000000202',2,'attach'); raise exception 'Missing object attach allowed'; exception when raise_exception then if sqlerrm='Missing object attach allowed' then raise; end if; end;
end $$;
select public.wardrobe_photo_action('00000000-0000-4000-8000-000000000101','00000000-0000-4000-8000-000000000202',2,'remove');
select public.wardrobe_photo_action('00000000-0000-4000-8000-000000000101','00000000-0000-4000-8000-000000000202',2,'finish');
-- Replacement registers the old object for cleanup without losing the new photo.
select public.wardrobe_photo_action('00000000-0000-4000-8000-000000000101','00000000-0000-4000-8000-000000000203',2,'stage');
insert into storage.objects(bucket_id,name) values('wardrobe-private','00000000-0000-4000-8000-000000000001/00000000-0000-4000-8000-000000000101/00000000-0000-4000-8000-000000000203.jpg');
select public.wardrobe_photo_action('00000000-0000-4000-8000-000000000101','00000000-0000-4000-8000-000000000203',2,'attach');
select public.test_assert((select state='removing' from public.wardrobe_photos where id='00000000-0000-4000-8000-000000000201'),'Replacement cleanup not tracked');
-- Failed/incomplete physical deletion must not remove metadata or claim success.
select public.delete_wardrobe_item('00000000-0000-4000-8000-000000000101',3,false);
do $$ begin
  begin perform public.delete_wardrobe_item('00000000-0000-4000-8000-000000000101',3,true); raise exception 'Unfinished deletion accepted'; exception when raise_exception then if sqlerrm='Unfinished deletion accepted' then raise; end if; end;
  begin insert into storage.objects(bucket_id,name) values('wardrobe-private','00000000-0000-4000-8000-000000000001/00000000-0000-4000-8000-000000000101/00000000-0000-4000-8000-000000000201.jpg'); raise exception 'Upload raced past delete'; exception when insufficient_privilege then null; end;
end $$;
select public.test_assert((select count(*)=0 from public.wardrobe_items where id='00000000-0000-4000-8000-000000000101' and deleted_at is null),'Deleted piece still available');
delete from storage.objects where bucket_id='wardrobe-private';
select public.wardrobe_photo_action('00000000-0000-4000-8000-000000000101','00000000-0000-4000-8000-000000000201',3,'finish');
select public.wardrobe_photo_action('00000000-0000-4000-8000-000000000101','00000000-0000-4000-8000-000000000203',3,'finish');
select public.delete_wardrobe_item('00000000-0000-4000-8000-000000000101',3,true);
select public.test_assert((select count(*)=0 from public.wardrobe_items where id='00000000-0000-4000-8000-000000000101'),'Final deletion failed');
-- Metadata import remains compatible with narrowed table grants.
select * from public.import_outfit_items('[{"client_item_id":"photo:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa:wardrobe-test","name":"Imported sari","category":"dresses","primary_colour":"blue","subcategory":"sari"}]');
reset role;
set role anon;
do $$ begin
  begin perform public.save_wardrobe_item(gen_random_uuid(),0,'{}'); raise exception 'Anonymous create allowed'; exception when insufficient_privilege then null; end;
end $$;
reset role;
drop function public.test_assert(boolean,text);
select 'PASS: personal wardrobe ownership, revision conflicts, immutable private objects, replacement and retryable deletion, import compatibility' as result;
