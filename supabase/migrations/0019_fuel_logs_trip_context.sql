-- Fleet Tracker — simplify fuel logging to an in-trip action
-- Run after 0018_fuel_logs.sql, in the Supabase SQL Editor.
--
-- Fuel logging moved from a standalone form (vehicle + odometer + litres +
-- cost, reachable any time a vehicle's QR is scanned) to a single action
-- on the driver's "Current Vehicle" card, available only while they have
-- that vehicle checked out. Two knock-on changes to the schema:
--
-- 1. odometer_km was never used by anything downstream (Reports computes
--    fuel-to-KM from trip data for the period, not this column) and adds
--    a data-entry step at exactly the moment ease-of-use matters most —
--    dropped from the form, so the column becomes optional.
-- 2. litres stays, but becomes optional too — cost and a receipt photo
--    are the two things that matter every time; litres is a nice-to-have
--    if the driver has it handy.
-- 3. New optional trip_id, linking a fuel log to the vehicle_usage row
--    it was logged against — free now that entry is always in-trip, and
--    lets Reports/the admin Fuel list show exactly which trip a fill-up
--    happened on, not just which vehicle and day.
--
-- Existing rows are untouched (both columns already had real values from
-- the old form). The check constraints on odometer_km/litres already
-- ignore NULL, so no need to touch them.
--
-- Safe to run any number of times.

alter table fuel_logs alter column odometer_km drop not null;
alter table fuel_logs alter column litres drop not null;

alter table fuel_logs add column if not exists trip_id uuid references vehicle_usage(id);

create index if not exists fuel_logs_trip_id_idx on fuel_logs (trip_id);
