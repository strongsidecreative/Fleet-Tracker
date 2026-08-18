-- Fleet Tracker — booking approval + recurring bookings
-- Run after 0007_driver_licence_vehicle_checks.sql
-- Does NOT modify 0001–0007. Extends the existing bookings table from 0003
-- rather than replacing it, and migrates existing rows to the new model.

-- ============================================================
-- 1. Recurring series metadata — one row per recurring request,
--    holding the human-readable pattern. Individual occurrences
--    live as normal rows in `bookings`, each independently
--    editable/cancellable later, per spec §19.
-- ============================================================
create table if not exists booking_series (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references profiles(id),
  vehicle_id uuid references vehicles(id),
  title text not null,
  pattern jsonb not null, -- { days: ['mon','tue'], repeat: 'weekly', endType: 'weeks'|'date'|'occurrences', endValue: ... }
  created_at timestamptz not null default now()
);

alter table booking_series enable row level security;

drop policy if exists drivers_select_own_series on booking_series;
create policy drivers_select_own_series on booking_series
  for select using (driver_id = auth.uid());

drop policy if exists admins_select_all_series on booking_series;
create policy admins_select_all_series on booking_series
  for select using (is_admin());

drop policy if exists drivers_insert_own_series on booking_series;
create policy drivers_insert_own_series on booking_series
  for insert with check (driver_id = auth.uid());

drop policy if exists admins_insert_series on booking_series;
create policy admins_insert_series on booking_series
  for insert with check (is_admin());

-- ============================================================
-- 2. Extend the existing bookings table (from 0003) with the
--    approval workflow. Vehicle becomes optional ("To Be Assigned").
-- ============================================================
alter table bookings alter column vehicle_id drop not null;
alter table bookings add column if not exists title text;
alter table bookings add column if not exists approval_status text not null default 'pending'
  check (approval_status in ('pending', 'approved', 'declined'));
alter table bookings add column if not exists booking_status text not null default 'upcoming'
  check (booking_status in ('upcoming', 'active', 'completed', 'cancelled'));
alter table bookings add column if not exists approving_admin_id uuid references profiles(id);
alter table bookings add column if not exists decided_by uuid references profiles(id);
alter table bookings add column if not exists decided_at timestamptz;
alter table bookings add column if not exists decision_note text;
alter table bookings add column if not exists created_by uuid references profiles(id);
alter table bookings add column if not exists vehicle_required boolean not null default false;
alter table bookings add column if not exists series_id uuid references booking_series(id);
alter table bookings add column if not exists linked_trip_id uuid references vehicle_usage(id);

alter table bookings add constraint bookings_vehicle_or_required
  check (vehicle_id is not null or vehicle_required = true);

-- Backfill existing rows created under the old model (no approval step)
-- so they carry forward as already-approved, matching prior behaviour.
update bookings
set approval_status = 'approved',
    booking_status = case when status = 'cancelled' then 'cancelled' else 'upcoming' end,
    created_by = driver_id,
    title = coalesce(title, 'Booking')
where approval_status is null or approval_status = 'pending';

-- ============================================================
-- 3. Reservation = approved AND still upcoming/active. A pending
--    request does NOT reserve the vehicle — this is the crux of
--    the whole feature. Replaces the old status='upcoming' based
--    exclusion constraint from 0003.
-- ============================================================
alter table bookings drop constraint if exists no_overlapping_bookings;

alter table bookings
  add constraint no_overlapping_approved_bookings
  exclude using gist (
    vehicle_id with =,
    tstzrange(start_datetime, end_datetime) with &&
  )
  where (approval_status = 'approved' and booking_status in ('upcoming', 'active'));

