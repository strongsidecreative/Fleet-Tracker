-- Fleet Tracker — push notifications.
-- Run after 0011_incident_from_vehicle_check.sql
--
-- Design: every notification in Fleet Tracker already funnels through one
-- table (`notifications`), whether it's inserted by a server action
-- (bookings, incidents) or by a plpgsql trigger/cron job (compliance,
-- licence alerts, vehicle check issues). Instead of adding a push call at
-- every one of those ~9 insertion points, this adds ONE trigger on the
-- `notifications` table itself. Every insert — no matter where it came
-- from — fires a webhook (via the pg_net extension, already available on
-- Supabase) to the Next.js app, which looks up the recipient's subscribed
-- devices and sends the push.

-- ============================================================
-- 1. Where each person's subscribed browsers/devices are stored
-- ============================================================
create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

alter table push_subscriptions enable row level security;

drop policy if exists "Users manage their own push subscriptions" on push_subscriptions;
create policy "Users manage their own push subscriptions"
  on push_subscriptions for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ============================================================
-- 2. Small config table for the two values the trigger needs: where to
--    call, and a shared secret so nobody else can trigger sends. Not
--    hardcoded into the trigger so this migration stays portable — update
--    the two rows below after deploying (see README).
-- ============================================================
create table if not exists app_config (
  key text primary key,
  value text not null
);

-- The secret below already matches PUSH_DISPATCH_SECRET in .env.local, so
-- no need to touch that row. push_dispatch_url still needs updating once
-- deployed — see README.
insert into app_config (key, value) values
  ('push_dispatch_url', 'https://REPLACE-WITH-YOUR-DEPLOYED-DOMAIN/api/push/dispatch'),
  ('push_dispatch_secret', '6dbc9621ee22df320d48134adf5bb6da2dc9777523be87f51a46fc17b5249465')
on conflict (key) do nothing;

alter table app_config enable row level security;
-- No policies — this table is only ever read by the security-definer
-- trigger function below, never by the app on behalf of a user.

-- ============================================================
-- 3. The fan-out trigger
-- ============================================================
create extension if not exists pg_net;

create or replace function notify_push()
returns trigger as $$
declare
  dispatch_url text;
  dispatch_secret text;
begin
  select value into dispatch_url from app_config where key = 'push_dispatch_url';
  select value into dispatch_secret from app_config where key = 'push_dispatch_secret';

  if dispatch_url is null or dispatch_url like 'https://REPLACE%' then
    -- Not configured yet (or still on the placeholder from this migration).
    -- Skip silently rather than erroring every notification insert.
    return new;
  end if;

  perform net.http_post(
    url := dispatch_url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-push-secret', dispatch_secret),
    body := jsonb_build_object('notification_id', new.id)
  );

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_notify_push on notifications;
create trigger trg_notify_push
  after insert on notifications
  for each row execute function notify_push();
