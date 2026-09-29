-- scripts/009_storage_avatars_policies.sql
-- Intersel Insight — RLS policies for the "avatars" Storage bucket.
-- Object path convention: avatars/<user_id>/<filename> — a user may only
-- write inside their own <user_id> folder; read is public (bucket itself
-- is also marked public, but an explicit policy is defense-in-depth and
-- keeps this consistent with everything else in the project).
--
-- MUST run via the ADMIN connection: `storage` is a Supabase-managed
-- schema, insight_app has no privileges there.

do $$
begin
  begin
    grant insight_app to postgres;
  exception when duplicate_object or others then null;
  end;
end $$;

drop policy if exists "avatars_public_read" on storage.objects;
create policy "avatars_public_read"
on storage.objects for select
to public
using (bucket_id = 'avatars');

drop policy if exists "avatars_own_folder_insert" on storage.objects;
create policy "avatars_own_folder_insert"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "avatars_own_folder_update" on storage.objects;
create policy "avatars_own_folder_update"
on storage.objects for update
to authenticated
using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text)
with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "avatars_own_folder_delete" on storage.objects;
create policy "avatars_own_folder_delete"
on storage.objects for delete
to authenticated
using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
