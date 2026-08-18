-- Family Vehicle Tracker — maintenance tracking, incident reports, in-app notifications
-- Run after 0001_init.sql

-- ============================================================
-- 1. Maintenance fields on vehicles
-- ============================================================
alter table vehicles
  add column wof_due date,
  add column rego_due date,
  add column service_due_date date,
  add column service_due_km numeric;

-- ============================================================
-- 2. incident_reports
-- ============================================================
create table incident_reports (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references vehicles(id),
  driver_id uuid not null references profiles(id),
  description text not null,
  severity text not null check (severity in ('low', 'medium', 'high')) default 'low',
  photo_url text,
  status text not null check (status in ('new', 'acknowledged', 'resolved')) default 'new',
  created_at timestamptz not null default now()
);

-- ============================================================
-- 3. notifications (in-app, no email)
-- ============================================================
create table notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references profiles(id),
  type text not null check (type in ('maintenance_due', 'incident_report')),
  message text not null,
  related_table text,
  related_id uuid,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

-- ============================================================
-- 4. Auto-notify admins the moment an incident is reported
-- ============================================================
create or replace function notify_admins_of_incident()
returns trigger as $$
begin
  insert into notifications (recipient_id, type, message, related_table, related_id)
  select p.id, 'incident_report',
         (select name from vehicles where id = new.vehicle_id) || ': ' ||
         left(new.description, 100),
         'incident_reports', new.id
  from profiles p
  where p.role = 'admin' and p.active = true;
  return new;
end;
$$ language plpgsql security definer;

create trigger trg_notify_incident
  after insert on incident_reports
  for each row execute function notify_admins_of_incident();

-- ============================================================
-- 5. Daily maintenance-due check (WOF, rego, service date, service KM)
--    Scheduled via pg_cron — free on Supabase, no email service needed.
--    Dedupes so the same vehicle/type doesn't re-notify every day.
-- ============================================================
create or replace function check_maintenance_due()
returns void as $$
begin
  -- WOF
  insert into notifications (recipient_id, type, message, related_table, related_id)
  select p.id, 'maintenance_due',
         v.name || ' WOF is due ' || to_char(v.wof_due, 'DD Mon YYYY'),
         'vehicles', v.id
  from vehicles v
  cross join profiles p
  where p.role = 'admin' and p.active = true
    and v.active and v.wof_due is not null
    and v.wof_due <= current_date + interval '14 days'
    and not exists (
      select 1 from notifications n
      where n.related_id = v.id and n.type = 'maintenance_due'
        and n.message like '%WOF%'
        and n.created_at > now() - interval '7 days'
    );

  -- Rego
  insert into notifications (recipient_id, type, message, related_table, related_id)
  select p.id, 'maintenance_due',
         v.name || ' registration is due ' || to_char(v.rego_due, 'DD Mon YYYY'),
         'vehicles', v.id
  from vehicles v
  cross join profiles p
  where p.role = 'admin' and p.active = true
    and v.active and v.rego_due is not null
    and v.rego_due <= current_date + interval '14 days'
    and not exists (
      select 1 from notifications n
      where n.related_id = v.id and n.type = 'maintenance_due'
        and n.message like '%registration%'
        and n.created_at > now() - interval '7 days'
    );

  -- Service — by date
  insert into notifications (recipient_id, type, message, related_table, related_id)
  select p.id, 'maintenance_due',
         v.name || ' service is due ' || to_char(v.service_due_date, 'DD Mon YYYY'),
         'vehicles', v.id
  from vehicles v
  cross join profiles p
  where p.role = 'admin' and p.active = true
    and v.active and v.service_due_date is not null
    and v.service_due_date <= current_date + interval '14 days'
    and not exists (
      select 1 from notifications n
      where n.related_id = v.id and n.type = 'maintenance_due'
        and n.message like '%service is due%'
        and n.created_at > now() - interval '7 days'
    );

  -- Service — by odometer, "2 weeks out" approximated as within 300km
  -- (roughly two weeks of typical family driving; adjust to taste)
  insert into notifications (recipient_id, type, message, related_table, related_id)
  select p.id, 'maintenance_due',
         v.name || ' service is due soon (' || v.current_odometer || ' / ' || v.service_due_km || ' KM)',
         'vehicles', v.id
  from vehicles v
  cross join profiles p
  where p.role = 'admin' and p.active = true
    and v.active and v.service_due_km is not null
    and v.current_odometer >= v.service_due_km - 300
    and not exists (
      select 1 from notifications n
      where n.related_id = v.id and n.type = 'maintenance_due'
        and n.message like '%service is due soon%'
        and n.created_at > now() - interval '7 days'
    );
end;
$$ language plpgsql security definer;

-- Requires the pg_cron extension, free and available on Supabase's free tier.
create extension if not exists pg_cron;

select cron.schedule(
  'check-maintenance-due',
  '0 7 * * *', -- daily at 7am UTC — adjust for NZ time when scheduling
  $$select check_maintenance_due();$$
);

-- ============================================================
-- 6. Row Level Security
-- ============================================================
alter table incident_reports enable row level security;
alter table notifications enable row level security;

-- incident_reports
create policy "Drivers can submit incident reports"
  on incident_reports for insert
  with check (driver_id = auth.uid());

create policy "Drivers can view their own incident reports"
  on incident_reports for select
  using (driver_id = auth.uid());

create policy "Admins can view all incident reports"
  on incident_reports for select
  using (is_admin());

create policy "Admins can update incident reports"
  on incident_reports for update
  using (is_admin());

-- notifications
create policy "Admins can view their own notifications"
  on notifications for select
  using (recipient_id = auth.uid() and is_admin());

create policy "Admins can mark their notifications read"
  on notifications for update
  using (recipient_id = auth.uid() and is_admin());
