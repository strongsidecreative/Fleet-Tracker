-- Fleet Tracker — "Create Incident" quick-action from a Vehicle Check Issue.
-- Lets an admin raise an incident report directly from a flagged checklist
-- item, instead of that issue only living inside the Vehicle Check record.
-- Run after 0010_remove_report_notifications.sql

-- 1. Track where an incident came from, and who (which admin) filed it —
--    incident_reports previously assumed the driver always files their own.
alter table incident_reports
  add column if not exists source_vehicle_check_item_id uuid references vehicle_check_items(id),
  add column if not exists created_by uuid references profiles(id);

-- One incident per flagged item — stops an admin double-clicking and
-- creating duplicates from the same issue.
create unique index if not exists incident_reports_one_per_check_item
  on incident_reports (source_vehicle_check_item_id)
  where source_vehicle_check_item_id is not null;

-- 2. Previously only the driver themself could insert their own incident
--    report (driver_id = auth.uid()). Admins now need to insert one on a
--    driver's behalf, attributed to the driver who did the check, so the
--    incident sits under the right person's history.
drop policy if exists "Admins can create incident reports" on incident_reports;
create policy "Admins can create incident reports"
  on incident_reports for insert
  with check (is_admin());
