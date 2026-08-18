-- Fleet Tracker — remove the weekly/monthly "report ready" notification
-- feature entirely. It only ever nudged admins to go look at a period
-- that's already live on the dashboard's KM-by-week chart — no new data,
-- just noise. The Reports page and its CSV export are unaffected; this
-- only removes the scheduled notification that pointed at it.
-- Run after 0009_booking_edit_reapproval.sql

-- 1. Stop generating them — only if the job actually exists. cron.unschedule()
--    throws if the name isn't found, and these jobs may never have been
--    scheduled successfully (or may already be gone) on every environment.
do $$
begin
  if exists (select 1 from cron.job where jobname = 'generate-weekly-report') then
    perform cron.unschedule('generate-weekly-report');
  end if;
  if exists (select 1 from cron.job where jobname = 'generate-monthly-report') then
    perform cron.unschedule('generate-monthly-report');
  end if;
end $$;

drop function if exists generate_weekly_report_notification();
drop function if exists generate_monthly_report_notification();

-- 2. Clear out any that already exist so the type constraint below can be
--    validated cleanly against current data.
delete from notifications where type = 'report_ready';

-- 3. Remove 'report_ready' from the allowed notification types.
alter table notifications drop constraint if exists notifications_type_check;
alter table notifications add constraint notifications_type_check
  check (type in (
    'maintenance_due', 'incident_report', 'booking_created',
    'licence_expiring', 'vehicle_check_issue', 'booking_approved', 'booking_declined',
    'booking_cancelled', 'booking_override'
  ));

-- Note: 'booking_cancelled' is left in the allowed list for backward
-- compatibility with any historical rows, but the app no longer writes it —
-- declining a pending request and cancelling an approved one are both
-- notified as 'booking_declined' now (see app/admin/bookings/actions.ts).
