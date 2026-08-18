-- Fleet Tracker — vehicle photo storage
-- Run after 0005_compliance_system.sql

insert into storage.buckets (id, name, public)
values ('vehicle-photos', 'vehicle-photos', true)
on conflict (id) do nothing;

drop policy if exists admins_upload_vehicle_photos on storage.objects;
create policy admins_upload_vehicle_photos on storage.objects
  for insert
  with check (bucket_id = 'vehicle-photos' and is_admin());

drop policy if exists admins_update_vehicle_photos on storage.objects;
create policy admins_update_vehicle_photos on storage.objects
  for update
  using (bucket_id = 'vehicle-photos' and is_admin());

drop policy if exists admins_delete_vehicle_photos on storage.objects;
create policy admins_delete_vehicle_photos on storage.objects
  for delete
  using (bucket_id = 'vehicle-photos' and is_admin());

drop policy if exists public_read_vehicle_photos on storage.objects;
create policy public_read_vehicle_photos on storage.objects
  for select
  using (bucket_id = 'vehicle-photos');
