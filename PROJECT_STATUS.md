# Fleet Tracker — project status

Written as a resume point for a new chat. If you're Claude reading this fresh: read this whole
file before doing anything, it covers what's built, what's deployed, and the gotchas already
hit so they don't get repeated.

## What this is

Family vehicle tracker — QR code scan at start/end of every trip, admin dashboard, bookings
with approval workflow, compliance (WOF/rego/RUC/service) and driver licence alerts, incident
reports, vehicle checks, push notifications. Next.js 14 (App Router) + Supabase (Postgres/Auth/
Storage/RLS) + Tailwind, deployed on Vercel free tier. Target cost: $0/month.

## Live deployment

- Repo: `github.com/strongsidecreative/Fleet-Tracker` (GitHub + Vercel both under
  `strongsidecreative@protonmail.com`)
- Live URL: `https://fleet-tracker-liard.vercel.app`
- Deployed and working as of this writing — build passes, middleware runtime works, all env
  vars confirmed present in Vercel Production.

## Database — all migrations 0001–0012 applied

| # | File | What it adds |
|---|------|---------------|
| 0001 | `init.sql` | Core schema: `profiles`, `vehicles`, `vehicle_usage`, `audit_log` |
| 0002 | `maintenance_and_incidents.sql` | `incident_reports`, `notifications` |
| 0003 | `bookings.sql` | `bookings` |
| 0004 | `report_notifications.sql` | Weekly/monthly report notification (later removed, see 0010) |
| 0005 | `compliance_system.sql` | WOF/rego/RUC/service threshold-based alerts |
| 0006 | `vehicle_photos.sql` | Vehicle photo upload (Supabase Storage) |
| 0007 | `driver_licence_vehicle_checks.sql` | `driver_licences`, `vehicle_checks`, `vehicle_check_items` |
| 0008 | `booking_approvals_recurring.sql` | `booking_series`, full approval workflow, recurring bookings |
| 0009 | `booking_edit_reapproval.sql` | Editing an approved booking sends it back to pending |
| 0010 | `remove_report_notifications.sql` | Removed `report_ready` (redundant with dashboard chart); merged `booking_declined`/`booking_cancelled` into one `booking_declined` notification |
| 0011 | `incident_from_vehicle_check.sql` | "Create Incident" quick-action from a flagged Vehicle Check item |
| 0012 | `push_notifications.sql` | `push_subscriptions`, `app_config`, one DB trigger fanning every notification out to push |

All migration files use `if not exists` / `drop if exists` guards — safe to re-run any of them.

## Push notifications — how it works

One trigger (`trg_notify_push`) on the `notifications` table fires on every insert, regardless
of whether it came from a server action or a SQL trigger/cron job. It calls `net.http_post`
(pg_net extension) to `/api/push/dispatch` on the deployed app, which looks up the recipient's
`push_subscriptions`, sends via `web-push`, and prunes dead subscriptions (410/404).

- `app_config` table holds `push_dispatch_url` (set to
  `https://fleet-tracker-liard.vercel.app/api/push/dispatch`) and `push_dispatch_secret` (must
  match the `PUSH_DISPATCH_SECRET` env var — already does).
- VAPID keys generated once, live in `.env.local` and in Vercel env vars.
- 8 live notification types get pushed: `maintenance_due`, `incident_report`,
  `licence_expiring`, `vehicle_check_issue`, `booking_created`, `booking_approved`,
  `booking_declined`, `booking_override`.
- iOS only receives push if the app was added to the Home Screen first (Safari doesn't support
  push in a regular tab). Android/desktop work in a normal browser tab.
- Toggle is on the Account page (driver and admin), component `PushSubscribeButton.tsx`.

## Environment variables (Vercel → Settings → Environment Variables → Production)

All 8 confirmed present and working:

