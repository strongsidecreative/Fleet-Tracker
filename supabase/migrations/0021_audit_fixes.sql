-- Fleet Tracker: fixes from the 2026-10-10 full function audit
-- Run after 0020_is_admin_security_definer.sql, in the Supabase SQL Editor.
-- Safe to run any number of times. Rollback notes at the bottom.
--
-- What this fixes (numbers match claude/full-function-audit-2026-10-10.md):
--  #1  Ending a trip failed when a vehicle had a compliance alert due:
--      check_vehicle_alerts() inserted notifications without
--      organisation_id (NOT NULL since 0013) and alerted every org's admins.
--      Also restores the daily per-vehicle sweep (0013 had overwritten
--      check_maintenance_due() with the older WOF/rego-only version).
--  #2  A driver finishing a trip never updated vehicles.current_odometer:
--      the trigger ran with the driver's permissions, and drivers can't
--      update vehicles. Now SECURITY DEFINER, and admin-closed
--      ("corrected") sessions update it too (#11).
--  #3  The booking lock never saw other drivers' bookings (RLS). Trigger is
--      now SECURITY DEFINER, plus a read-only RPC the vehicle page uses to
--      show "Vehicle Reserved".
--  #6  A driver editing an approved booking failed: the resubmit
--      notification had no organisation_id.
--  #7  fuel_logs had no organisation_id and unscoped admin policies; two
--      unscoped 0003 booking policies were never dropped.
--  #8  Drivers never received approve/decline/override notifications
--      (no INSERT policy on notifications). New admin-checked RPC.
--  #13 is_admin() now also requires the admin to be active.

-- ============================================================
-- 1. is_admin(): active admins only (#13)
-- ============================================================
create or replace function is_admin()
returns boolean as $$
  select coalesce((select role = 'admin' and active from profiles where id = auth.uid()), false);
$$ language sql stable security definer set search_path = public;

-- ============================================================
-- 2. Trip triggers run as the table owner (#2, #3)
-- ============================================================
create or replace function check_odometer_consistency()
returns trigger as $$
declare
  last_km numeric;
  vehicle_org uuid;
begin
  select current_odometer, organisation_id into last_km, vehicle_org from vehicles where id = new.vehicle_id;
  -- Runs before the organisation_id stamping trigger, hence the coalesce.
  if last_km is null or vehicle_org is distinct from coalesce(new.organisation_id, current_org_id()) then
    raise exception 'That vehicle could not be found.';
  end if;
  if new.start_km < last_km then
    raise exception 'Starting KM (%) is below the vehicle''s last recorded odometer (%)', new.start_km, last_km;
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create or replace function update_vehicle_odometer()
returns trigger as $$
begin
  if new.status in ('completed', 'corrected')
     and new.end_km is not null
     and (old.status is distinct from new.status or old.end_km is distinct from new.end_km) then
    -- greatest(): an older trip closed late never winds the odometer back.
    update vehicles
       set current_odometer = greatest(current_odometer, new.end_km), updated_at = now()
     where id = new.vehicle_id;
    perform check_vehicle_alerts(new.vehicle_id);
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

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
    and driver_id <> new.driver_id
    and start_datetime <= now()
    and end_datetime >= now()
  limit 1;

  if conflicting_driver is not null then
    raise exception 'This vehicle is booked by another driver until %',
      to_char(conflicting_end at time zone 'Pacific/Auckland', 'HH12:MI am, DD Mon');
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

-- Read-only: the approved booking covering this vehicle right now, if any.
-- Lets a driver's vehicle page see someone else's reservation (name, end
-- time) without opening up the bookings table itself. Same-org only.
create or replace function current_vehicle_reservation(p_vehicle_id uuid)
returns table (id uuid, driver_id uuid, driver_name text, end_datetime timestamptz) as $$
  select b.id, b.driver_id, p.name, b.end_datetime
  from bookings b
  join vehicles v on v.id = b.vehicle_id
  left join profiles p on p.id = b.driver_id
  where b.vehicle_id = p_vehicle_id
    and v.organisation_id = current_org_id()
    and b.approval_status = 'approved'
    and b.booking_status in ('upcoming', 'active')
    and b.start_datetime <= now()
    and b.end_datetime >= now()
  order by b.start_datetime
  limit 1;
$$ language sql stable security definer set search_path = public;

revoke all on function current_vehicle_reservation(uuid) from public;
grant execute on function current_vehicle_reservation(uuid) to authenticated;

-- ============================================================
-- 3. Compliance alerts: org-scoped, organisation_id set (#1)
-- ============================================================
create or replace function notify_vehicle_admins(p_vehicle_id uuid, p_org uuid, p_message text, p_key text)
returns void as $$
  insert into notifications (recipient_id, type, message, related_table, related_id, dedupe_key, organisation_id)
  select p.id, 'maintenance_due', p_message, 'vehicles', p_vehicle_id, p_key, p_org
  from profiles p
  where p.role = 'admin' and p.active = true and p.organisation_id = p_org
    and not exists (
      select 1 from notifications n where n.recipient_id = p.id and n.dedupe_key = p_key
    );
$$ language sql security definer set search_path = public;

revoke all on function notify_vehicle_admins(uuid, uuid, text, text) from public, anon, authenticated;

create or replace function check_vehicle_alerts(v_id uuid)
returns void as $$
declare
  v vehicles%rowtype;
  d int;
  km numeric;
begin
  select * into v from vehicles where id = v_id and active = true;
  if not found then return; end if;

  -- WOF
  if v.wof_due is not null then
    d := v.wof_due - current_date;
    if d <= 0 then perform notify_vehicle_admins(v.id, v.organisation_id, v.name || ': WOF EXPIRED', 'wof:' || v.wof_due || ':expired');
    elsif d <= 7 then perform notify_vehicle_admins(v.id, v.organisation_id, v.name || ': WOF expires in ' || d || ' days (Urgent)', 'wof:' || v.wof_due || ':7');
    elsif d <= 14 then perform notify_vehicle_admins(v.id, v.organisation_id, v.name || ': WOF expires in ' || d || ' days (Due Soon)', 'wof:' || v.wof_due || ':14');
    elsif d <= 30 then perform notify_vehicle_admins(v.id, v.organisation_id, v.name || ': WOF expires in ' || d || ' days (Upcoming)', 'wof:' || v.wof_due || ':30');
    end if;
  end if;

  -- Registration
  if v.rego_due is not null then
    d := v.rego_due - current_date;
    if d <= 0 then perform notify_vehicle_admins(v.id, v.organisation_id, v.name || ': REGO EXPIRED', 'rego:' || v.rego_due || ':expired');
    elsif d <= 7 then perform notify_vehicle_admins(v.id, v.organisation_id, v.name || ': Registration expires in ' || d || ' days (Urgent)', 'rego:' || v.rego_due || ':7');
    elsif d <= 14 then perform notify_vehicle_admins(v.id, v.organisation_id, v.name || ': Registration expires in ' || d || ' days (Due Soon)', 'rego:' || v.rego_due || ':14');
    elsif d <= 30 then perform notify_vehicle_admins(v.id, v.organisation_id, v.name || ': Registration expires in ' || d || ' days (Upcoming)', 'rego:' || v.rego_due || ':30');
    end if;
  end if;

  -- RUC
  if v.ruc_purchased_to_km is not null then
    km := v.ruc_purchased_to_km - v.current_odometer;
    if km <= 0 then perform notify_vehicle_admins(v.id, v.organisation_id, v.name || ': RUC OVERDUE (' || v.current_odometer || ' / ' || v.ruc_purchased_to_km || ' KM)', 'ruc:' || v.ruc_purchased_to_km || ':overdue');
    elsif km <= 200 then perform notify_vehicle_admins(v.id, v.organisation_id, v.name || ': RUC has ' || km || ' KM remaining (Urgent)', 'ruc:' || v.ruc_purchased_to_km || ':200');
    elsif km <= 500 then perform notify_vehicle_admins(v.id, v.organisation_id, v.name || ': RUC has ' || km || ' KM remaining (Due Soon)', 'ruc:' || v.ruc_purchased_to_km || ':500');
    elsif km <= 1000 then perform notify_vehicle_admins(v.id, v.organisation_id, v.name || ': RUC has ' || km || ' KM remaining (Upcoming)', 'ruc:' || v.ruc_purchased_to_km || ':1000');
    end if;
  end if;

  -- Service by KM
  if v.service_due_km is not null then
    km := v.service_due_km - v.current_odometer;
    if km <= 0 then perform notify_vehicle_admins(v.id, v.organisation_id, v.name || ': Service OVERDUE (' || v.current_odometer || ' / ' || v.service_due_km || ' KM)', 'service_km:' || v.service_due_km || ':overdue');
    elsif km <= 200 then perform notify_vehicle_admins(v.id, v.organisation_id, v.name || ': Service due in ' || km || ' KM (Urgent)', 'service_km:' || v.service_due_km || ':200');
    elsif km <= 500 then perform notify_vehicle_admins(v.id, v.organisation_id, v.name || ': Service due in ' || km || ' KM (Due Soon)', 'service_km:' || v.service_due_km || ':500');
    elsif km <= 1000 then perform notify_vehicle_admins(v.id, v.organisation_id, v.name || ': Service due in ' || km || ' KM (Upcoming)', 'service_km:' || v.service_due_km || ':1000');
    end if;
  end if;

  -- Service by date
  if v.service_due_date is not null then
    d := v.service_due_date - current_date;
    if d <= 0 then perform notify_vehicle_admins(v.id, v.organisation_id, v.name || ': Service OVERDUE (was due ' || to_char(v.service_due_date, 'DD Mon YYYY') || ')', 'service_date:' || v.service_due_date || ':overdue');
    elsif d <= 7 then perform notify_vehicle_admins(v.id, v.organisation_id, v.name || ': Service due in ' || d || ' days (Urgent)', 'service_date:' || v.service_due_date || ':7');
    elsif d <= 14 then perform notify_vehicle_admins(v.id, v.organisation_id, v.name || ': Service due in ' || d || ' days (Due Soon)', 'service_date:' || v.service_due_date || ':14');
    elsif d <= 30 then perform notify_vehicle_admins(v.id, v.organisation_id, v.name || ': Service due in ' || d || ' days (Upcoming)', 'service_date:' || v.service_due_date || ':30');
    end if;
  end if;
end;
$$ language plpgsql security definer set search_path = public;

-- Daily sweep (already scheduled by pg_cron in 0002 under this name).
create or replace function check_maintenance_due()
returns void as $$
declare
  r record;
begin
  for r in select id from vehicles where active = true loop
    perform check_vehicle_alerts(r.id);
  end loop;
end;
$$ language plpgsql security definer set search_path = public;

-- ============================================================
-- 4. Booking resubmit notification sets organisation_id (#6)
-- ============================================================
create or replace function notify_approving_admin_on_resubmit()
returns trigger as $$
begin
  if old.approval_status = 'approved' and new.approval_status = 'pending' and new.approving_admin_id is not null then
    insert into notifications (recipient_id, type, message, related_table, related_id, organisation_id)
    values (
      new.approving_admin_id,
      'booking_created',
      coalesce((select name from profiles where id = new.driver_id), 'A driver') || ' changed and resubmitted: ' ||
      coalesce(new.title, 'Booking') || ' (needs re-approval)',
      'bookings',
      new.id,
      new.organisation_id
    );
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

-- ============================================================
-- 5. Driver notifications for booking decisions (#8)
--    Admin-only, same-org only. The app calls this instead of inserting
--    into notifications directly (which RLS has never allowed).
-- ============================================================
create or replace function notify_booking_driver(p_booking_id uuid, p_type text, p_message text)
returns void as $$
declare
  b bookings%rowtype;
begin
  if not is_admin() then
    raise exception 'Only an admin can send booking notifications.';
  end if;
  if p_type not in ('booking_approved', 'booking_declined', 'booking_override') then
    raise exception 'Unsupported notification type %', p_type;
  end if;

  select * into b from bookings where id = p_booking_id and organisation_id = current_org_id();
  if not found then
    return;
  end if;

  insert into notifications (recipient_id, type, message, related_table, related_id, organisation_id)
  values (b.driver_id, p_type, left(p_message, 500), 'bookings', b.id, b.organisation_id);
end;
$$ language plpgsql security definer set search_path = public;

revoke all on function notify_booking_driver(uuid, text, text) from public, anon;
grant execute on function notify_booking_driver(uuid, text, text) to authenticated;

-- ============================================================
-- 6. Stale, organisation-blind booking policies from 0003 (#7)
--    Replaced long ago by drivers_update_own_bookings /
--    admins_update_bookings (org-scoped in 0013), but never dropped.
-- ============================================================
drop policy if exists "Admins can manage any booking" on bookings;
drop policy if exists "Drivers can cancel their own bookings" on bookings;

-- ============================================================
-- 7. fuel_logs belongs to an organisation (#7)
-- ============================================================
alter table fuel_logs add column if not exists organisation_id uuid references organisations(id);

update fuel_logs f
   set organisation_id = v.organisation_id
  from vehicles v
 where v.id = f.vehicle_id and f.organisation_id is null;

alter table fuel_logs alter column organisation_id set not null;

create index if not exists fuel_logs_organisation_id_idx on fuel_logs (organisation_id);

drop trigger if exists trg_set_org_fuel_logs on fuel_logs;
create trigger trg_set_org_fuel_logs before insert on fuel_logs
  for each row execute function set_organisation_id();

drop policy if exists drivers_insert_own_fuel_logs on fuel_logs;
create policy drivers_insert_own_fuel_logs on fuel_logs
  for insert with check (driver_id = auth.uid() and organisation_id = current_org_id());

drop policy if exists drivers_select_own_fuel_logs on fuel_logs;
create policy drivers_select_own_fuel_logs on fuel_logs
  for select using (driver_id = auth.uid() and organisation_id = current_org_id());

drop policy if exists admins_select_all_fuel_logs on fuel_logs;
create policy admins_select_all_fuel_logs on fuel_logs
  for select using (is_admin() and organisation_id = current_org_id());

drop policy if exists admins_update_fuel_logs on fuel_logs;
create policy admins_update_fuel_logs on fuel_logs
  for update using (is_admin() and organisation_id = current_org_id())
  with check (is_admin() and organisation_id = current_org_id());

drop policy if exists admins_delete_fuel_logs on fuel_logs;
create policy admins_delete_fuel_logs on fuel_logs
  for delete using (is_admin() and organisation_id = current_org_id());

-- ============================================================
-- 8. Catch up: odometers that fell behind because of #2
-- ============================================================
update vehicles v
   set current_odometer = t.max_end, updated_at = now()
  from (
    select vehicle_id, max(end_km) as max_end
    from vehicle_usage
    where status in ('completed', 'corrected') and end_km is not null
    group by vehicle_id
  ) t
 where t.vehicle_id = v.id and t.max_end > v.current_odometer;

-- ============================================================
-- Rollback notes (manual):
--  - Functions: re-run their previous definitions from 0001/0005/0008/
--    0009/0013/0020 (behaviour reverts to the buggy versions).
--  - drop function current_vehicle_reservation(uuid);
--    drop function notify_booking_driver(uuid, text, text);
--    drop function notify_vehicle_admins(uuid, uuid, text, text);
--  - fuel_logs.organisation_id can stay; dropping it requires restoring
--    the 0018 policies first.
--  - The two dropped 0003 booking policies should NOT be restored.
-- ============================================================
