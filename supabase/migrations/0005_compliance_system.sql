-- Family Vehicle Tracker — compliance, RUC & servicing reminder system
-- Run after 0004_report_notifications.sql

-- ============================================================
-- 1. New vehicle compliance fields
-- ============================================================
alter table vehicles add column if not exists ruc_purchased_to_km numeric;
alter table vehicles add column if not exists last_service_date date;
alter table vehicles add column if not exists last_service_odometer numeric;

-- ============================================================
-- 2. Robust dedup key for notifications, tied to the specific due
--    value's cycle — so topping up RUC or pushing out a due date
--    naturally re-enables alerts for the new cycle instead of being
--    silenced forever by string-matching the message text.
-- ============================================================
alter table notifications add column if not exists dedupe_key text;

alter table notifications drop constraint if exists notifications_type_check;
alter table notifications add constraint notifications_type_check
  check (type in ('maintenance_due', 'incident_report', 'report_ready', 'booking_created'));

-- ============================================================
-- 3. General vehicle checks alongside incident reports
-- ============================================================
alter table incident_reports add column if not exists report_type text not null default 'incident'
  check (report_type in ('incident', 'general_check'));
alter table incident_reports add column if not exists check_area text
  check (check_area in ('external', 'internal', 'both'));

-- ============================================================
-- 4. Per-vehicle alert check — WOF, Rego, RUC, Service (km or date,
--    whichever is more urgent). Called both immediately after a trip
--    finishes (via the odometer trigger) and daily for every vehicle
--    (via the existing cron job) so date-based thresholds still fire
--    even with no driving happening.
-- ============================================================
create or replace function check_vehicle_alerts(v_id uuid)
returns void as $$
declare
  v vehicles%rowtype;
  days_left int;
  km_left numeric;
