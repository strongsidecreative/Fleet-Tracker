-- Family Vehicle Tracker — initial schema
-- Run this in the Supabase SQL Editor (or via `supabase db push` later).

-- ============================================================
-- 1. profiles
-- ============================================================
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null,
  role text not null check (role in ('admin', 'driver')) default 'driver',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- 2. vehicles
-- ============================================================
create table vehicles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  make text,
  model text,
  year int,
  registration text not null,
  photo_url text,
  current_odometer numeric not null default 0,
  active boolean not null default true,
  qr_identifier uuid not null default gen_random_uuid() unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- 3. vehicle_usage
-- ============================================================
create table vehicle_usage (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references vehicles(id),
  driver_id uuid not null references profiles(id),
  start_km numeric not null,
  end_km numeric,
  kilometres_used numeric generated always as (end_km - start_km) stored,
  start_datetime timestamptz not null default now(),
  end_datetime timestamptz,
  status text not null check (status in ('active', 'completed', 'corrected', 'cancelled')) default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint end_km_not_below_start check (end_km is null or end_km >= start_km),
  constraint start_km_not_negative check (start_km >= 0)
);

create unique index one_active_trip_per_vehicle
  on vehicle_usage (vehicle_id)
  where status = 'active';

create unique index one_active_trip_per_driver
  on vehicle_usage (driver_id)
  where status = 'active';

-- ============================================================
-- 4. audit_log
-- ============================================================
create table audit_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id),
  record_type text not null,
  record_id uuid not null,
  action text not null,
  old_value jsonb,
  new_value jsonb,
  timestamp timestamptz not null default now()
);

-- ============================================================
-- 5. Triggers
-- ============================================================

-- Reject a new trip if start_km is below the vehicle's last known reading.
create or replace function check_odometer_consistency()
returns trigger as $$
declare
  last_km numeric;
begin
  select current_odometer into last_km from vehicles where id = new.vehicle_id;
  if new.start_km < last_km then
    raise exception 'Starting KM (%) is below the vehicle''s last recorded odometer (%)', new.start_km, last_km;
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_check_odometer
  before insert on vehicle_usage
  for each row execute function check_odometer_consistency();

-- Keep vehicles.current_odometer in sync whenever a trip completes.
create or replace function update_vehicle_odometer()
returns trigger as $$
begin
  if new.status = 'completed' and new.end_km is not null then
    update vehicles set current_odometer = new.end_km, updated_at = now() where id = new.vehicle_id;
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_update_odometer
  after update on vehicle_usage
  for each row execute function update_vehicle_odometer();

-- ============================================================
-- 6. Row Level Security
-- ============================================================
alter table profiles enable row level security;
alter table vehicles enable row level security;
alter table vehicle_usage enable row level security;
alter table audit_log enable row level security;

create or replace function is_admin()
returns boolean as $$
  select role = 'admin' from profiles where id = auth.uid();
$$ language sql stable;

-- profiles
create policy "Drivers can view their own profile"
  on profiles for select
  using (id = auth.uid());

create policy "Admins can view all profiles"
  on profiles for select
  using (is_admin());

create policy "Admins can insert profiles"
  on profiles for insert
  with check (is_admin());

create policy "Admins can update any profile"
  on profiles for update
  using (is_admin());

-- vehicles
create policy "Any logged-in user can view active vehicles"
  on vehicles for select
  using (active = true or is_admin());

create policy "Admins can insert vehicles"
  on vehicles for insert
  with check (is_admin());

create policy "Admins can update vehicles"
  on vehicles for update
  using (is_admin());

-- vehicle_usage
create policy "Drivers can view their own usage"
  on vehicle_usage for select
  using (driver_id = auth.uid());

create policy "Admins can view all usage"
  on vehicle_usage for select
  using (is_admin());

create policy "Drivers can start their own trip"
  on vehicle_usage for insert
  with check (driver_id = auth.uid());

create policy "Admins can insert usage records"
  on vehicle_usage for insert
  with check (is_admin());

create policy "Drivers can complete their own active trip"
  on vehicle_usage for update
  using (driver_id = auth.uid() and status = 'active')
  with check (driver_id = auth.uid());

create policy "Admins can update any usage record"
  on vehicle_usage for update
  using (is_admin());

-- audit_log
create policy "Admins can view audit log"
  on audit_log for select
  using (is_admin());

create policy "Admins can insert audit log entries"
  on audit_log for insert
  with check (is_admin());
