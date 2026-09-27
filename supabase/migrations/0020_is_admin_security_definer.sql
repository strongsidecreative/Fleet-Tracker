-- Fleet Tracker — fix "stack depth limit exceeded" when some admins sign in
-- Run after 0019, in the Supabase SQL Editor. Safe to run any number of times.
--
-- Symptom (2026-09-27): a second admin account (2025standard@gmail.com)
-- signed in successfully, then ~10s later landed back on an empty login
-- form. Supabase logs showed middleware's profile lookup
--   GET /rest/v1/profiles?select=role,active,organisation:organisations(features)
-- returning 500, with Postgres logging "stack depth limit exceeded" on
-- every attempt. middleware.ts treated the failed lookup as "not an
-- active admin", signed the user out and redirected to /login.
--
-- Cause: is_admin() (from 0001) is a plain SQL function, so it runs with
-- the caller's permissions and its own `select ... from profiles` is
-- itself subject to RLS. Migration 0013 made it part of the
-- "Admins can view all profiles" SELECT policy ON profiles, so evaluating
-- that policy calls is_admin(), which reads profiles, which evaluates the
-- policy again, and so on. Whether a given query hits the loop depends on
-- the plan Postgres picks, which is why one admin account was fine and
-- another wasn't. current_org_id() had exactly this problem and was
-- already fixed in 0013 by making it SECURITY DEFINER; is_admin() was
-- missed.
--
-- Fix: same treatment. Runs as the function owner (the table owner, which
-- RLS doesn't apply to), with a pinned search_path. Its result is
-- unchanged: true only when the calling user's own profile is an admin.

create or replace function is_admin()
returns boolean as $$
  select coalesce((select role = 'admin' from profiles where id = auth.uid()), false);
$$ language sql stable security definer set search_path = public;