begin
  select * into v from vehicles where id = v_id and active = true;
  if not found then return; end if;

  -- WOF
  if v.wof_due is not null then
    days_left := v.wof_due - current_date;
    if days_left <= 0 then
      insert into notifications (recipient_id, type, message, related_table, related_id, dedupe_key)
      select p.id, 'maintenance_due', v.name || ': WOF EXPIRED', 'vehicles', v.id, 'wof:' || v.wof_due || ':expired'
      from profiles p where p.role = 'admin' and p.active = true
      and not exists (select 1 from notifications n where n.recipient_id = p.id and n.dedupe_key = 'wof:' || v.wof_due || ':expired');
    elsif days_left <= 7 then
      insert into notifications (recipient_id, type, message, related_table, related_id, dedupe_key)
      select p.id, 'maintenance_due', v.name || ': WOF expires in ' || days_left || ' days (Urgent)', 'vehicles', v.id, 'wof:' || v.wof_due || ':7'
      from profiles p where p.role = 'admin' and p.active = true
      and not exists (select 1 from notifications n where n.recipient_id = p.id and n.dedupe_key = 'wof:' || v.wof_due || ':7');
    elsif days_left <= 14 then
      insert into notifications (recipient_id, type, message, related_table, related_id, dedupe_key)
      select p.id, 'maintenance_due', v.name || ': WOF expires in ' || days_left || ' days (Due Soon)', 'vehicles', v.id, 'wof:' || v.wof_due || ':14'
      from profiles p where p.role = 'admin' and p.active = true
      and not exists (select 1 from notifications n where n.recipient_id = p.id and n.dedupe_key = 'wof:' || v.wof_due || ':14');
    elsif days_left <= 30 then
      insert into notifications (recipient_id, type, message, related_table, related_id, dedupe_key)
      select p.id, 'maintenance_due', v.name || ': WOF expires in ' || days_left || ' days (Upcoming)', 'vehicles', v.id, 'wof:' || v.wof_due || ':30'
      from profiles p where p.role = 'admin' and p.active = true
      and not exists (select 1 from notifications n where n.recipient_id = p.id and n.dedupe_key = 'wof:' || v.wof_due || ':30');
    end if;
  end if;

  -- Registration
  if v.rego_due is not null then
    days_left := v.rego_due - current_date;
    if days_left <= 0 then
      insert into notifications (recipient_id, type, message, related_table, related_id, dedupe_key)
      select p.id, 'maintenance_due', v.name || ': REGO EXPIRED', 'vehicles', v.id, 'rego:' || v.rego_due || ':expired'
      from profiles p where p.role = 'admin' and p.active = true
      and not exists (select 1 from notifications n where n.recipient_id = p.id and n.dedupe_key = 'rego:' || v.rego_due || ':expired');
    elsif days_left <= 7 then
      insert into notifications (recipient_id, type, message, related_table, related_id, dedupe_key)
      select p.id, 'maintenance_due', v.name || ': Registration expires in ' || days_left || ' days (Urgent)', 'vehicles', v.id, 'rego:' || v.rego_due || ':7'
      from profiles p where p.role = 'admin' and p.active = true
      and not exists (select 1 from notifications n where n.recipient_id = p.id and n.dedupe_key = 'rego:' || v.rego_due || ':7');
    elsif days_left <= 14 then
      insert into notifications (recipient_id, type, message, related_table, related_id, dedupe_key)
      select p.id, 'maintenance_due', v.name || ': Registration expires in ' || days_left || ' days (Due Soon)', 'vehicles', v.id, 'rego:' || v.rego_due || ':14'
      from profiles p where p.role = 'admin' and p.active = true
      and not exists (select 1 from notifications n where n.recipient_id = p.id and n.dedupe_key = 'rego:' || v.rego_due || ':14');
    elsif days_left <= 30 then
      insert into notifications (recipient_id, type, message, related_table, related_id, dedupe_key)
      select p.id, 'maintenance_due', v.name || ': Registration expires in ' || days_left || ' days (Upcoming)', 'vehicles', v.id, 'rego:' || v.rego_due || ':30'
      from profiles p where p.role = 'admin' and p.active = true
      and not exists (select 1 from notifications n where n.recipient_id = p.id and n.dedupe_key = 'rego:' || v.rego_due || ':30');
    end if;
  end if;

  -- RUC (km remaining before the purchased-to reading)
  if v.ruc_purchased_to_km is not null then
    km_left := v.ruc_purchased_to_km - v.current_odometer;
    if km_left <= 0 then
      insert into notifications (recipient_id, type, message, related_table, related_id, dedupe_key)
      select p.id, 'maintenance_due', v.name || ': RUC OVERDUE (' || v.current_odometer || ' / ' || v.ruc_purchased_to_km || ' KM)', 'vehicles', v.id, 'ruc:' || v.ruc_purchased_to_km || ':overdue'
      from profiles p where p.role = 'admin' and p.active = true
      and not exists (select 1 from notifications n where n.recipient_id = p.id and n.dedupe_key = 'ruc:' || v.ruc_purchased_to_km || ':overdue');
    elsif km_left <= 200 then
      insert into notifications (recipient_id, type, message, related_table, related_id, dedupe_key)
      select p.id, 'maintenance_due', v.name || ': RUC has ' || km_left || ' KM remaining (Urgent)', 'vehicles', v.id, 'ruc:' || v.ruc_purchased_to_km || ':200'
      from profiles p where p.role = 'admin' and p.active = true
      and not exists (select 1 from notifications n where n.recipient_id = p.id and n.dedupe_key = 'ruc:' || v.ruc_purchased_to_km || ':200');
    elsif km_left <= 500 then
      insert into notifications (recipient_id, type, message, related_table, related_id, dedupe_key)
      select p.id, 'maintenance_due', v.name || ': RUC has ' || km_left || ' KM remaining (Due Soon)', 'vehicles', v.id, 'ruc:' || v.ruc_purchased_to_km || ':500'
      from profiles p where p.role = 'admin' and p.active = true
      and not exists (select 1 from notifications n where n.recipient_id = p.id and n.dedupe_key = 'ruc:' || v.ruc_purchased_to_km || ':500');
    elsif km_left <= 1000 then
      insert into notifications (recipient_id, type, message, related_table, related_id, dedupe_key)
      select p.id, 'maintenance_due', v.name || ': RUC has ' || km_left || ' KM remaining (Upcoming)', 'vehicles', v.id, 'ruc:' || v.ruc_purchased_to_km || ':1000'
      from profiles p where p.role = 'admin' and p.active = true
      and not exists (select 1 from notifications n where n.recipient_id = p.id and n.dedupe_key = 'ruc:' || v.ruc_purchased_to_km || ':1000');
    end if;
  end if;

  -- Service — by kilometres
  if v.service_due_km is not null then
    km_left := v.service_due_km - v.current_odometer;
    if km_left <= 0 then
      insert into notifications (recipient_id, type, message, related_table, related_id, dedupe_key)
      select p.id, 'maintenance_due', v.name || ': Service OVERDUE (' || v.current_odometer || ' / ' || v.service_due_km || ' KM)', 'vehicles', v.id, 'service_km:' || v.service_due_km || ':overdue'
      from profiles p where p.role = 'admin' and p.active = true
      and not exists (select 1 from notifications n where n.recipient_id = p.id and n.dedupe_key = 'service_km:' || v.service_due_km || ':overdue');
    elsif km_left <= 200 then
      insert into notifications (recipient_id, type, message, related_table, related_id, dedupe_key)
      select p.id, 'maintenance_due', v.name || ': Service due in ' || km_left || ' KM (Urgent)', 'vehicles', v.id, 'service_km:' || v.service_due_km || ':200'
      from profiles p where p.role = 'admin' and p.active = true
      and not exists (select 1 from notifications n where n.recipient_id = p.id and n.dedupe_key = 'service_km:' || v.service_due_km || ':200');
    elsif km_left <= 500 then
      insert into notifications (recipient_id, type, message, related_table, related_id, dedupe_key)
      select p.id, 'maintenance_due', v.name || ': Service due in ' || km_left || ' KM (Due Soon)', 'vehicles', v.id, 'service_km:' || v.service_due_km || ':500'
      from profiles p where p.role = 'admin' and p.active = true
      and not exists (select 1 from notifications n where n.recipient_id = p.id and n.dedupe_key = 'service_km:' || v.service_due_km || ':500');
    elsif km_left <= 1000 then
      insert into notifications (recipient_id, type, message, related_table, related_id, dedupe_key)
      select p.id, 'maintenance_due', v.name || ': Service due in ' || km_left || ' KM (Upcoming)', 'vehicles', v.id, 'service_km:' || v.service_due_km || ':1000'
      from profiles p where p.role = 'admin' and p.active = true
      and not exists (select 1 from notifications n where n.recipient_id = p.id and n.dedupe_key = 'service_km:' || v.service_due_km || ':1000');
    end if;
  end if;

  -- Service — by date
  if v.service_due_date is not null then
    days_left := v.service_due_date - current_date;
    if days_left <= 0 then
      insert into notifications (recipient_id, type, message, related_table, related_id, dedupe_key)
      select p.id, 'maintenance_due', v.name || ': Service OVERDUE (was due ' || to_char(v.service_due_date, 'DD Mon YYYY') || ')', 'vehicles', v.id, 'service_date:' || v.service_due_date || ':overdue'
      from profiles p where p.role = 'admin' and p.active = true
      and not exists (select 1 from notifications n where n.recipient_id = p.id and n.dedupe_key = 'service_date:' || v.service_due_date || ':overdue');
    elsif days_left <= 7 then
      insert into notifications (recipient_id, type, message, related_table, related_id, dedupe_key)
      select p.id, 'maintenance_due', v.name || ': Service due in ' || days_left || ' days (Urgent)', 'vehicles', v.id, 'service_date:' || v.service_due_date || ':7'
      from profiles p where p.role = 'admin' and p.active = true
      and not exists (select 1 from notifications n where n.recipient_id = p.id and n.dedupe_key = 'service_date:' || v.service_due_date || ':7');
    elsif days_left <= 14 then
      insert into notifications (recipient_id, type, message, related_table, related_id, dedupe_key)
      select p.id, 'maintenance_due', v.name || ': Service due in ' || days_left || ' days (Due Soon)', 'vehicles', v.id, 'service_date:' || v.service_due_date || ':14'
      from profiles p where p.role = 'admin' and p.active = true
      and not exists (select 1 from notifications n where n.recipient_id = p.id and n.dedupe_key = 'service_date:' || v.service_due_date || ':14');
    elsif days_left <= 30 then
      insert into notifications (recipient_id, type, message, related_table, related_id, dedupe_key)
      select p.id, 'maintenance_due', v.name || ': Service due in ' || days_left || ' days (Upcoming)', 'vehicles', v.id, 'service_date:' || v.service_due_date || ':30'
      from profiles p where p.role = 'admin' and p.active = true
      and not exists (select 1 from notifications n where n.recipient_id = p.id and n.dedupe_key = 'service_date:' || v.service_due_date || ':30');
    end if;
  end if;
