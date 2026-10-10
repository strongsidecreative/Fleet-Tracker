# Fleet Tracker

Mobile-first fleet management web app (installable PWA): drivers scan a vehicle's QR code to
start and finish trips, book vehicles, run vehicle checks, report incidents and log fuel;
admins manage vehicles, people, compliance (WOF / rego / RUC / servicing / licences),
approvals, receipts and reports. One shared deployment serves many organisations, each fully
separated by Postgres Row Level Security. Built to run at $0/month on free tiers.

## Stack

- **Next.js 14** (App Router, 14.2.35), deployed on **Vercel** (functions in `sin1`, next to the database)
- **Supabase** free tier: Postgres, Auth, Storage, Row Level Security, `pg_cron` + `pg_net` for scheduled jobs
- **Tailwind CSS**; `html5-qrcode` (scanning), `qrcode` (QR generation), `recharts` (charts),
  `web-push` (push notifications), `fflate` (receipt ZIPs)
- **Resend** free tier for email (monthly receipts); optional, the app works without it

All times are Pacific/Auckland, through `lib/nz-time.ts` (the server runs in UTC, so never
parse a typed date/time with `new Date("YYYY-MM-DDTHH:MM")`; use `nzLocalToDate`).

## Current state (October 2026)

- **Multi-organisation**: `/setup?token=<SETUP_TOKEN>` creates a new organisation and its first
  admin. Every table carries `organisation_id`; RLS scopes all reads and writes to the
  viewer's organisation. Per-organisation feature toggles (Account → Features).
- **Driver**: dashboard, QR scan, start/finish trip, My Trips, Vehicles, Bookings (incl.
  recurring, edit → re-approval), Vehicle Check (compulsory pre-op check Mon/Fri), Report
  Incident, Fuel (in-trip, receipt photo), Account, guided tour.
- **Admin**: Dashboard, Vehicles (+QR cards, compliance, edit name/rego/make/model, archive or
  delete with records), People (invite, bulk invite, deactivate/remove/delete), Bookings
  (approve/decline, conflict checks), Fuel (+ Monthly Receipts), Incidents, Checks, Reports,
  Records/Sessions, Audit, Notifications (clearable), Account (organisation, features,
  receipt settings, photo storage meter, push), guided tour.
- **Photos**: fuel receipts and check photos are in the private `private-photos` bucket under
  `<org>/<uploader>/…`, shown through 1-hour signed links (`lib/photos.ts`). Vehicle photos
  are public under `vehicles/<org>/…`. Photos are shrunk in the browser before upload
  (`lib/shrinkImage.ts`) and deleted when their records are deleted.
- **Monthly receipts**: daily job prompts admins (banner, push, email) to save last month's
  receipts as a ZIP, or emails it automatically; saved months' photos are cleared after the
  organisation's retention period (default 3 months). Fuel log rows are always kept.

## Database migrations

Run in order in the Supabase SQL Editor: `supabase/migrations/0001` … `0023`. All are safe
to re-run. Notable recent ones:

| Migration | What it does |
|---|---|
| 0013 | Multi-organisation (organisation_id + RLS everywhere) |
| 0020 | `is_admin()` as SECURITY DEFINER (fixes RLS recursion) |
| 0021 | Audit fixes: trip triggers as SECURITY DEFINER (odometer, booking lock), org-scoped alerts, fuel_logs org scoping, driver booking notifications, active-only admins |
| 0022 | Monthly receipts (receipt_exports, settings, daily job), clearable notifications, stale cron jobs removed |
| 0023 | Private photo bucket, org-scoped storage rules, storage usage RPC |

**Deploy order:** apply a new migration first, then push the code that uses it.

## Scheduled jobs (pg_cron, UTC)

- `check_maintenance_due_job` 07:00: WOF/rego/RUC/service alerts per vehicle
- `check_driver_licences_job` 07:00: licence expiry alerts
- `monthly-receipts-daily` 19:15: calls `/api/cron/receipts` (prompts, auto-email, photo tidy-up)

Push notifications: a trigger on `notifications` calls `/api/push/dispatch` via `pg_net`.
Both routes authenticate with `app_config.push_dispatch_secret`, which must equal Vercel's
`PUSH_DISPATCH_SECRET`.

## Environment variables (Vercel → Production, and `.env.local` for local dev)

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase project |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only: invites, deletes, receipt jobs. Never in client code |
| `NEXT_PUBLIC_SITE_URL` | Live URL, used in QR codes and email links |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | Push notifications |
| `PUSH_DISPATCH_SECRET` | Shared secret with the database (see above) |
| `SETUP_TOKEN` | Required on `/setup?token=…` to create an organisation |
| `RESEND_API_KEY`, `EMAIL_FROM` | Optional email (sending domain verified in Resend) |

After adding or changing a variable in Vercel, redeploy for it to take effect.

## Local development

1. Copy `.env.example` to `.env.local` and fill in the values above.
2. `npm install`
3. `npm run dev`

## Deferred (not built)

- Saved booking templates
- Calendar grid (day/week/month) for bookings; bookings show as lists
- Per-occurrence partial approval of recurring bookings (a series is approved or blocked as a whole)
- Next.js 15/16 upgrade (some advisories only have fixes there)
- Recharts v3 upgrade

## Design direction

Palette and type system live in `tailwind.config.js` (`ink` / `steel` / `paper` / `brand` /
`brandLight` / `amber` / `track` / `rust`). The `.odometer` text style in `globals.css` sets KM
stats in a tabular-numeral display face. Amber means in use, green available, rust errors.

