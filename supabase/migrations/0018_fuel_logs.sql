-- Fleet Tracker — fuel tracking
-- Run after 0016_org_feature_toggles.sql (and, if present, 0017_incident_report_details.sql), in the Supabase SQL Editor.
--
-- Lets a driver log a fuel fill-up (odometer reading, litres, total cost,
-- optional receipt photo) from their phone. Admins see every log across
-- the fleet and Reports gets a fuel-to-km section for the selected
-- period. Gated behind the "fuel_tracking" feature key — added to
-- lib/orgFeatures.ts, no migration needed for the toggle itself per the
-- pattern established in 0016 (normaliseFeatures defaults an unknown key
-- to "on").
--
-- Safe to run any number of times.

create table if not exists fuel_logs (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references vehicles(id),
  driver_id uuid not null references profiles(id),
  odometer_km numeric not null,
  litres numeric not null,
  cost numeric not null,
  receipt_photo_url text,
  notes text,
  created_at timestamptz not null default now(),

  constraint fuel_odometer_not_negative check (odometer_km >= 0),
  constraint fuel_litres_positive check (litres > 0),
  constraint fuel_cost_not_negative check (cost >= 0)
);

-- These line up with how Reports and the admin Fuel list query this
-- table (by vehicle, by driver, ordered/filtered by date) — same gap the
-- 2026-08-22 performance audit flagged on every other FK-ish column, so
-- this table starts with the indexes instead of needing a follow-up.
create index if not exists fuel_logs_vehicle_id_idx on fuel_logs (vehicle_id);
create index if not exists fuel_logs_driver_id_idx on fuel_logs (driver_id);
create index if not exists fuel_logs_created_at_idx on fuel_logs (created_at);

alter table fuel_logs enable row level security;

-- Drivers can log and see their own fill-ups. No driver update/delete —
-- once a receipt's logged it's a financial record, same "don't silently
-- rewrite history" reasoning as vehicle_checks; admins can correct or
-- remove a bad entry (fat-fingered litres/cost, wrong vehicle) since
-- they're the ones reconciling fuel spend.
drop policy if exists drivers_insert_own_fuel_logs on fuel_logs;
create policy drivers_insert_own_fuel_logs on fuel_logs
  for insert
  with check (driver_id = auth.uid());

drop policy if exists drivers_select_own_fuel_logs on fuel_logs;
create policy drivers_select_own_fuel_logs on fuel_logs
  for select
  using (driver_id = auth.uid());

drop policy if exists admins_select_all_fuel_logs on fuel_logs;
create policy admins_select_all_fuel_logs on fuel_logs
  for select
  using (is_admin());

drop policy if exists admins_update_fuel_logs on fuel_logs;
create policy admins_update_fuel_logs on fuel_logs
  for update
  using (is_admin());

drop policy if exists admins_delete_fuel_logs on fuel_logs;
create policy admins_delete_fuel_logs on fuel_logs
  for delete
  using (is_admin());

-- Reuse the existing "vehicle-photos" bucket set up in 0006, same as
-- vehicle check photos in 0007 — one more folder, no new bucket. Read
-- access is already public from 0006's bucket-wide select policy.
drop policy if exists drivers_upload_fuel_receipts on storage.objects;
create policy drivers_upload_fuel_receipts on storage.objects
  for insert
  with check (
    bucket_id = 'vehicle-photos'
    and (storage.foldername(name))[1] = 'fuel'
    and auth.role() = 'authenticated'
  );