-- ============================================================
-- 4. Notify the SELECTED approving admin (not every admin) the
--    moment a request is submitted. For a recurring series, only
--    the first occurrence inserted triggers the notification —
--    sibling rows already existing in the same series means this
--    isn't the first, so it stays quiet and avoids one notification
--    per occurrence.
-- ============================================================
drop trigger if exists trg_notify_booking on bookings;
drop function if exists notify_admins_of_booking();

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
    insert into notifications (recipient_id, type, message, related_table, related_id)
    values (
      new.approving_admin_id,
      'booking_created',
      (select name from profiles where id = new.driver_id) || ' requested ' ||
      coalesce((select name from vehicles where id = new.vehicle_id), 'a vehicle (to be assigned)') ||
      ' — ' || coalesce(new.title, 'Booking') ||
      case when new.series_id is not null then ' (recurring)' else '' end,
      'bookings',
      new.id
    );
  end if;

  return new;
end;
$$ language plpgsql security definer;

create trigger trg_notify_approving_admin
  after insert on bookings
  for each row execute function notify_approving_admin();

-- ============================================================
-- 5. Hard lock on QR check-out now checks APPROVED bookings only
--    — a pending request must never block another driver.
-- ============================================================
create or replace function check_booking_lock()
returns trigger as $$
declare
  conflicting_driver uuid;
  conflicting_end timestamptz;
begin
  select driver_id, end_datetime into conflicting_driver, conflicting_end
  from bookings
  where vehicle_id = new.vehicle_id
    and approval_status = 'approved'
    and booking_status in ('upcoming', 'active')
    and driver_id != new.driver_id
    and start_datetime <= now()
    and end_datetime >= now()
  limit 1;

  if conflicting_driver is not null then
    raise exception 'This vehicle is booked by another driver until %', conflicting_end;
  end if;

  return new;
end;
$$ language plpgsql;

-- (trigger trg_check_booking_lock already exists from 0003 and points at
-- this same function name, so no re-creation needed)

-- ============================================================
-- 6. Notification types used by this feature
-- ============================================================
alter table notifications drop constraint if exists notifications_type_check;
alter table notifications add constraint notifications_type_check
  check (type in (
    'maintenance_due', 'incident_report', 'report_ready', 'booking_created',
    'licence_expiring', 'vehicle_check_issue', 'booking_approved', 'booking_declined',
    'booking_cancelled', 'booking_override'
  ));

-- ============================================================
-- 7. RLS: drivers can no longer freely update their own bookings
--    (that was fine before approval existed — now it would let a
--    driver flip their own approval_status). Replace the old
--    "drivers can cancel their own bookings" policy with a strict
--    one that only allows cancelling, never touching approval
--    fields — enforced by only exposing a cancel action in the app
--    AND by restricting which columns matter operationally; the
--    real backstop is that approve/decline only ever runs through
--    a server action using the admin's own session, checked below.
-- ============================================================
drop policy if exists drivers_update_own_bookings on bookings;
create policy drivers_update_own_bookings on bookings
  for update
  using (driver_id = auth.uid())
  with check (driver_id = auth.uid());

drop policy if exists admins_update_bookings on bookings;
create policy admins_update_bookings on bookings
  for update
  using (is_admin());

-- Drivers ARE allowed to UPDATE their own booking rows (needed to cancel a
-- future booking themselves), so RLS alone can't stop a driver's own
-- update from also flipping approval_status, approving_admin_id,
-- decided_by, decided_at, or decision_note. This trigger is the actual
-- enforcement: any change to those columns must come from an admin,
-- regardless of whose row it is or what the client sends.
create or replace function guard_approval_fields()
returns trigger as $$
begin
  if (new.approval_status is distinct from old.approval_status
      or new.approving_admin_id is distinct from old.approving_admin_id
      or new.decided_by is distinct from old.decided_by
      or new.decided_at is distinct from old.decided_at
      or new.decision_note is distinct from old.decision_note)
     and not is_admin() then
    raise exception 'Only an admin can change a booking''s approval status.';
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_guard_approval_fields on bookings;
create trigger trg_guard_approval_fields
  before update on bookings
  for each row execute function guard_approval_fields();
