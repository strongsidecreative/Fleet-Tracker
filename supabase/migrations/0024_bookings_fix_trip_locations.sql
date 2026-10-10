-- Fleet Tracker: fix "Something went wrong submitting this request" on every
-- new booking, and record where trips start and finish.
-- Run after 0023_private_photos.sql, in the Supabase SQL Editor.
-- Safe to run any number of times.

-- ============================================================
-- 1. Remove the leftover pre-approval booking trigger
--    0005 added trg_notify_booking -> notify_admins_of_booking(), which
--    told EVERY active admin (all organisations) about every new booking
--    and writes notifications without organisation_id. 0008 replaced it
--    with notify_approving_admin() and dropped it, but production still had
--    it (0005 was most likely re-run after 0008). Since 0013 made
--    notifications.organisation_id NOT NULL, it made every booking insert
--    fail. Found 2026-10-10 by replaying an insert as a driver.
-- ============================================================
drop trigger if exists trg_notify_booking on bookings;
drop function if exists notify_admins_of_booking();

-- ============================================================
-- 2. Trip start / finish location (from the phone's GPS, when allowed)
--    accuracy is the phone's own estimate in metres; address is a short
--    best-effort street/suburb label looked up when the trip is saved.
-- ============================================================
alter table vehicle_usage add column if not exists start_lat double precision;
alter table vehicle_usage add column if not exists start_lng double precision;
alter table vehicle_usage add column if not exists start_accuracy_m double precision;
alter table vehicle_usage add column if not exists start_address text;
alter table vehicle_usage add column if not exists end_lat double precision;
alter table vehicle_usage add column if not exists end_lng double precision;
alter table vehicle_usage add column if not exists end_accuracy_m double precision;
alter table vehicle_usage add column if not exists end_address text;

alter table vehicle_usage drop constraint if exists vehicle_usage_start_coords_valid;
alter table vehicle_usage add constraint vehicle_usage_start_coords_valid
  check ((start_lat is null and start_lng is null)
      or (start_lat between -90 and 90 and start_lng between -180 and 180));

alter table vehicle_usage drop constraint if exists vehicle_usage_end_coords_valid;
alter table vehicle_usage add constraint vehicle_usage_end_coords_valid
  check ((end_lat is null and end_lng is null)
      or (end_lat between -90 and 90 and end_lng between -180 and 180));

-- ============================================================
-- Rollback notes (manual):
--   The dropped trigger must NOT be restored (it breaks every booking).
--   alter table vehicle_usage drop column start_lat, ... (8 columns)
-- ============================================================
