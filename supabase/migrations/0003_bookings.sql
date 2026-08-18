-- Family Vehicle Tracker — vehicle booking system
-- Run after 0002_maintenance_and_incidents.sql
-- Requires the btree_gist extension for the overlap-prevention constraint.

create extension if not exists btree_gist;

create table bookings (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references vehicles(id),
  driver_id uuid not null references profiles(id),
  start_datetime timestamptz not null,
  end_datetime timestamptz not null,
  notes text,
  status text not null check (status in ('upcoming', 'cancelled')) default 'upcoming',
  created_at timestamptz not null default now(),

  constraint end_after_start check (end_datetime > start_datetime)
);

-- Prevents two upcoming bookings on the same vehicle from overlapping,
-- enforced at the database level rather than only checked in the app.
alter table bookings
  add constraint no_overlapping_bookings
  exclude using gist (
    vehicle_id with =,
    tstzrange(start_datetime, end_datetime) with &&
  )
  where (status = 'upcoming');

alter table bookings enable row level security;

-- Hard lock: a trip cannot start on a vehicle while someone else's
-- booking currently covers that moment. Enforced here, not just in the
-- app, since the app-layer check is only a convenience for the driver.
create or replace function check_booking_lock()
returns trigger as $$
declare
  conflicting_driver uuid;
  conflicting_end timestamptz;
begin
  select driver_id, end_datetime into conflicting_driver, conflicting_end
  from bookings
  where vehicle_id = new.vehicle_id
    and status = 'upcoming'
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

create trigger trg_check_booking_lock
  before insert on vehicle_usage
  for each row execute function check_booking_lock();

create policy "Drivers can view their own bookings"
  on bookings for select
  using (driver_id = auth.uid());

create policy "Admins can view all bookings"
  on bookings for select
  using (is_admin());

create policy "Drivers can create their own bookings"
  on bookings for insert
  with check (driver_id = auth.uid());

create policy "Drivers can cancel their own bookings"
  on bookings for update
  using (driver_id = auth.uid())
  with check (driver_id = auth.uid());

create policy "Admins can manage any booking"
  on bookings for update
  using (is_admin());
