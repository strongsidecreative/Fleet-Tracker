-- Family Vehicle Tracker — auto-generated weekly & monthly report notifications
-- Run after 0003_bookings.sql

-- Allow 'report_ready' alongside the existing notification types.
alter table notifications drop constraint notifications_type_check;
alter table notifications add constraint notifications_type_check
  check (type in ('maintenance_due', 'incident_report', 'report_ready'));

-- Store which period a report notification covers, so the app can open
-- straight to that week/month without the admin re-selecting it.
alter table notifications
  add column period_start date,
  add column period_end date;

create or replace function generate_weekly_report_notification()
returns void as $$
declare
  week_start date := date_trunc('week', current_date)::date - 7;
  week_end date := week_start + 6;
begin
  insert into notifications (recipient_id, type, message, period_start, period_end)
  select p.id, 'report_ready',
         'Weekly report ready: ' || to_char(week_start, 'DD Mon') || ' – ' || to_char(week_end, 'DD Mon'),
         week_start, week_end
  from profiles p
  where p.role = 'admin' and p.active = true
    and not exists (
      select 1 from notifications n
      where n.type = 'report_ready' and n.period_start = week_start and n.recipient_id = p.id
    );
end;
$$ language plpgsql security definer;

create or replace function generate_monthly_report_notification()
returns void as $$
declare
  month_start date := date_trunc('month', current_date - interval '1 month')::date;
  month_end date := (date_trunc('month', current_date)::date - 1);
begin
  insert into notifications (recipient_id, type, message, period_start, period_end)
  select p.id, 'report_ready',
         'Monthly report ready: ' || to_char(month_start, 'Month YYYY'),
         month_start, month_end
  from profiles p
  where p.role = 'admin' and p.active = true
    and not exists (
      select 1 from notifications n
      where n.type = 'report_ready' and n.period_start = month_start and n.recipient_id = p.id
    );
end;
$$ language plpgsql security definer;

-- Weekly, every Monday morning NZT (adjust the UTC hour for daylight saving
-- if you want it pinned to a specific NZ local time year-round).
select cron.schedule(
  'generate-weekly-report',
  '0 18 * * 0', -- Sunday 18:00 UTC ≈ Monday 6am NZST
  $$select generate_weekly_report_notification();$$
);

-- Monthly, on the 1st.
select cron.schedule(
  'generate-monthly-report',
  '0 18 1 * *', -- 1st of the month, 18:00 UTC ≈ 6am NZST the same/next day
  $$select generate_monthly_report_notification();$$
);
