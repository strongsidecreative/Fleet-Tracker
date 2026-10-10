-- Fleet Tracker: monthly fuel receipt export + tidy-up, and clearable notifications
-- Run after 0021_audit_fixes.sql, in the Supabase SQL Editor.
-- Safe to run any number of times.
--
-- At the start of each month, admins are prompted (in-app banner, push,
-- and email if configured) to download the previous month's fuel receipts
-- as a ZIP, or the ZIP is emailed to them automatically. Once a month has
-- been downloaded or emailed, its receipt photos are deleted from Storage
-- after the organisation's retention period (default 3 months), keeping
-- the fuel log itself (date, driver, vehicle, litres, cost). Months that
-- were never exported are never cleaned up.
--
-- The daily job runs from pg_cron (already used by 0002/0007) and calls
-- the app's /api/cron/receipts route through pg_net, reusing the push
-- dispatch URL and secret already stored in app_config (0012). No new
-- secrets, no paid scheduler.

-- ============================================================
-- 1. Per-organisation settings (editable on Admin > Account)
-- ============================================================
alter table organisations
  add column if not exists receipt_delivery text not null default 'remind';
alter table organisations
  add column if not exists receipt_retention_months int not null default 3;

alter table organisations drop constraint if exists organisations_receipt_delivery_check;
alter table organisations add constraint organisations_receipt_delivery_check
  check (receipt_delivery in ('remind', 'email'));

alter table organisations drop constraint if exists organisations_receipt_retention_check;
alter table organisations add constraint organisations_receipt_retention_check
  check (receipt_retention_months between 0 and 84);  -- 0 = keep photos forever

-- ============================================================
-- 2. When a receipt photo has been cleared (row is kept)
-- ============================================================
alter table fuel_logs add column if not exists receipt_purged_at timestamptz;

-- ============================================================
-- 3. One row per organisation per month
-- ============================================================
create table if not exists receipt_exports (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id),
  month date not null,  -- first day of the month (NZ calendar)
  receipt_count int not null default 0,
  reminded_at timestamptz,
  exported_at timestamptz,
  exported_by uuid references profiles(id) on delete set null,
  exported_via text check (exported_via in ('download', 'email')),
  images_purged_at timestamptz,
  created_at timestamptz not null default now(),
  constraint receipt_exports_month_is_first check (extract(day from month) = 1),
  constraint receipt_exports_org_month unique (organisation_id, month)
);

alter table receipt_exports enable row level security;

drop trigger if exists trg_set_org_receipt_exports on receipt_exports;
create trigger trg_set_org_receipt_exports before insert on receipt_exports
  for each row execute function set_organisation_id();

drop policy if exists admins_select_receipt_exports on receipt_exports;
create policy admins_select_receipt_exports on receipt_exports
  for select using (is_admin() and organisation_id = current_org_id());

drop policy if exists admins_insert_receipt_exports on receipt_exports;
create policy admins_insert_receipt_exports on receipt_exports
  for insert with check (is_admin() and organisation_id = current_org_id());

drop policy if exists admins_update_receipt_exports on receipt_exports;
create policy admins_update_receipt_exports on receipt_exports
  for update using (is_admin() and organisation_id = current_org_id())
  with check (is_admin() and organisation_id = current_org_id());

-- ============================================================
-- 4. New notification type
-- ============================================================
alter table notifications drop constraint if exists notifications_type_check;
alter table notifications add constraint notifications_type_check
  check (type in (
    'maintenance_due', 'incident_report', 'booking_created',
    'licence_expiring', 'vehicle_check_issue', 'booking_approved', 'booking_declined',
    'booking_cancelled', 'booking_override', 'receipt_export_due'
  ));

-- ============================================================
-- 4b. "Clear" for notifications: hidden, not deleted. Compliance alerts
--     use past notifications (dedupe_key) to avoid repeating themselves,
--     so deleting a cleared alert would make it come back the next day.
--     Clearing goes through the existing "mark read" UPDATE policy.
-- ============================================================
alter table notifications add column if not exists cleared_at timestamptz;

create index if not exists notifications_recipient_visible_idx
  on notifications (recipient_id, created_at desc) where cleared_at is null;

-- ============================================================
-- 5. Daily job: ask the app to send reminders and tidy up
-- ============================================================
create or replace function run_receipt_job()
returns void as $$
declare
  dispatch_url text;
  dispatch_secret text;
begin
  select value into dispatch_url from app_config where key = 'push_dispatch_url';
  select value into dispatch_secret from app_config where key = 'push_dispatch_secret';

  if dispatch_url is null or dispatch_url like 'https://REPLACE%' or dispatch_secret is null then
    return;  -- not configured: nothing to call
  end if;

  perform net.http_post(
    url := replace(dispatch_url, '/api/push/dispatch', '/api/cron/receipts'),
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-push-secret', dispatch_secret),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
end;
$$ language plpgsql security definer set search_path = public;

revoke all on function run_receipt_job() from public, anon, authenticated;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'monthly-receipts-daily') then
    perform cron.unschedule('monthly-receipts-daily');
  end if;

  -- 19:15 UTC = 8:15am NZDT / 7:15am NZST. Runs daily; the app only acts
  -- once per month per organisation, so a missed day is simply caught up.
  perform cron.schedule('monthly-receipts-daily', '15 19 * * *', 'select run_receipt_job()');

  -- Housekeeping found 2026-10-10: these two call functions dropped in
  -- 0010 (0010 unscheduled them under different names), so they've been
  -- failing every week/month since.
  if exists (select 1 from cron.job where jobname = 'generate_weekly_report_job') then
    perform cron.unschedule('generate_weekly_report_job');
  end if;
  if exists (select 1 from cron.job where jobname = 'generate_monthly_report_job') then
    perform cron.unschedule('generate_monthly_report_job');
  end if;

  -- Two jobs ran the same maintenance sweep at the same minute; keep one.
  if exists (select 1 from cron.job where jobname = 'check_maintenance_due_job' and command ilike '%check_maintenance_due%')
     and exists (select 1 from cron.job where jobname = 'check-maintenance-due' and command ilike '%check_maintenance_due%') then
    perform cron.unschedule('check-maintenance-due');
  end if;
end $$;

-- ============================================================
-- Rollback notes (manual):
--   select cron.unschedule('monthly-receipts-daily');
--   drop function run_receipt_job();
--   drop table receipt_exports;
--   (the organisations/fuel_logs columns can stay; they're unused without the app code)
-- ============================================================
