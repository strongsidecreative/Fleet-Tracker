-- Fleet Tracker — driver licence management + standalone vehicle checks
-- Run after 0006_vehicle_photos.sql
-- Does NOT modify, rerun, or depend on changes to 0001–0006.

-- ============================================================
-- 1. Driver licences — separate table, not bolted onto profiles.
--    Sensitive, admin-managed, one row per driver.
-- ============================================================
create table if not exists driver_licences (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null unique references profiles(id) on delete cascade,
  licence_number text not null,
  version_number text,
  licence_class text,
  expiry_date date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references profiles(id)
);

alter table driver_licences enable row level security;

drop policy if exists drivers_select_own_licence on driver_licences;
create policy drivers_select_own_licence on driver_licences
  for select
  using (driver_id = auth.uid());

drop policy if exists admins_select_all_licences on driver_licences;
create policy admins_select_all_licences on driver_licences
  for select
  using (is_admin());

drop policy if exists admins_insert_licences on driver_licences;
create policy admins_insert_licences on driver_licences
  for insert
  with check (is_admin());

drop policy if exists admins_update_licences on driver_licences;
create policy admins_update_licences on driver_licences
  for update
  using (is_admin());

drop policy if exists admins_delete_licences on driver_licences;
create policy admins_delete_licences on driver_licences
  for delete
  using (is_admin());

-- ============================================================
-- 2. Licence expiry alerts — reuses the existing notifications
--    table and dedupe_key pattern from 0005, just a new type.
-- ============================================================
alter table notifications drop constraint if exists notifications_type_check;
alter table notifications add constraint notifications_type_check
  check (type in ('maintenance_due', 'incident_report', 'report_ready', 'booking_created', 'licence_expiring', 'vehicle_check_issue'));

create or replace function check_driver_licence_alerts()
returns void as $$
declare
  r record;
  days_left int;
begin
  for r in
    select dl.*, p.name as driver_name
    from driver_licences dl
    join profiles p on p.id = dl.driver_id
    where p.active = true
  loop
    days_left := r.expiry_date - current_date;

    if days_left <= 0 then
      insert into notifications (recipient_id, type, message, related_table, related_id, dedupe_key)
      select adm.id, 'licence_expiring',
             r.driver_name || ': DRIVER LICENCE EXPIRED (expired ' || to_char(r.expiry_date, 'DD Mon YYYY') || ')',
             'driver_licences', r.id, 'licence:' || r.driver_id || ':' || r.expiry_date || ':expired'
      from profiles adm where adm.role = 'admin' and adm.active = true
      and not exists (select 1 from notifications n where n.recipient_id = adm.id and n.dedupe_key = 'licence:' || r.driver_id || ':' || r.expiry_date || ':expired');
    elsif days_left <= 7 then
      insert into notifications (recipient_id, type, message, related_table, related_id, dedupe_key)
      select adm.id, 'licence_expiring',
             r.driver_name || ': DRIVER LICENCE EXPIRING in ' || days_left || ' days (Urgent)',
             'driver_licences', r.id, 'licence:' || r.driver_id || ':' || r.expiry_date || ':7'
      from profiles adm where adm.role = 'admin' and adm.active = true
      and not exists (select 1 from notifications n where n.recipient_id = adm.id and n.dedupe_key = 'licence:' || r.driver_id || ':' || r.expiry_date || ':7');
    elsif days_left <= 14 then
      insert into notifications (recipient_id, type, message, related_table, related_id, dedupe_key)
      select adm.id, 'licence_expiring',
             r.driver_name || ': Driver licence expiring in ' || days_left || ' days (Due Soon)',
             'driver_licences', r.id, 'licence:' || r.driver_id || ':' || r.expiry_date || ':14'
      from profiles adm where adm.role = 'admin' and adm.active = true
      and not exists (select 1 from notifications n where n.recipient_id = adm.id and n.dedupe_key = 'licence:' || r.driver_id || ':' || r.expiry_date || ':14');
    elsif days_left <= 30 then
      insert into notifications (recipient_id, type, message, related_table, related_id, dedupe_key)
      select adm.id, 'licence_expiring',
             r.driver_name || ': Driver licence expiring in ' || days_left || ' days (Upcoming)',
             'driver_licences', r.id, 'licence:' || r.driver_id || ':' || r.expiry_date || ':30'
      from profiles adm where adm.role = 'admin' and adm.active = true
      and not exists (select 1 from notifications n where n.recipient_id = adm.id and n.dedupe_key = 'licence:' || r.driver_id || ':' || r.expiry_date || ':30');
    end if;
  end loop;