end;
$$ language plpgsql security definer;

-- ============================================================
-- 5. Daily sweep across all active vehicles — reuses the existing
--    cron job already scheduled in migration 0002, no rescheduling
--    needed since the function name stays the same.
-- ============================================================
create or replace function check_maintenance_due()
returns void as $$
declare
  v record;
begin
  for v in select id from vehicles where active = true loop
    perform check_vehicle_alerts(v.id);
  end loop;
end;
$$ language plpgsql security definer;

-- ============================================================
-- 6. Real-time recalculation the moment a trip finishes — extends
--    the existing odometer-sync trigger so RUC/service-km alerts
--    update immediately, not just on the next daily sweep.
-- ============================================================
create or replace function update_vehicle_odometer()
returns trigger as $$
begin
  if new.status = 'completed' and new.end_km is not null then
    update vehicles set current_odometer = new.end_km, updated_at = now() where id = new.vehicle_id;
    perform check_vehicle_alerts(new.vehicle_id);
  end if;
  return new;
end;
$$ language plpgsql;

-- ============================================================
-- 7. Notify admins the moment a booking is made
-- ============================================================
create or replace function notify_admins_of_booking()
returns trigger as $$
begin
  if new.status = 'upcoming' then
    insert into notifications (recipient_id, type, message, related_table, related_id)
    select p.id, 'booking_created',
           (select name from vehicles where id = new.vehicle_id) || ' booked by ' ||
           (select name from profiles where id = new.driver_id) || ', ' ||
           to_char(new.start_datetime, 'DD Mon HH24:MI') || ' to ' || to_char(new.end_datetime, 'HH24:MI'),
           'bookings', new.id
    from profiles p
    where p.role = 'admin' and p.active = true;
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_notify_booking on bookings;
create trigger trg_notify_booking
  after insert on bookings
  for each row execute function notify_admins_of_booking();