## History

The sections below record how individual features were built, in order.

## Booking approval system (migration 0008)

Run `supabase/migrations/0008_booking_approvals_recurring.sql` in the SQL Editor. It extends
the existing `bookings` table rather than replacing it, and backfills any existing rows as
already-approved so nothing already booked gets lost.

**What's real and working:** driver submits a one-off or recurring booking request → selects
an approving admin → request sits as Pending (does NOT reserve the vehicle) → admin sees it
on a Booking Requests screen → admin approves (re-checks every occurrence against currently
*approved* bookings — a competing request could have been approved since this one was
submitted) or declines with a note → driver gets notified either way. Approval is enforced at
three layers: the server action checks the caller is an admin, a database trigger blocks any
`approval_status` change that didn't come from an admin session regardless of whose row it is,
and a database exclusion constraint makes a genuine double-booking impossible even if the
application logic had a bug. QR check-in respects this — only *approved* bookings reserve a
vehicle, a pending request never blocks another driver, and an admin scanning a reserved
vehicle gets an Override option that's logged to the audit trail.

**Deliberately simplified or deferred**, flagged rather than silently skipped:
- No organisation/tenant system — Fleet Tracker is single-family, so "approving admin" is
  selected from all active admins rather than an organisation-scoped list.
- Approval is all-or-nothing for a recurring series — if any occurrence conflicts, the whole
  series is blocked with the conflict list shown, rather than true per-occurrence partial
  approval.
- No saved booking templates yet.
- No full calendar grid (day/week/month view) — bookings show as chronological lists instead.

**Since the last update, these moved from deferred to done:**
- The admin nav now shows a live badge with the count of distinct pending requests
  (`app/admin/layout.tsx` fetches it server-side and passes it into `AdminNav`).
- Editing an already-approved booking now works (`/bookings/[id]/edit`). If the vehicle, date,
  or time materially changes, it's sent back to Pending Approval automatically and the same
  approving admin gets notified again — enforced by a narrow database trigger exception
  (migration `0009_booking_edit_reapproval.sql`) that allows only the driver's own
  approved→pending transition on their own booking, nothing else.
- Monthly recurrence is now supported (same date each month; months too short for that date
  are skipped) alongside the existing Weekly/Fortnightly pattern.

Run `0009_booking_edit_reapproval.sql` after `0008` if you've already applied that one.

## Notifications cleanup (migration 0010)

Run `supabase/migrations/0010_remove_report_notifications.sql` after `0009`. It removes the
weekly/monthly "report ready" notification (it only ever nudged admins to check a period
already visible on the live dashboard chart — no new data, just noise; the Reports page and
CSV export themselves are untouched). It also merges booking decline and cancellation into a
single `booking_declined` notification, since declining a pending request and cancelling an
approved one are the same thing from the driver's point of view — declining is what cancels
the booking.

## "Create Incident" from a Vehicle Check Issue (migration 0011)

Run `supabase/migrations/0011_incident_from_vehicle_check.sql` after `0010`. Any flagged item
on a Vehicle Check now has a "Create Incident" button on its admin detail page
(`/admin/vehicle-checks/[id]`), which raises a proper incident report — attributed to the
driver who did the check, tagged with which admin filed it and which checklist item it came
from — without the issue only living inside the Vehicle Check record. One incident per
flagged item; the button becomes a "view in Incidents" link once used.

## Push notifications (migration 0012)

Run `supabase/migrations/0012_push_notifications.sql` after `0011`. Turn on with the "Turn on"
button on the Account page (driver or admin) — one tap per device, no email/SMS involved,
still $0/month.

**How it works:** every notification Fleet Tracker generates — compliance/WOF/rego/RUC/service
alerts, licence expiry, incidents, vehicle check issues, booking requests, approvals, declines,
overrides — already funnels through one `notifications` table, whether it's created by a
button click or a scheduled compliance check. A single database trigger fires on every insert
into that table and calls the app's `/api/push/dispatch` route, which looks up the recipient's
subscribed devices and sends the push. No push code had to be added at each of those ~8 places
individually.

**One-time setup, three parts:**

1. **VAPID keys** — a keypair that identifies this app to browsers' push services (not a paid
   service, just an identity check). Already generated and sitting in `.env.local` as
   `NEXT_PUBLIC_VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT`. To generate fresh
   ones later: `npx web-push generate-vapid-keys`.
2. **Dispatch secret** — a shared password so only this app's database can trigger a push
   send, not a stranger who finds the URL. Already in `.env.local` as `PUSH_DISPATCH_SECRET`,
   and the matching value is already seeded into the `app_config` table by migration 0012 — no
   action needed unless you regenerate it (`openssl rand -hex 32`), in which case update both
   places to match.
3. **Dispatch URL** — once deployed, run this in the Supabase SQL Editor so the database
   trigger knows where to call:
   ```sql
   update app_config set value = 'https://your-real-domain.com/api/push/dispatch'
   where key = 'push_dispatch_url';
   ```
   Until this is set to a real, reachable URL, the trigger silently does nothing — in-app
   notifications still work exactly as before, this only affects the push layer. This also
   means push notifications can't be tested on `localhost` (Supabase's cloud database can't
   reach your machine) — they only start working once deployed.

**Platform notes:** on iPhone, push only works if the app has been added to the Home Screen
first (Safari doesn't support push for a regular open tab, only installed PWAs). Android and
desktop browsers work in a normal tab, no install needed. Every person has to tap "Turn on"
themselves — there's no way to enable it on someone's behalf.
