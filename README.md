# Fleet Tracker

Mobile-first web app for tracking who's using which of the family's 8 vehicles, via a QR
code scan at the start and end of every trip. Built for zero ongoing cost.

## Stack

- **Next.js 14** (App Router), deployed on **Vercel** free tier
- **Supabase** free tier: Postgres database, Auth, and Row Level Security
- **Tailwind CSS** for styling
- **qrcode** (npm package) for generating vehicle QR codes client-side, no paid QR service

All of this runs at $0/month for a family's usage volume. If you ever need to leave Supabase,
it's plain Postgres underneath, so the database can be exported and self-hosted without
rebuilding the app.

## What's built so far

- Full schema live in Supabase (migrations 0001–0007): vehicles, trips, bookings, incidents,
  full compliance/RUC/servicing tracking, notifications, driver licences, standalone vehicle
  checks, all with RLS and database-level constraints
- **Driver flow, fully wired**: dashboard, real camera QR scanning, start/finish trip, My
  Trips, Vehicles, Account (with read-only licence info), Bookings, Report an Incident, and
  standalone Vehicle Check (9-item checklist, not tied to trips)
- **Admin flow, fully wired**: Dashboard (Vehicle Alerts table), Vehicles (add/edit/QR
  generation+printing, full compliance fields), Drivers (with licence management) and Admins
  (invite, deactivate/reactivate — no hard deletes), Bookings, Incidents, Vehicle Checks
  (filterable list + full detail view), Reports (CSV export), Records (CSV export), Sessions,
  Audit, Notifications, Account
- Forgot/reset password using Supabase's built-in email flow
- **Full WOF / Registration / RUC / Service reminder system**: threshold-based alerts,
  recalculated instantly whenever a driver finishes a trip, plus a daily sweep for anything
  date-based, deduplicated per due-value cycle
- **Driver licence tracking**: admin-only management, automatic Valid/Expiring Soon/
  Urgent/Expired status, alerts on the same 30/14/7/expired schedule, feeding into the
  existing notification system
- **Standalone Vehicle Check**: pre/post-operation inspection with a 9-item checklist,
  mandatory comments and optional photos on any Issue, initials sign-off, and a permanent
  read-only record — completely separate from the QR checkout/return flow, exactly like
  Report an Incident

## Not built yet

Everything from both specs is now built. What's left is deployment (a real domain instead of
localhost) and swapping in real whānau/vehicle data. One deliberate omission: there's no
"Create Incident" / "Create Maintenance Item" quick-action from a Vehicle Check Issue yet —
that needs an admin-side incident-creation pathway that doesn't exist yet (incidents are
currently driver-submitted only). Worth building as a follow-up, not required for launch.

## One-time setup still needed

1. Run `supabase/migrations/0005_compliance_system.sql`,
   `supabase/migrations/0006_vehicle_photos.sql`, and
   `supabase/migrations/0007_driver_licence_vehicle_checks.sql` in the SQL Editor (same
   process as the earlier ones, one at a time) if you haven't already. **0007 does not modify
   or depend on changes to 0001–0006** — if you've already run everything through 0006, you
   only need to run 0007.
2. Service role key and Auth redirect URL, as covered earlier — needed for Add Driver, Add
   Admin, and password resets.
3. `npm install` to pick up `html5-qrcode` and `recharts` if you haven't already.

## Design direction

Palette and type system live in `tailwind.config.js`, named `ink` / `steel` / `paper` /
`amber` / `track` / `rust`. The signature element is the `.odometer` text style in
`globals.css` — KM stats are set in a tabular-numeral display face so they read like a real
vehicle odometer, tying the visual identity back to what the app actually tracks. Amber means
a vehicle is in use, green means available, rust is reserved for validation errors like a
rejected odometer reading.

## Setup (once we're ready to actually run this)

1. Create a free Supabase project at supabase.com.
2. In the SQL Editor, run `supabase/migrations/0001_init.sql`.
3. Copy `.env.example` to `.env.local` and fill in the three values from
   Project Settings → API in Supabase.
4. `npm install`
5. `npm run dev`

Full non-developer setup instructions (creating the first admin, adding drivers and
vehicles, deploying to Vercel, generating and printing QR codes, backups) will be written
once the corresponding features are built, so the README stays accurate to what actually
exists.

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
