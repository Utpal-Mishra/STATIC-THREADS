\set ON_ERROR_STOP on
-- Isolated CI PostgreSQL only; never run this harness against a real Supabase project.
create schema auth;
create role authenticated nologin;
create table auth.users (id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
\ir ../supabase/schema.sql
-- Reapplying the migration must be safe and retain protection.
\ir ../supabase/migrations/20261031_outfit_event_item_ownership.sql
insert into auth.users values ('00000000-0000-4000-8000-000000000001'), ('00000000-0000-4000-8000-000000000002');
insert into public.wardrobe_items (id, user_id, name, category) values
  ('00000000-0000-4000-8000-000000000011', '00000000-0000-4000-8000-000000000001', 'First user shirt', 'shirts'),
  ('00000000-0000-4000-8000-000000000012', '00000000-0000-4000-8000-000000000002', 'Second user dress', 'dresses');
grant usage on schema auth, public to authenticated;
grant select, insert, update, delete on public.wardrobe_items, public.outfit_events to authenticated;
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-4000-8000-000000000001';
insert into public.outfit_events (id, user_id, item_ids, action) values
  ('00000000-0000-4000-8000-000000000021', auth.uid(), array['00000000-0000-4000-8000-000000000011']::uuid[], 'saved');
do $$
begin
  if (select count(*) from public.wardrobe_items) <> 1 then raise exception 'Wardrobe data leaked across users'; end if;
  begin
    insert into public.outfit_events(user_id, item_ids, action) values (auth.uid(), array['00000000-0000-4000-8000-000000000012']::uuid[], 'saved');
    raise exception 'Cross-user garment was accepted';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.outfit_events(user_id, item_ids, action) values (auth.uid(), array['00000000-0000-4000-8000-000000000099']::uuid[], 'worn');
    raise exception 'Unknown garment was accepted';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.outfit_events(user_id, item_ids, action) values (auth.uid(), '{}'::uuid[], 'saved');
    raise exception 'Empty outfit was accepted';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.outfit_events(user_id, item_ids, action) values ('00000000-0000-4000-8000-000000000002', array['00000000-0000-4000-8000-000000000011']::uuid[], 'saved');
    raise exception 'Other user identity was accepted';
  exception when insufficient_privilege then null; end;
  begin
    update public.outfit_events set item_ids = array['00000000-0000-4000-8000-000000000012']::uuid[] where id='00000000-0000-4000-8000-000000000021';
    raise exception 'Update bypassed garment ownership';
  exception when insufficient_privilege then null; end;
end $$;
set request.jwt.claim.sub = '00000000-0000-4000-8000-000000000002';
do $$
begin
  if (select count(*) from public.outfit_events) <> 0 then raise exception 'Saved outfit leaked across accounts'; end if;
  if (select count(*) from public.wardrobe_items) <> 1 then raise exception 'Second account saw other garments'; end if;
end $$;
insert into public.outfit_events(user_id, item_ids, action) values (auth.uid(), array['00000000-0000-4000-8000-000000000012']::uuid[], 'worn');
reset role;
select 'PASS: real PostgreSQL RLS ownership, insert/update rejection, two-user reads and repeat migration' as result;
