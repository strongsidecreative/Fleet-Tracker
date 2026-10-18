-- Fleet Tracker: permanently delete an organisation and everything in it.
-- Run after 0026_wheel_alignment.sql, in the Supabase SQL Editor.
-- Safe to run any number of times.
--
-- Used by "Delete organisation" on the admin Account page. Removes, in one
-- transaction (all or nothing): every trip, booking, check, incident, fuel
-- log, notification, audit entry, vehicle and person in the organisation,
-- their sign-in accounts (auth.users), and the organisation itself.
-- Photo FILES in Storage can't be deleted from SQL; the app removes those
-- afterwards (app/admin/account/actions.ts).
--
-- Only the service role can call this. The app checks the caller is an
-- admin of this organisation and typed its name before calling it.

create or replace function delete_organisation(p_org uuid)
returns void as $$
declare
  user_ids uuid[];
begin
  if p_org is null or not exists (select 1 from organisations where id = p_org) then
    raise exception 'Organisation not found.';
  end if;

  select coalesce(array_agg(id), '{}') into user_ids from profiles where organisation_id = p_org;

  -- Records that point at people/vehicles/trips go before what they point at.
  delete from notifications where organisation_id = p_org or recipient_id = any(user_ids);
  delete from audit_log where organisation_id = p_org or user_id = any(user_ids);
  delete from receipt_exports where organisation_id = p_org;
  delete from incident_reports where organisation_id = p_org;
  delete from vehicle_check_items where organisation_id = p_org;
  delete from vehicle_checks where organisation_id = p_org;
  delete from fuel_logs where organisation_id = p_org;
  delete from bookings where organisation_id = p_org;
  delete from booking_series where organisation_id = p_org;
  delete from vehicle_usage where organisation_id = p_org;
  delete from vehicles where organisation_id = p_org;
  delete from push_subscriptions where organisation_id = p_org or user_id = any(user_ids);
  delete from driver_licences where organisation_id = p_org or driver_id = any(user_ids);
  delete from profiles where id = any(user_ids);

  -- Sign-in accounts. Nobody from this organisation can log in after this.
  delete from auth.users where id = any(user_ids);

  delete from organisations where id = p_org;
end;
$$ language plpgsql security definer set search_path = public;

revoke all on function delete_organisation(uuid) from public, anon, authenticated;
grant execute on function delete_organisation(uuid) to service_role;
