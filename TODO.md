# Family Vehicle Tracker — Premium Polish To-Do

## Phase 1 — Done

- [x] Real app icons (192px, 512px) matching the app's ink/amber design, so "Add to Home
      Screen" shows a proper icon instead of a broken one
- [x] Pacific/Auckland timezone locked in everywhere (`lib/nz-time.ts`, used throughout)
- [x] Confirmation prompts before deactivating a driver/admin or cancelling a booking
      (`ConfirmSubmitButton`, wired into drivers, admins, and both admin/driver booking cancel)
- [x] Success banners after key actions (trip started/finished, vehicle added, booking made)
      instead of a silent redirect
- [x] Custom 404 and error pages instead of the default Next.js dev screens
- [x] Search and filter on the Records page (by driver, vehicle, date range)

## Phase 2 — Done

- [x] Vehicle photo upload (Supabase Storage) and display throughout the app
- [x] A simple KM-by-week chart on the admin dashboard (recharts)

## Phase 3 — Done

- [x] **Push notifications** — service worker, `web-push`, VAPID keys as env vars, subscription
      storage in Supabase, one database trigger fanning out to all 8 live notification types
      (migration `0012_push_notifications.sql`; needs the dispatch URL set post-deploy, see
      README).
- [x] **"Create Incident" quick-action from a Vehicle Check Issue** — admin-side pathway to
      raise an incident report directly from a flagged Vehicle Check item (migration
      `0011_incident_from_vehicle_check.sql`).

### Declined
- [x] ~~Fuel cost tracking~~ and ~~driver leaderboard/gamification~~ — explicitly out of scope,
      not being built.

## Extra features — Done

- [x] Driver licence management (admin-only, with alerts)
- [x] Standalone Vehicle Check (9-item checklist, separate from trips)

## Phase 4 — Done

- [x] **Real logo + brand refresh** — real app icons swapped in from the actual uploaded logo
      (was a generic placeholder before), and the colour palette in `tailwind.config.js`
      re-anchored to colours sampled directly from it (`ink`, `brand`, `brandLight`). Cascades
      through nav, buttons, and badges automatically since those already used the palette
      tokens rather than hardcoded colours.
