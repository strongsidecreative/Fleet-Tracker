# Deploying Fleet Tracker

Target: a free `*.vercel.app` address to start (custom domain can be added later, no rebuild
needed). You already have GitHub and Vercel accounts, so this is just wiring the three
pieces together: GitHub (code) → Vercel (hosting) → Supabase (already live).

## 0. One cleanup step first

An attempt to initialise git on this folder from inside a sandboxed tool failed partway
through, because this folder is synced by OneDrive and OneDrive locks files mid-write in a
way that tool couldn't work around. It left a broken `.git` folder behind. Before starting:

1. Open this folder in File Explorer (not this app).
2. Delete the `.git` folder (it's hidden — enable "Show hidden items" in File Explorer's
   View menu if you don't see it).
3. Everything else in the folder (your actual code) is untouched — this only affects the
   git setup, not your app.

Do the rest of this guide from a regular terminal (PowerShell, Command Prompt, or VS Code's
terminal) opened directly in this folder — not through this chat — since that's a normal,
unsandboxed process and won't hit the same OneDrive locking issue.

## 1. Push the code to GitHub

```
git init
git add -A
git commit -m "Fleet Tracker"
```

Then on github.com: New repository → give it a name (e.g. `fleet-tracker`) → **don't**
initialise with a README (you already have one) → Create repository. It'll show you two
commands, run them here:

```
git remote add origin https://github.com/YOUR-USERNAME/fleet-tracker.git
git branch -M main
git push -u origin main
```

`.gitignore` already excludes `node_modules`, `.next`, and `.env.local` — your Supabase keys
and other secrets won't be pushed.

## 2. Import into Vercel

On vercel.com: Add New → Project → import the `fleet-tracker` repo you just pushed. Vercel
auto-detects Next.js, no config changes needed. Before clicking Deploy, add environment
variables (Settings → Environment Variables, or the form on the import screen) — copy each
value from your local `.env.local`:

| Variable | Where it comes from |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `.env.local` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `.env.local` |
| `SUPABASE_SERVICE_ROLE_KEY` | `.env.local` |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | `.env.local` |
| `VAPID_PRIVATE_KEY` | `.env.local` |
| `VAPID_SUBJECT` | `.env.local` |
| `PUSH_DISPATCH_SECRET` | `.env.local` |
| `NEXT_PUBLIC_SITE_URL` | leave blank for now — see step 3 |

Click Deploy. Vercel gives you a `https://fleet-tracker-xxxx.vercel.app` address once it
finishes (a minute or two).

## 3. Point the app at its own real address

A few things need to know the real deployed URL — QR codes, auth redirects, and push
notifications all build links from it.

1. **Vercel**: Settings → Environment Variables → add `NEXT_PUBLIC_SITE_URL` =
   `https://fleet-tracker-xxxx.vercel.app` (your actual address) → Deployments → redeploy
   (env var changes need a redeploy to take effect).
2. **Supabase Auth**: Project Settings → Authentication → URL Configuration → set Site URL
   and add a Redirect URL, both to your Vercel address. This is what makes password
   reset/invite emails link back to the right place instead of localhost.
3. **Push notifications**: in the Supabase SQL Editor, run:
   ```sql
   update app_config set value = 'https://fleet-tracker-xxxx.vercel.app/api/push/dispatch'
   where key = 'push_dispatch_url';
   ```
   (see `README.md` → "Push notifications" for the full explanation).
4. **QR codes**: any vehicle QR codes printed before this point encode the old
   `localhost:3000` URL and won't work. Regenerate and reprint them from
   Admin → Vehicles once the real domain is set.

## 4. Confirm all migrations have run

If you haven't been running each migration as it was created, go to the Supabase SQL Editor
and run `supabase/migrations/0001_init.sql` through `0012_push_notifications.sql` **in order,
one at a time**. If some are already applied, running them again is safe — they're all
written with `if not exists` / `drop ... if exists` guards.

## 5. Custom domain, whenever you're ready

Vercel → Settings → Domains → add your domain → it gives you one or two DNS records to add
at your registrar. Once it's verified, repeat step 3 (site URL, Supabase Auth, push dispatch
URL, QR codes) pointing at the new domain instead of the `.vercel.app` one.
