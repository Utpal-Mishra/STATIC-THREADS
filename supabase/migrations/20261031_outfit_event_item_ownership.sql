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
