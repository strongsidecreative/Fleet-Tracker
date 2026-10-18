-- Fleet Tracker: wheel alignment reminders alongside servicing.
-- Run after 0025_correct_trip_km.sql, in the Supabase SQL Editor.
-- Safe to run any number of times.
--
-- Adds a "next wheel alignment due" KM and date to each vehicle, and
-- extends check_vehicle_alerts() (last defined in 0021) so admins get the
-- same Upcoming / Due Soon / Urgent / Overdue notifications as servicing.
--
-- last_service_date / last_service_odometer are no longer shown or edited
-- in the app. The columns are left in place (nothing is dropped) so any
-- values already entered are kept.

alter table vehicles add column if not exists wheel_alignment_due_date date;
alter table vehicles add column if not exists wheel_alignment_due_km numeric;

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

  -- Wheel alignment by KM
  if v.wheel_alignment_due_km is not null then
    km := v.wheel_alignment_due_km - v.current_odometer;
    if km <= 0 then perform notify_vehicle_admins(v.id, v.organisation_id, v.name || ': Wheel alignment OVERDUE (' || v.current_odometer || ' / ' || v.wheel_alignment_due_km || ' KM)', 'wheel_km:' || v.wheel_alignment_due_km || ':overdue');
    elsif km <= 200 then perform notify_vehicle_admins(v.id, v.organisation_id, v.name || ': Wheel alignment due in ' || km || ' KM (Urgent)', 'wheel_km:' || v.wheel_alignment_due_km || ':200');
    elsif km <= 500 then perform notify_vehicle_admins(v.id, v.organisation_id, v.name || ': Wheel alignment due in ' || km || ' KM (Due Soon)', 'wheel_km:' || v.wheel_alignment_due_km || ':500');
    elsif km <= 1000 then perform notify_vehicle_admins(v.id, v.organisation_id, v.name || ': Wheel alignment due in ' || km || ' KM (Upcoming)', 'wheel_km:' || v.wheel_alignment_due_km || ':1000');
    end if;
  end if;

  -- Wheel alignment by date
  if v.wheel_alignment_due_date is not null then
    d := v.wheel_alignment_due_date - current_date;
    if d <= 0 then perform notify_vehicle_admins(v.id, v.organisation_id, v.name || ': Wheel alignment OVERDUE (was due ' || to_char(v.wheel_alignment_due_date, 'DD Mon YYYY') || ')', 'wheel_date:' || v.wheel_alignment_due_date || ':overdue');
    elsif d <= 7 then perform notify_vehicle_admins(v.id, v.organisation_id, v.name || ': Wheel alignment due in ' || d || ' days (Urgent)', 'wheel_date:' || v.wheel_alignment_due_date || ':7');
    elsif d <= 14 then perform notify_vehicle_admins(v.id, v.organisation_id, v.name || ': Wheel alignment due in ' || d || ' days (Due Soon)', 'wheel_date:' || v.wheel_alignment_due_date || ':14');
    elsif d <= 30 then perform notify_vehicle_admins(v.id, v.organisation_id, v.name || ': Wheel alignment due in ' || d || ' days (Upcoming)', 'wheel_date:' || v.wheel_alignment_due_date || ':30');
    end if;
  end if;
end;
$$ language plpgsql security definer set search_path = public;