end;
$$ language plpgsql security definer;

-- Separate cron job from the existing maintenance one — additive, doesn't
-- touch the job created in 0002/0005.
do $$
begin
  if exists (select 1 from cron.job where jobname = 'check_driver_licences_job') then
    perform cron.unschedule('check_driver_licences_job');
  end if;
end $$;

select cron.schedule(
  'check_driver_licences_job',
  '0 7 * * *',
  $$select check_driver_licence_alerts();$$
);

-- ============================================================
-- 3. Vehicle checks — standalone, not linked to trips.
-- ============================================================
create table if not exists vehicle_checks (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references vehicles(id),
  driver_id uuid not null references profiles(id),
  check_type text not null check (check_type in ('pre', 'post')),
  odometer_snapshot numeric not null,
  overall_result text not null check (overall_result in ('all_ok', 'issues_reported')),
  issue_count int not null default 0,
  initials text not null,
  confirmed boolean not null default false,
  created_at timestamptz not null default now(),
  submitted_at timestamptz not null default now()
);

create table if not exists vehicle_check_items (
  id uuid primary key default gen_random_uuid(),
  check_id uuid not null references vehicle_checks(id) on delete cascade,
  item_key text not null,
  item_label text not null,
  result text not null check (result in ('ok', 'issue')),
  comment text,
  photo_url text,
  created_at timestamptz not null default now()
);

alter table vehicle_checks enable row level security;
alter table vehicle_check_items enable row level security;

-- vehicle_checks: create/select own, admins see all. No update/delete for
-- anyone through the app — submitted checks are permanent historical
-- records, matching the "do not silently rewrite history" rule.
drop policy if exists drivers_insert_own_checks on vehicle_checks;
create policy drivers_insert_own_checks on vehicle_checks
  for insert
  with check (driver_id = auth.uid());

drop policy if exists drivers_select_own_checks on vehicle_checks;
create policy drivers_select_own_checks on vehicle_checks
  for select
  using (driver_id = auth.uid());

drop policy if exists admins_select_all_checks on vehicle_checks;
create policy admins_select_all_checks on vehicle_checks
  for select
  using (is_admin());

-- vehicle_check_items: ownership follows the parent check.
drop policy if exists drivers_insert_own_check_items on vehicle_check_items;
create policy drivers_insert_own_check_items on vehicle_check_items
  for insert
  with check (exists (select 1 from vehicle_checks c where c.id = check_id and c.driver_id = auth.uid()));

drop policy if exists drivers_select_own_check_items on vehicle_check_items;
create policy drivers_select_own_check_items on vehicle_check_items
  for select
  using (exists (select 1 from vehicle_checks c where c.id = check_id and c.driver_id = auth.uid()));

drop policy if exists admins_select_all_check_items on vehicle_check_items;
create policy admins_select_all_check_items on vehicle_check_items
  for select
  using (is_admin());

-- ============================================================
-- 4. Allow any authenticated user to upload vehicle check photos
--    into the SAME storage bucket set up in 0006 — no new bucket.
--    Read access is already public from the existing bucket policy.
-- ============================================================
drop policy if exists drivers_upload_check_photos on storage.objects;
create policy drivers_upload_check_photos on storage.objects
  for insert
  with check (
    bucket_id = 'vehicle-photos'
    and (storage.foldername(name))[1] = 'checks'
    and auth.role() = 'authenticated'
  );

-- ============================================================
-- 5. Notify admins the moment a check is submitted with an issue
-- ============================================================
create or replace function notify_admins_of_check_issue()
returns trigger as $$
begin
  if new.issue_count > 0 then
    insert into notifications (recipient_id, type, message, related_table, related_id)
    select p.id, 'vehicle_check_issue',
           (select name from vehicles where id = new.vehicle_id) || ': ' || new.issue_count ||
           ' issue(s) reported on ' || new.check_type || '-operation check',
           'vehicle_checks', new.id
    from profiles p
    where p.role = 'admin' and p.active = true;
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_notify_check_issue on vehicle_checks;
create trigger trg_notify_check_issue
  after insert on vehicle_checks
  for each row execute function notify_admins_of_check_issue();
