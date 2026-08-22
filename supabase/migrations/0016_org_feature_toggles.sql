-- Fleet Tracker — per-organisation feature toggles
-- Run after 0015_drivers_can_view_admins.sql, in the Supabase SQL Editor.
--
-- Lets each organisation's admin turn off features they don't use
-- (Incident Reports, Vehicle Checks, Reports, Audit Log) without
-- affecting any other organisation sharing this deployment. Stored as a
-- single jsonb column rather than one boolean column per feature —
-- cheaper to add a fifth toggle later (a new key with a safe default in
-- app code, no new migration needed).
--
-- Enforcement lives in middleware.ts (blocks the page + any Server
-- Action posted to it) and in nav/link components (hides the entry
-- entirely) — see lib/orgFeatures.ts. This migration only adds storage.
--
-- No new RLS policy needed: the existing "Admins can rename their own
-- organisation" UPDATE policy on organisations (migration 0013) already
-- lets an admin update any column on their own org's row, including this
-- one — Postgres RLS is row-level, not column-level.
--
-- Safe to run any number of times.

alter table organisations
  add column if not exists features jsonb not null default '{
    "incident_reports": true,
    "vehicle_checks": true,
    "reports": true,
    "audit_log": true
  }'::jsonb;
