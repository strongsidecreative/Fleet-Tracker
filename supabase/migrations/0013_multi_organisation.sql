-- Fleet Tracker — multi-organisation support
-- Run after 0012_push_notifications.sql, in the Supabase SQL Editor.
--
-- Turns Fleet Tracker from "one family, one deployment" into "one shared
-- deployment, many organisations" — each organisation's data is invisible
-- to every other organisation, enforced by Postgres Row Level Security,
-- not just by the app's queries. Nothing here needs a second Supabase
-- project, a second Vercel deployment, or any paid tier: it's the same
-- free-tier database and hosting, just with an organisation_id column and
-- RLS check added throughout.
--
-- Safe to run once. All existing data (your current family/organisation)
-- is backfilled into one new "My Organisation" row so nothing breaks —
-- rename it afterwards from Admin → Account.

-- ============================================================
-- 1. organisations
-- ============================================================
create table if not exists organisations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

alter table organisations enable row level security;

-- Note: the policies for `organisations` itself are created further below
-- (end of this section), not here — they reference profiles.organisation_id,
-- which doesn't exist as a column until the "add column" statements just
-- after this run. Creating them here, before that column exists, would
-- fail with "column organisation_id does not exist".

-- ============================================================
-- 2. organisation_id column on every table that holds org-specific data
-- ============================================================
alter table profiles add column if not exists organisation_id uuid references organisations(id);
alter table vehicles add column if not exists organisation_id uuid references organisations(id);
alter table vehicle_usage add column if not exists organisation_id uuid references organisations(id);
alter table audit_log add column if not exists organisation_id uuid references organisations(id);
alter table incident_reports add column if not exists organisation_id uuid references organisations(id);
alter table notifications add column if not exists organisation_id uuid references organisations(id);
alter table bookings add column if not exists organisation_id uuid references organisations(id);
alter table booking_series add column if not exists organisation_id uuid references organisations(id);
alter table driver_licences add column if not exists organisation_id uuid references organisations(id);
alter table vehicle_checks add column if not exists organisation_id uuid references organisations(id);
alter table vehicle_check_items add column if not exists organisation_id uuid references organisations(id);
alter table push_subscriptions add column if not exists organisation_id uuid references organisations(id);

