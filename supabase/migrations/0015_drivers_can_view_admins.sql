-- Fleet Tracker — fix: drivers can't see who to book a vehicle from
-- Run after 0014_performance_indexes.sql, in the Supabase SQL Editor.
--
-- Bug: /bookings/new asks a driver to pick an "Approving Admin", but the
-- only SELECT policies on `profiles` are "view your own profile" and
-- "admins can view all profiles" — nothing lets a driver see admin rows.
-- So the dropdown silently comes back empty for every real driver account
-- (it only looked like it worked when testing with an admin account,
-- because admins can see themselves via the admin policy).
--
-- Fix: let any logged-in member of an organisation see the *admins* in
-- that same organisation — name and id only, via the existing select in
-- app/(driver)/bookings/new/page.tsx. This does not expose other drivers'
-- profiles to each other, only admins, and only within the same org.
--
-- Safe to run any number of times.

drop policy if exists "Org members can view admins in their organisation" on profiles;
create policy "Org members can view admins in their organisation"
  on profiles for select
  using (
    role = 'admin'
    and active = true
    and organisation_id = current_org_id()
  );
