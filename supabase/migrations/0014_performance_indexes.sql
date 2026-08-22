-- Fleet Tracker — performance indexes
-- Run after 0013_multi_organisation.sql, in the Supabase SQL Editor.
--
-- The multi-organisation migration added organisation_id to 12 tables and
-- every RLS policy now filters on it, but no index was ever added for it
-- — so every query does a full table scan under RLS. Same story for the
-- foreign-key-ish columns (vehicle_id, driver_id, recipient_id, series_id,
-- etc.) that nearly every app query and RLS policy filters on. This adds
-- btree indexes for all of them. Cheap now while tables are small; the
-- kind of thing that's very annoying to retrofit once they aren't.
--
-- Safe to run any number of times (all "if not exists").

-- organisation_id — filtered by every RLS policy on these tables.
create index if not exists idx_profiles_organisation_id on profiles(organisation_id);
create index if not exists idx_vehicles_organisation_id on vehicles(organisation_id);
create index if not exists idx_vehicle_usage_organisation_id on vehicle_usage(organisation_id);
create index if not exists idx_audit_log_organisation_id on audit_log(organisation_id);
create index if not exists idx_incident_reports_organisation_id on incident_reports(organisation_id);
create index if not exists idx_notifications_organisation_id on notifications(organisation_id);
create index if not exists idx_bookings_organisation_id on bookings(organisation_id);
create index if not exists idx_booking_series_organisation_id on booking_series(organisation_id);
create index if not exists idx_driver_licences_organisation_id on driver_licences(organisation_id);
create index if not exists idx_vehicle_checks_organisation_id on vehicle_checks(organisation_id);
create index if not exists idx_vehicle_check_items_organisation_id on vehicle_check_items(organisation_id);
create index if not exists idx_push_subscriptions_organisation_id on push_subscriptions(organisation_id);

-- Foreign-key-ish columns used in app queries and RLS policies.
-- (driver_licences.driver_id already has a unique constraint, which
-- creates its own index, so it's skipped here.)
create index if not exists idx_vehicle_usage_vehicle_id on vehicle_usage(vehicle_id);
create index if not exists idx_vehicle_usage_driver_id on vehicle_usage(driver_id);

create index if not exists idx_incident_reports_vehicle_id on incident_reports(vehicle_id);
create index if not exists idx_incident_reports_driver_id on incident_reports(driver_id);

create index if not exists idx_notifications_recipient_id on notifications(recipient_id);

create index if not exists idx_bookings_vehicle_id on bookings(vehicle_id);
create index if not exists idx_bookings_driver_id on bookings(driver_id);
create index if not exists idx_bookings_series_id on bookings(series_id);
create index if not exists idx_bookings_approving_admin_id on bookings(approving_admin_id);

create index if not exists idx_vehicle_checks_vehicle_id on vehicle_checks(vehicle_id);
create index if not exists idx_vehicle_checks_driver_id on vehicle_checks(driver_id);
create index if not exists idx_vehicle_check_items_check_id on vehicle_check_items(check_id);

create index if not exists idx_booking_series_driver_id on booking_series(driver_id);
create index if not exists idx_booking_series_vehicle_id on booking_series(vehicle_id);

create index if not exists idx_push_subscriptions_user_id on push_subscriptions(user_id);

create index if not exists idx_audit_log_user_id on audit_log(user_id);
create index if not exists idx_audit_log_record_id on audit_log(record_id);