`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`,
`NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `PUSH_DISPATCH_SECRET`,
`NEXT_PUBLIC_SITE_URL` (= the live URL above).

Real values live in the local `.env.local` (gitignored, never committed).

## Design

Real logo (uploaded by the user, not a placeholder) baked into `public/icon-192.png` /
`icon-512.png`. Tailwind palette in `tailwind.config.js` re-anchored to colours sampled
directly from that logo: `ink` `#070E1F`, `brand` `#1365F2`, `brandLight` `#2CAEFC`. Status
colours (`amber`/`track`/`rust`) are semantic, untouched. `manifest.json` and the
`themeColor` in `app/layout.tsx` match. Small global polish in `globals.css`: on-brand focus
rings, antialiasing, text-selection colour.

## PWA

`manifest.json` + real icons + `icons.apple` metadata in `app/layout.tsx` (iOS reads that link
tag for the home-screen icon, not the manifest) + `ServiceWorkerRegister.tsx` registers
`public/sw.js` site-wide on load (not just on the Account page) so install prompts show up
correctly on Android/desktop.

## QR code generation

Admin flow now goes straight from adding a vehicle to its QR code:

- `app/admin/vehicles/actions.ts` — `createVehicle` inserts the vehicle, then redirects to
  `/admin/vehicles/{id}/qr?success=...` instead of back to the vehicle list.
- `app/admin/vehicles/[id]/qr/page.tsx` — per-vehicle QR page. Builds the scan URL from
  `NEXT_PUBLIC_SITE_URL` + `vehicle.qr_identifier`, renders it with the `qrcode` package. Now
  shows the `SuccessBanner` and a "Done, back to vehicles" link so it works both as a
  post-creation step and as a standalone page (still linked from the vehicle detail page too).
- `app/admin/vehicles/[id]/qr/QrCardActions.tsx` — Print button captures the whole card via the
  print stylesheet (unchanged). Download button now draws the QR image plus the vehicle name and
  registration onto a `<canvas>` and downloads that combined PNG, so a downloaded file (not just
  a printed one) carries the registration number.

## Declined / not built

Fuel cost tracking and driver leaderboard/gamification — explicitly out of scope, user said no.

## Known gotchas hit during setup (don't repeat these)

- **This folder is OneDrive-synced.** Running `git init`/`git add`/`git commit` through a
  sandboxed tool fails partway with "Operation not permitted" errors (OneDrive locks files
  mid-write) and can leave a broken `.git` folder that also can't be cleaned up the same way.
  Git commands must be run by the user in a normal terminal on their own machine, never through
  a sandboxed tool pointed at this folder.
- **Vercel env var UI**: easy to accidentally swap the Key and Value fields, or paste the `=`
  sign into the Key field. Always verify by re-reading both fields before saving. The
  "Sensitive" toggle hides the value afterward, which makes mistakes hard to spot — leave it
  off for `NEXT_PUBLIC_*` vars since those ship to the browser anyway, no reason to hide them.
- **Adding/editing env vars needs a manual redeploy** — Vercel doesn't rebuild automatically
  just because a var changed.
- **Login/forgot-password/reset-password pages** originally crashed the build ("Supabase URL
  and API key are required") because Next.js tried to statically prerender them at build time,
  before env vars are meaningfully available in that context. Fixed by splitting each into a
  thin Server Component `page.tsx` (`export const dynamic = "force-dynamic"`) that renders a
  Client Component form (`LoginForm.tsx`, `ForgotPasswordForm.tsx`, `ResetPasswordForm.tsx`).
  This is a real code fix, not a config workaround — don't revert it.
- Middleware (`middleware.ts`) needs `NEXT_PUBLIC_SUPABASE_URL`/`ANON_KEY` at runtime on every
  request; if those are ever missing/wrong in Vercel, every page 500s with "Routing Middleware
  has crashed" even though the build itself succeeds.

## Outstanding / next steps

- [ ] Confirm Supabase → Authentication → URL Configuration has Site URL + a Redirect URL set
      to `https://fleet-tracker-liard.vercel.app` (was in progress, not confirmed done)
- [ ] Regenerate and reprint QR codes for every vehicle (old ones encode `localhost:3000`)
- [ ] Swap in real whānau/vehicle data if any test data is still in place
- [ ] End-to-end test: trigger a real notification (e.g. submit a booking) and confirm a push
      actually arrives on a subscribed device
- [ ] Confirm the iPhone Home Screen install shows the real logo, not a generic icon
