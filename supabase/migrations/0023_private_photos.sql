-- Fleet Tracker: private receipt/check photos, organisation-scoped photo
-- storage, and a storage usage figure for admins.
-- Run after 0022_monthly_receipts.sql, in the Supabase SQL Editor.
-- Safe to run any number of times.
--
-- Before this, every photo lived in the PUBLIC "vehicle-photos" bucket:
-- anyone holding a receipt's link could open it (receipts can show card
-- details), and the admin upload/replace/delete rules only checked "is an
-- admin", not "of this organisation".
--
-- After this:
--   * Fuel receipts and vehicle-check photos go in a new PRIVATE bucket,
--     "private-photos", under "<organisation id>/<uploader id>/...". The app
--     shows them through short-lived signed links. Only that organisation's
--     admins, or the driver who took the photo, can get a link.
--   * Vehicle photos stay public (shown on every driver screen), but new
--     ones go under "vehicles/<organisation id>/..." and an admin can only
--     upload, replace or delete their own organisation's.
--   * Existing photos keep working where they are (older rows hold full
--     public links). Nothing is moved or deleted by this migration.

-- ============================================================
-- 1. The private bucket (images only, 5 MB per file)
-- ============================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('private-photos', 'private-photos', false, 5242880, array['image/*'])
on conflict (id) do update
  set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists private_photos_insert_own on storage.objects;
create policy private_photos_insert_own on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'private-photos'
    and (storage.foldername(name))[1] = current_org_id()::text
    and (storage.foldername(name))[2] = auth.uid()::text
  );

drop policy if exists private_photos_select_org on storage.objects;
create policy private_photos_select_org on storage.objects
  for select to authenticated
  using (
    bucket_id = 'private-photos'
    and (storage.foldername(name))[1] = current_org_id()::text
    and (is_admin() or (storage.foldername(name))[2] = auth.uid()::text)
  );

drop policy if exists private_photos_delete_admin on storage.objects;
create policy private_photos_delete_admin on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'private-photos'
    and (storage.foldername(name))[1] = current_org_id()::text
    and is_admin()
  );

-- ============================================================
-- 2. Public vehicle photos: organisation-scoped admin rules
--    (objects.name is qualified on purpose: vehicles has its own "name"
--    column, which an unqualified "name" inside the subquery would mean.)
-- ============================================================
drop policy if exists admins_upload_vehicle_photos on storage.objects;
create policy admins_upload_vehicle_photos on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'vehicle-photos'
    and is_admin()
    and (storage.foldername(name))[1] = 'vehicles'
    and (storage.foldername(name))[2] = current_org_id()::text
  );

drop policy if exists admins_update_vehicle_photos on storage.objects;
create policy admins_update_vehicle_photos on storage.objects
  for update to authenticated
  using (
    bucket_id = 'vehicle-photos'
    and is_admin()
    and (
      ((storage.foldername(name))[1] = 'vehicles' and (storage.foldername(name))[2] = current_org_id()::text)
      or exists (select 1 from vehicles v
                 where v.organisation_id = current_org_id()
                   and v.photo_url like '%/vehicle-photos/' || objects.name)
    )
  );

drop policy if exists admins_delete_vehicle_photos on storage.objects;
create policy admins_delete_vehicle_photos on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'vehicle-photos'
    and is_admin()
    and (
      ((storage.foldername(name))[1] = 'vehicles' and (storage.foldername(name))[2] = current_org_id()::text)
      or exists (select 1 from vehicles v
                 where v.organisation_id = current_org_id()
                   and v.photo_url like '%/vehicle-photos/' || objects.name)
    )
  );

-- Receipts and check photos no longer go to the public bucket.
drop policy if exists drivers_upload_check_photos on storage.objects;
drop policy if exists drivers_upload_fuel_receipts on storage.objects;

-- ============================================================
-- 3. Storage used, for the Account page (admins only)
--    org_bytes: this organisation's photos (both buckets, old and new
--    locations). total_bytes: every file in this Supabase project, which
--    is what the free plan's 1 GB limit applies to.
-- ============================================================
create or replace function organisation_storage_usage()
returns table (org_bytes bigint, org_files bigint, total_bytes bigint) as $$
declare
  org uuid := current_org_id();
begin
  if not is_admin() then
    raise exception 'Only admins can see storage usage.';
  end if;

  return query
  with sized as (
    select o.bucket_id, o.name, coalesce((o.metadata->>'size')::bigint, 0) as bytes
    from storage.objects o
  ),
  mine as (
    select s.bytes from sized s
    where (s.bucket_id = 'private-photos' and (storage.foldername(s.name))[1] = org::text)
       or (s.bucket_id = 'vehicle-photos' and (
             ((storage.foldername(s.name))[1] = 'vehicles' and (storage.foldername(s.name))[2] = org::text)
          or exists (select 1 from vehicles v where v.organisation_id = org and v.photo_url like '%/vehicle-photos/' || s.name)
          or exists (select 1 from fuel_logs f where f.organisation_id = org and f.receipt_photo_url like '%/vehicle-photos/' || s.name)
          or exists (select 1 from vehicle_check_items i where i.organisation_id = org and i.photo_url like '%/vehicle-photos/' || s.name)
       ))
  )
  select coalesce((select sum(bytes) from mine), 0)::bigint,
         (select count(*) from mine)::bigint,
         coalesce((select sum(bytes) from sized), 0)::bigint;
end;
$$ language plpgsql stable security definer set search_path = public;

revoke all on function organisation_storage_usage() from public, anon;
grant execute on function organisation_storage_usage() to authenticated;

-- ============================================================
-- Rollback notes (manual):
--   Re-run the storage policy blocks from 0006 / 0007 / 0018 to restore
--   the old public-bucket rules, then:
--   drop function organisation_storage_usage();
--   (Leave the private-photos bucket: rows written after this point point at it.)
-- ============================================================
