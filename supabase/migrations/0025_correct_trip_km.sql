-- Fleet Tracker: let an admin correct a trip's KM (typos like 100072 for
-- 10072) and put the vehicle's odometer back where it should be.
-- Run after 0024_bookings_fix_trip_locations.sql, in the Supabase SQL Editor.
-- Safe to run any number of times.
--
-- Why a function: the odometer trigger only ever moves the odometer UP
-- (greatest()), so fixing an over-typed finish KM can't bring it back
-- down through a normal update. This does the correction and then sets
-- the odometer from the vehicle's most recent trip, in one transaction,
-- and writes the audit log entry.

create or replace function correct_trip_km(
  p_trip_id uuid,
  p_start_km numeric,
  p_end_km numeric,
  p_reason text default null
)
returns table (vehicle_id uuid, new_odometer numeric) as $$
declare
  t vehicle_usage%rowtype;
  latest numeric;
begin
  if not is_admin() then
    raise exception 'Only an admin can correct trip KM.';
  end if;

  select * into t from vehicle_usage where id = p_trip_id;
  if not found or t.organisation_id is distinct from current_org_id() then
    raise exception 'That trip could not be found.';
  end if;

  if p_start_km is null or p_start_km < 0 then
    raise exception 'Starting KM must be 0 or more.';
  end if;
  if t.status = 'active' and p_end_km is not null then
    raise exception 'This trip is still in progress; correct the starting KM only, or close it first.';
  end if;
  if t.status <> 'active' and p_end_km is null then
    raise exception 'A finished trip needs an ending KM.';
  end if;
  if p_end_km is not null and p_end_km < p_start_km then
    raise exception 'Ending KM can''t be below the starting KM.';
  end if;

  update vehicle_usage
     set start_km = p_start_km,
         end_km = p_end_km,
         status = case when t.status = 'active' then 'active' else 'corrected' end
   where id = p_trip_id;

  -- Odometer = the reading at the end (or start, if still running) of the
  -- vehicle's most recent trip.
  select coalesce(u.end_km, u.start_km) into latest
    from vehicle_usage u
   where u.vehicle_id = t.vehicle_id
   order by u.start_datetime desc
   limit 1;

  update vehicles v
     set current_odometer = coalesce(latest, v.current_odometer), updated_at = now()
   where v.id = t.vehicle_id;

  insert into audit_log (user_id, record_type, record_id, action, old_value, new_value, organisation_id)
  values (
    auth.uid(), 'vehicle_usage', p_trip_id, 'admin_corrected_trip_km',
    jsonb_build_object('start_km', t.start_km, 'end_km', t.end_km, 'status', t.status),
    jsonb_build_object('start_km', p_start_km, 'end_km', p_end_km, 'reason', nullif(trim(coalesce(p_reason, '')), ''), 'odometer', latest),
    t.organisation_id
  );

  perform check_vehicle_alerts(t.vehicle_id);

  return query select t.vehicle_id, latest;
end;
$$ language plpgsql security definer set search_path = public;

revoke all on function correct_trip_km(uuid, numeric, numeric, text) from public, anon;
grant execute on function correct_trip_km(uuid, numeric, numeric, text) to authenticated;

-- Rollback (manual): drop function if exists correct_trip_km(uuid, numeric, numeric, text);
