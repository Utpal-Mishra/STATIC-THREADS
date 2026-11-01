\set ON_ERROR_STOP on
-- Isolated CI only; follows the chat RLS and visual quota harnesses.
\ir ../supabase/migrations/20261101220000_outfit_photo_import.sql
\ir ../supabase/migrations/20261101220000_outfit_photo_import.sql
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-4000-8000-000000000001';
do $$
declare payload jsonb := jsonb_build_array(jsonb_build_object('client_item_id','photo:'||repeat('a',64)||':test','name','Sari','category','dresses','primary_colour','Blue','subcategory','User reviewed draped garment')); total integer;
begin
  select count(*) into total from public.import_outfit_items(payload); if total <> 1 then raise exception 'Import failed'; end if;
  perform * from public.import_outfit_items(payload);
  if (select count(*) from public.wardrobe_items where client_item_id like 'photo:%') <> 1 then raise exception 'Retry duplicated garments'; end if;
  if exists(select 1 from public.import_outfit_items(payload) where user_id <> auth.uid()) then raise exception 'Wrong import owner'; end if;
  begin
    perform * from public.import_outfit_items(payload || jsonb_build_array(jsonb_build_object('client_item_id','photo:'||repeat('a',64)||':bad','name','','category','other','primary_colour','Unknown','subcategory','')));
    raise exception 'Invalid batch accepted';
  exception when raise_exception then if sqlerrm = 'Invalid batch accepted' then raise; end if; end;
  if (select count(*) from public.wardrobe_items where client_item_id like 'photo:%') <> 1 then raise exception 'Invalid import partially committed'; end if;
  begin
    perform public.consume_outfit_import_quota(auth.uid()); raise exception 'Quota exposed';
  exception when insufficient_privilege then null; end;
end $$;
set request.jwt.claim.sub = '00000000-0000-4000-8000-000000000002';
do $$ begin
  if exists(select 1 from public.wardrobe_items where client_item_id like 'photo:%') then raise exception 'Imported records leaked'; end if;
end $$;
reset role;
set role anon;
do $$ begin
  begin perform * from public.import_outfit_items('[]'::jsonb); raise exception 'Anonymous import accepted'; exception when insufficient_privilege then null; end;
end $$;
reset role;
set role service_role;
do $$ begin
  for i in 1..3 loop if not public.consume_outfit_import_quota('00000000-0000-4000-8000-000000000001') then raise exception 'Valid allowance rejected'; end if; end loop;
  if public.consume_outfit_import_quota('00000000-0000-4000-8000-000000000001') then raise exception 'Allowance exceeded'; end if;
  if not public.consume_outfit_import_quota('00000000-0000-4000-8000-000000000002') then raise exception 'Quota crossed users'; end if;
end $$;
reset role;
select 'PASS: private atomic import, idempotency, two-user isolation, anon denial and server-only photo quotas' as result;
