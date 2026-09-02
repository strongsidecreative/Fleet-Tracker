-- Fleet Tracker — bring the driver "Report an Incident" form closer to the
-- org's Incident/Accident Report Form (Waiariki Whanau Mentoring).
-- Run after 0016_org_feature_toggles.sql, in the Supabase SQL Editor.
--
-- We only add the fields that make sense for a vehicle incident — date,
-- time, location, police involvement, other-vehicle/property damage, and
-- witness/other-party details. The paper form also covers personal-injury
-- classification, a body diagram, and WorkSafe/ACC/Peninsula compliance
-- questions; those stay out because they belong to a workplace H&S process,
-- not a family vehicle tracker.

alter table incident_reports
  add column if not exists incident_date date,
  add column if not exists incident_time time,
  add column if not exists location text,
  add column if not exists police_involved boolean not null default false,
  add column if not exists police_details text,
  add column if not exists other_vehicle_damage boolean not null default false,
  add column if not exists property_damage_details text,
  add column if not exists witness_involved boolean not null default false,
  add column if not exists witness_details text;