-- Now that profiles.organisation_id exists, the organisations table's own
-- policies can be created (they read the caller's org via that column).
drop policy if exists "Members can view their own organisation" on organisations;
create policy "Members can view their own organisation"
  on organisations for select
  using (id = (select organisation_id from profiles where id = auth.uid()));

drop policy if exists "Admins can rename their own organisation" on organisations;
create policy "Admins can rename their own organisation"
  on organisations for update
  using (is_admin() and id = (select organisation_id from profiles where id = auth.uid()))
  with check (is_admin() and id = (select organisation_id from profiles where id = auth.uid()));

-- No insert policy: organisations are only ever created by the /setup
-- flow, which uses the service-role client and bypasses RLS entirely.
-- No authenticated admin session can create one through the normal client.

-- ============================================================
-- 3. Backfill — everything that already exists belongs to one
--    organisation (there was only ever one, until now).
-- ============================================================
do $$
declare
  default_org_id uuid;
begin
  if exists (select 1 from profiles where organisation_id is null limit 1) then
    insert into organisations (name) values ('My Organisation') returning id into default_org_id;

    update profiles set organisation_id = default_org_id where organisation_id is null;
    update vehicles set organisation_id = default_org_id where organisation_id is null;
    update vehicle_usage set organisation_id = default_org_id where organisation_id is null;
    update audit_log set organisation_id = default_org_id where organisation_id is null;
    update incident_reports set organisation_id = default_org_id where organisation_id is null;
    update notifications set organisation_id = default_org_id where organisation_id is null;
    update bookings set organisation_id = default_org_id where organisation_id is null;
    update booking_series set organisation_id = default_org_id where organisation_id is null;
    update driver_licences set organisation_id = default_org_id where organisation_id is null;
    update vehicle_checks set organisation_id = default_org_id where organisation_id is null;
    update vehicle_check_items set organisation_id = default_org_id where organisation_id is null;
    update push_subscriptions set organisation_id = default_org_id where organisation_id is null;
  end if;
end $$;

alter table profiles alter column organisation_id set not null;
alter table vehicles alter column organisation_id set not null;
alter table vehicle_usage alter column organisation_id set not null;
alter table audit_log alter column organisation_id set not null;
alter table incident_reports alter column organisation_id set not null;
alter table notifications alter column organisation_id set not null;
alter table bookings alter column organisation_id set not null;
alter table booking_series alter column organisation_id set not null;
alter table driver_licences alter column organisation_id set not null;
alter table vehicle_checks alter column organisation_id set not null;
alter table vehicle_check_items alter column organisation_id set not null;
alter table push_subscriptions alter column organisation_id set not null;

-- ============================================================
-- 4. current_org_id() — the calling user's own organisation.
--    SECURITY DEFINER, and deliberately so: the "Admins can view all
--    profiles" policy (below) itself calls current_org_id() in its
--    USING clause. If this function ran as the caller (invoker rights)
--    its own `select ... from profiles` would re-trigger evaluation of
--    every SELECT policy on profiles, including that same admin policy,
--    which calls current_org_id() again — infinite recursion ("stack
--    depth limit exceeded"), reproduced while testing this migration
--    locally. Running as the function owner (the table owner, who is
--    exempt from RLS by default) breaks that cycle. search_path is
--    pinned so it can't be hijacked by a same-named object elsewhere.
-- ============================================================
create or replace function current_org_id()
returns uuid as $$
  select organisation_id from profiles where id = auth.uid();
$$ language sql stable security definer set search_path = public;

-- ============================================================
-- 5. Auto-stamp organisation_id on insert, for tables where the
--    inserting user is acting on their own behalf through the normal
--    authenticated client (drivers submitting their own rows, admins
--    creating vehicles/bookings/etc. through their own session).
--
--    Deliberately NOT applied to `profiles`: every profile is created
--    through the service-role client (invite flow, /setup), which has
--    no user session for current_org_id() to read — those inserts set
--    organisation_id explicitly in application code instead. Making the
--    column NOT NULL with no trigger and no default means a missing
--    value fails loudly rather than silently landing in the wrong org.
-- ============================================================
create or replace function set_organisation_id()
returns trigger as $$
begin
  if new.organisation_id is null then
    new.organisation_id := current_org_id();
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_set_org_vehicles on vehicles;
create trigger trg_set_org_vehicles before insert on vehicles
  for each row execute function set_organisation_id();

drop trigger if exists trg_set_org_vehicle_usage on vehicle_usage;
create trigger trg_set_org_vehicle_usage before insert on vehicle_usage
  for each row execute function set_organisation_id();

drop trigger if exists trg_set_org_audit_log on audit_log;
create trigger trg_set_org_audit_log before insert on audit_log
  for each row execute function set_organisation_id();

drop trigger if exists trg_set_org_incident_reports on incident_reports;
create trigger trg_set_org_incident_reports before insert on incident_reports
  for each row execute function set_organisation_id();

drop trigger if exists trg_set_org_bookings on bookings;
create trigger trg_set_org_bookings before insert on bookings
  for each row execute function set_organisation_id();

drop trigger if exists trg_set_org_booking_series on booking_series;
create trigger trg_set_org_booking_series before insert on booking_series
  for each row execute function set_organisation_id();

drop trigger if exists trg_set_org_driver_licences on driver_licences;
create trigger trg_set_org_driver_licences before insert on driver_licences
  for each row execute function set_organisation_id();

drop trigger if exists trg_set_org_vehicle_checks on vehicle_checks;
create trigger trg_set_org_vehicle_checks before insert on vehicle_checks
  for each row execute function set_organisation_id();

drop trigger if exists trg_set_org_vehicle_check_items on vehicle_check_items;
create trigger trg_set_org_vehicle_check_items before insert on vehicle_check_items
  for each row execute function set_organisation_id();

drop trigger if exists trg_set_org_push_subscriptions on push_subscriptions;
create trigger trg_set_org_push_subscriptions before insert on push_subscriptions
  for each row execute function set_organisation_id();

-- notifications is deliberately excluded — every insert into it already
-- happens inside a security-definer function (see section 7 below), each
-- of which sets organisation_id explicitly based on the row it's notifying
-- about, not based on who's logged in (several of them run from pg_cron,
-- with no logged-in user at all).

-- ============================================================
-- 6. Re-scope every existing RLS policy to also require same-organisation.
--    Each policy keeps its original name and original access rule; this
--    only adds "and organisation_id = current_org_id()" (or the
--    equivalent) alongside what was already there.
-- ============================================================

-- profiles
drop policy if exists "Admins can view all profiles" on profiles;
create policy "Admins can view all profiles"
  on profiles for select
  using (is_admin() and organisation_id = current_org_id());

drop policy if exists "Admins can insert profiles" on profiles;
create policy "Admins can insert profiles"
  on profiles for insert
  with check (is_admin() and organisation_id = current_org_id());

drop policy if exists "Admins can update any profile" on profiles;
create policy "Admins can update any profile"
  on profiles for update
  using (is_admin() and organisation_id = current_org_id());

-- vehicles
drop policy if exists "Any logged-in user can view active vehicles" on vehicles;
create policy "Any logged-in user can view active vehicles"
  on vehicles for select
  using (organisation_id = current_org_id() and (active = true or is_admin()));

drop policy if exists "Admins can insert vehicles" on vehicles;
create policy "Admins can insert vehicles"
  on vehicles for insert
  with check (is_admin() and organisation_id = current_org_id());

drop policy if exists "Admins can update vehicles" on vehicles;
create policy "Admins can update vehicles"
  on vehicles for update
  using (is_admin() and organisation_id = current_org_id());

-- vehicle_usage
drop policy if exists "Admins can view all usage" on vehicle_usage;
create policy "Admins can view all usage"
  on vehicle_usage for select
  using (is_admin() and organisation_id = current_org_id());

drop policy if exists "Drivers can start their own trip" on vehicle_usage;
create policy "Drivers can start their own trip"
  on vehicle_usage for insert
  with check (driver_id = auth.uid() and organisation_id = current_org_id());

drop policy if exists "Admins can insert usage records" on vehicle_usage;
create policy "Admins can insert usage records"
  on vehicle_usage for insert
  with check (is_admin() and organisation_id = current_org_id());

drop policy if exists "Admins can update any usage record" on vehicle_usage;
create policy "Admins can update any usage record"
  on vehicle_usage for update
  using (is_admin() and organisation_id = current_org_id());

-- audit_log
drop policy if exists "Admins can view audit log" on audit_log;
create policy "Admins can view audit log"
  on audit_log for select
  using (is_admin() and organisation_id = current_org_id());

drop policy if exists "Admins can insert audit log entries" on audit_log;
create policy "Admins can insert audit log entries"
  on audit_log for insert
  with check (is_admin() and organisation_id = current_org_id());

-- incident_reports
drop policy if exists "Admins can view all incident reports" on incident_reports;
create policy "Admins can view all incident reports"
  on incident_reports for select
  using (is_admin() and organisation_id = current_org_id());

drop policy if exists "Admins can update incident reports" on incident_reports;
create policy "Admins can update incident reports"
  on incident_reports for update
  using (is_admin() and organisation_id = current_org_id());

drop policy if exists "Admins can create incident reports" on incident_reports;
create policy "Admins can create incident reports"
  on incident_reports for insert
  with check (is_admin() and organisation_id = current_org_id());

drop policy if exists "Drivers can submit incident reports" on incident_reports;
create policy "Drivers can submit incident reports"
  on incident_reports for insert
  with check (driver_id = auth.uid() and organisation_id = current_org_id());

-- notifications (still no insert policy — see section 7)
drop policy if exists "Admins can view their own notifications" on notifications;
create policy "Admins can view their own notifications"
  on notifications for select
  using (recipient_id = auth.uid() and is_admin() and organisation_id = current_org_id());

drop policy if exists "Admins can mark their notifications read" on notifications;
create policy "Admins can mark their notifications read"
  on notifications for update
  using (recipient_id = auth.uid() and is_admin() and organisation_id = current_org_id());

-- bookings
drop policy if exists "Admins can view all bookings" on bookings;
create policy "Admins can view all bookings"
  on bookings for select
  using (is_admin() and organisation_id = current_org_id());

drop policy if exists "Drivers can create their own bookings" on bookings;
create policy "Drivers can create their own bookings"
  on bookings for insert
  with check (driver_id = auth.uid() and organisation_id = current_org_id());

drop policy if exists drivers_update_own_bookings on bookings;
create policy drivers_update_own_bookings on bookings
  for update
  using (driver_id = auth.uid() and organisation_id = current_org_id())
  with check (driver_id = auth.uid() and organisation_id = current_org_id());

drop policy if exists admins_update_bookings on bookings;
create policy admins_update_bookings on bookings
  for update
  using (is_admin() and organisation_id = current_org_id());

-- booking_series
drop policy if exists admins_select_all_series on booking_series;
create policy admins_select_all_series on booking_series
  for select using (is_admin() and organisation_id = current_org_id());

drop policy if exists drivers_insert_own_series on booking_series;
create policy drivers_insert_own_series on booking_series
  for insert with check (driver_id = auth.uid() and organisation_id = current_org_id());

drop policy if exists admins_insert_series on booking_series;
create policy admins_insert_series on booking_series
  for insert with check (is_admin() and organisation_id = current_org_id());

-- driver_licences
drop policy if exists admins_select_all_licences on driver_licences;
create policy admins_select_all_licences on driver_licences
  for select using (is_admin() and organisation_id = current_org_id());

drop policy if exists admins_insert_licences on driver_licences;
create policy admins_insert_licences on driver_licences
  for insert with check (is_admin() and organisation_id = current_org_id());

drop policy if exists admins_update_licences on driver_licences;
create policy admins_update_licences on driver_licences
  for update using (is_admin() and organisation_id = current_org_id());

drop policy if exists admins_delete_licences on driver_licences;
create policy admins_delete_licences on driver_licences
  for delete using (is_admin() and organisation_id = current_org_id());

-- vehicle_checks
drop policy if exists drivers_insert_own_checks on vehicle_checks;
create policy drivers_insert_own_checks on vehicle_checks
  for insert with check (driver_id = auth.uid() and organisation_id = current_org_id());

drop policy if exists admins_select_all_checks on vehicle_checks;
create policy admins_select_all_checks on vehicle_checks
  for select using (is_admin() and organisation_id = current_org_id());

-- vehicle_check_items
drop policy if exists admins_select_all_check_items on vehicle_check_items;
create policy admins_select_all_check_items on vehicle_check_items
  for select using (is_admin() and organisation_id = current_org_id());

-- push_subscriptions — already fully self-scoped by user_id with no
-- admin-wide read policy, so there's no cross-org leak vector here. No
-- policy change needed; the column exists for consistency/indexing only.

-- ============================================================
-- 7. Cross-join fixes — these functions previously matched "every
--    admin" or "every vehicle" with no organisation boundary at all.
--    That was correct back when there was only ever one organisation;
--    left as-is, it would now leak one organisation's maintenance
--    alerts, licence expiries, and incident/check notifications to
--    every OTHER organisation's admins too. This is the one part of
--    this migration that isn't just "add an RLS check" — these run
--    as security-definer functions (some from pg_cron, with no logged
--    -in user at all), so they scope explicitly by the row's own
--    organisation_id rather than relying on current_org_id().
-- ============================================================

create or replace function notify_admins_of_incident()
returns trigger as $$
begin
  insert into notifications (recipient_id, type, message, related_table, related_id, organisation_id)
  select p.id, 'incident_report',
         (select name from vehicles where id = new.vehicle_id) || ': ' ||
         left(new.description, 100),
         'incident_reports', new.id, new.organisation_id
  from profiles p
  where p.role = 'admin' and p.active = true and p.organisation_id = new.organisation_id;
  return new;
end;
$$ language plpgsql security definer;

create or replace function check_maintenance_due()
returns void as $$
begin
  -- WOF
  insert into notifications (recipient_id, type, message, related_table, related_id, organisation_id)
  select p.id, 'maintenance_due',
         v.name || ' WOF is due ' || to_char(v.wof_due, 'DD Mon YYYY'),
         'vehicles', v.id, v.organisation_id
  from vehicles v
  join profiles p on p.organisation_id = v.organisation_id
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
  insert into notifications (recipient_id, type, message, related_table, related_id, organisation_id)
  select p.id, 'maintenance_due',
         v.name || ' registration is due ' || to_char(v.rego_due, 'DD Mon YYYY'),
         'vehicles', v.id, v.organisation_id
  from vehicles v
  join profiles p on p.organisation_id = v.organisation_id
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
  insert into notifications (recipient_id, type, message, related_table, related_id, organisation_id)
  select p.id, 'maintenance_due',
         v.name || ' service is due ' || to_char(v.service_due_date, 'DD Mon YYYY'),
         'vehicles', v.id, v.organisation_id
  from vehicles v
  join profiles p on p.organisation_id = v.organisation_id
  where p.role = 'admin' and p.active = true
    and v.active and v.service_due_date is not null
    and v.service_due_date <= current_date + interval '14 days'
    and not exists (
      select 1 from notifications n
      where n.related_id = v.id and n.type = 'maintenance_due'
        and n.message like '%service is due%'
        and n.created_at > now() - interval '7 days'
    );

  -- Service — by odometer
  insert into notifications (recipient_id, type, message, related_table, related_id, organisation_id)
  select p.id, 'maintenance_due',
         v.name || ' service is due soon (' || v.current_odometer || ' / ' || v.service_due_km || ' KM)',
         'vehicles', v.id, v.organisation_id
  from vehicles v
  join profiles p on p.organisation_id = v.organisation_id
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

create or replace function check_driver_licence_alerts()
returns void as $$
declare
  r record;
  days_left int;
begin
  for r in
    select dl.*, p.name as driver_name, p.organisation_id as org_id
    from driver_licences dl
    join profiles p on p.id = dl.driver_id
    where p.active = true
  loop
    days_left := r.expiry_date - current_date;

    if days_left <= 0 then
      insert into notifications (recipient_id, type, message, related_table, related_id, dedupe_key, organisation_id)
      select adm.id, 'licence_expiring',
             r.driver_name || ': DRIVER LICENCE EXPIRED (expired ' || to_char(r.expiry_date, 'DD Mon YYYY') || ')',
             'driver_licences', r.id, 'licence:' || r.driver_id || ':' || r.expiry_date || ':expired', r.org_id
      from profiles adm where adm.role = 'admin' and adm.active = true and adm.organisation_id = r.org_id
      and not exists (select 1 from notifications n where n.recipient_id = adm.id and n.dedupe_key = 'licence:' || r.driver_id || ':' || r.expiry_date || ':expired');
    elsif days_left <= 7 then
      insert into notifications (recipient_id, type, message, related_table, related_id, dedupe_key, organisation_id)
      select adm.id, 'licence_expiring',
             r.driver_name || ': DRIVER LICENCE EXPIRING in ' || days_left || ' days (Urgent)',
             'driver_licences', r.id, 'licence:' || r.driver_id || ':' || r.expiry_date || ':7', r.org_id
      from profiles adm where adm.role = 'admin' and adm.active = true and adm.organisation_id = r.org_id
      and not exists (select 1 from notifications n where n.recipient_id = adm.id and n.dedupe_key = 'licence:' || r.driver_id || ':' || r.expiry_date || ':7');
    elsif days_left <= 14 then
      insert into notifications (recipient_id, type, message, related_table, related_id, dedupe_key, organisation_id)
      select adm.id, 'licence_expiring',
             r.driver_name || ': Driver licence expiring in ' || days_left || ' days (Due Soon)',
             'driver_licences', r.id, 'licence:' || r.driver_id || ':' || r.expiry_date || ':14', r.org_id
      from profiles adm where adm.role = 'admin' and adm.active = true and adm.organisation_id = r.org_id
      and not exists (select 1 from notifications n where n.recipient_id = adm.id and n.dedupe_key = 'licence:' || r.driver_id || ':' || r.expiry_date || ':14');
    elsif days_left <= 30 then
      insert into notifications (recipient_id, type, message, related_table, related_id, dedupe_key, organisation_id)
      select adm.id, 'licence_expiring',
             r.driver_name || ': Driver licence expiring in ' || days_left || ' days (Upcoming)',
             'driver_licences', r.id, 'licence:' || r.driver_id || ':' || r.expiry_date || ':30', r.org_id
      from profiles adm where adm.role = 'admin' and adm.active = true and adm.organisation_id = r.org_id
      and not exists (select 1 from notifications n where n.recipient_id = adm.id and n.dedupe_key = 'licence:' || r.driver_id || ':' || r.expiry_date || ':30');
    end if;
  end loop;
end;
$$ language plpgsql security definer;

create or replace function notify_admins_of_check_issue()
returns trigger as $$
begin
  if new.issue_count > 0 then
    insert into notifications (recipient_id, type, message, related_table, related_id, organisation_id)
    select p.id, 'vehicle_check_issue',
           (select name from vehicles where id = new.vehicle_id) || ': ' || new.issue_count ||
           ' issue(s) reported on ' || new.check_type || '-operation check',
           'vehicle_checks', new.id, new.organisation_id
    from profiles p
    where p.role = 'admin' and p.active = true and p.organisation_id = new.organisation_id;
  end if;
  return new;
end;
$$ language plpgsql security definer;

create or replace function notify_approving_admin()
returns trigger as $$
declare
  is_first_in_series boolean;
begin
  if new.approval_status <> 'pending' or new.approving_admin_id is null then
    return new;
  end if;

  is_first_in_series := new.series_id is null
    or not exists (select 1 from bookings b where b.series_id = new.series_id and b.id <> new.id);

  if is_first_in_series then
    insert into notifications (recipient_id, type, message, related_table, related_id, organisation_id)
    values (
      new.approving_admin_id,
      'booking_created',
      (select name from profiles where id = new.driver_id) || ' requested ' ||
      coalesce((select name from vehicles where id = new.vehicle_id), 'a vehicle (to be assigned)') ||
      ' — ' || coalesce(new.title, 'Booking') ||
      case when new.series_id is not null then ' (recurring)' else '' end,
      'bookings',
      new.id,
      new.organisation_id
    );
  end if;

  return new;
end;
$$ language plpgsql security definer;

-- ============================================================
-- Done. Every table above now has organisation_id set not null and RLS
-- scoped to it, so a query run as a logged-in user only ever sees rows
-- from their own organisation. New organisations are created by
-- /setup — see app/setup/actions.ts — which now asks for an
-- organisation name as well as the first admin's details, and no longer
-- locks itself after the first use: it's meant to be reused, sent
-- privately to each new client, each time creating a brand new
-- organisation and a brand new first admin for it.
-- ============================================================
