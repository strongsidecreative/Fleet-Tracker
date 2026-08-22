"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { FeatureKey } from "@/lib/orgFeatures";

type NavItem = { href: string; label: string; tourId: string; match?: (path: string) => boolean; feature?: FeatureKey };

// Full set, grouped — used as-is for the desktop sidebar (plenty of room,
// nothing clustered about a vertical list), and re-sliced below into
// "pinned" + "everything else" for the mobile tab bar. Items with a
// `feature` key are dropped entirely when that feature is switched off
// for the current organisation (see the `features` prop below) — nav
// visibility only, the actual page-level block lives in middleware.ts.
const groups: { label: string; items: NavItem[] }[] = [
  {
    label: "Overview",
    items: [{ href: "/admin", label: "Dashboard", tourId: "nav-admin-dashboard", match: (p) => p === "/admin" }],
  },
  {
    label: "My Driving",
    items: [
      { href: "/scan", label: "Scan Vehicle", tourId: "nav-admin-scan", match: (p) => p === "/scan" },
      { href: "/trips", label: "My Trips", tourId: "nav-admin-mytrips", match: (p) => p === "/trips" },
    ],
  },
  {
    label: "Fleet",
    items: [
      { href: "/admin/vehicles", label: "Vehicles", tourId: "nav-admin-vehicles" },
      {
        href: "/admin/people",
        label: "People",
        tourId: "nav-admin-people",
        match: (p) => p.startsWith("/admin/people") || p.startsWith("/admin/drivers") || p.startsWith("/admin/admins"),
      },
      { href: "/admin/bookings", label: "Bookings", tourId: "nav-admin-bookings" },
    ],
  },
  {
    label: "Activity",
    items: [
      {
        href: "/admin/records",
        label: "Records",
        tourId: "nav-admin-records",
        match: (p) => p.startsWith("/admin/records") || p.startsWith("/admin/sessions"),
      },
      { href: "/admin/incidents", label: "Incidents", tourId: "nav-admin-incidents", feature: "incident_reports" },
      { href: "/admin/vehicle-checks", label: "Checks", tourId: "nav-admin-checks", feature: "vehicle_checks" },
      { href: "/admin/reports", label: "Reports", tourId: "nav-admin-reports", feature: "reports" },
    ],
  },
  {
    label: "System",
    items: [
      { href: "/admin/audit", label: "Audit", tourId: "nav-admin-audit", feature: "audit_log" },
      { href: "/admin/notifications", label: "Notifications", tourId: "nav-admin-notifications" },
      { href: "/admin/account", label: "Account", tourId: "nav-admin-account" },
    ],
  },
];

// The 4 always-visible mobile tabs. Everything else (including these
// four's less-frequent siblings, like My Trips) lives behind "More".
const PINNED_HREFS = ["/admin", "/admin/bookings", "/admin/vehicles", "/scan"];

function isActive(item: NavItem, pathname: string) {
  return item.match ? item.match(pathname) : pathname.startsWith(item.href);
}

export default function AdminNav({
  pendingCount = 0,
  unreadCount = 0,
  features,
}: {
  pendingCount?: number;
  unreadCount?: number;
  features?: Record<FeatureKey, boolean>;
}) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  const visibleGroups = groups
    .map((g) => ({ ...g, items: g.items.filter((i) => !i.feature || features?.[i.feature] !== false) }))
    .filter((g) => g.items.length > 0);

  const allItems = visibleGroups.flatMap((g) => g.items);
  const pinned = PINNED_HREFS.map((href) => allItems.find((i) => i.href === href)).filter(Boolean) as NavItem[];
  // My Trips is handled as its own standalone link above these groups
  // (no longer worth a whole "My Driving" section now that Scan Vehicle
  // is pinned) — exclude both it and the now-empty Overview group here so
  // it doesn't also show up a second time under a group heading.
  const moreGroups = visibleGroups
    .map((g) => ({ ...g, items: g.items.filter((i) => !PINNED_HREFS.includes(i.href)) }))
    .filter((g) => g.items.length > 0 && g.label !== "Overview" && g.label !== "My Driving");
  const moreIsActive = pathname === "/trips" || moreGroups.some((g) => g.items.some((i) => isActive(i, pathname)));

  return (
    <>
      {/* Desktop: full grouped sidebar, unchanged from before — plenty of
          vertical room for 13 items to read as a clear list. */}
      <nav className="hidden bg-ink text-paper md:block md:w-56 md:min-h-screen md:border-r md:border-steel/20" aria-label="Admin">
        <div className="px-4 py-4">
          <p className="font-display text-lg font-bold uppercase tracking-wide">Fleet Tracker</p>
          <div className="mt-1.5 flex items-center justify-between">
            <span className="rounded bg-brand px-1.5 py-0.5 text-xs font-medium text-paper">Admin</span>
            <Link
              href="/"
              className="rounded bg-brand px-2 py-1 text-xs font-semibold text-paper hover:opacity-90"
            >
              Switch to Driver
            </Link>
          </div>
        </div>
        <div className="px-2 pb-4">
          {visibleGroups.map((group) => (
            <div key={group.label} className="mb-3">
              <p className="px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-widest text-paper/40">{group.label}</p>
              <ul className="flex flex-col gap-1">
                {group.items.map((item) => {
                  const active = isActive(item, pathname);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        data-tour={item.tourId}
                        className={`flex items-center justify-between rounded px-3 py-2 text-sm font-medium transition-colors ${
                          active ? "bg-brand text-paper" : "text-paper/80 hover:bg-steel/30"
                        }`}
                        aria-current={active ? "page" : undefined}
                      >
                        {item.label}
                        {item.href === "/admin/bookings" && pendingCount > 0 && (
                          <span className="ml-2 rounded-full bg-rust px-1.5 py-0.5 text-xs font-bold text-paper">{pendingCount}</span>
                        )}
                        {item.href === "/admin/notifications" && unreadCount > 0 && (
                          <span className="ml-2 rounded-full bg-rust px-1.5 py-0.5 text-xs font-bold text-paper">{unreadCount}</span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </nav>

      {/* Mobile: header stays on top (same as before), followed by 4
          pinned tabs + "More" for everything else — a single row instead
          of the old wrapped wall of 13 buttons. Sits in normal document
          flow rather than fixed to the bottom. */}
      <nav className="border-b border-steel/20 bg-ink text-paper md:hidden" aria-label="Admin">
        <div className="flex items-center justify-between px-4 py-4">
          <div className="font-display text-lg font-bold uppercase tracking-wide">
            Fleet Tracker
            <span className="ml-2 rounded bg-brand px-1.5 py-0.5 text-xs font-medium text-paper">Admin</span>
          </div>
          <Link
            href="/"
            className="rounded bg-brand px-2.5 py-1.5 text-xs font-semibold text-paper hover:opacity-90"
          >
            Switch to Driver
          </Link>
        </div>
        <ul className="flex justify-around border-t border-steel/20">
          {pinned.map((item) => {
            const active = isActive(item, pathname);
            return (
              <li key={item.href} className="flex-1">
                <Link
                  href={item.href}
                  data-tour={item.tourId}
                  className={`relative flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors ${
                    active ? "text-brandLight" : "text-paper/70"
                  }`}
                  aria-current={active ? "page" : undefined}
                >
                  {item.label}
                  {item.href === "/admin/bookings" && pendingCount > 0 && (
                    <span className="absolute right-3 top-1 rounded-full bg-rust px-1.5 py-0.5 text-[10px] font-bold text-paper">
                      {pendingCount}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
          <li className="flex-1">
            <button
              type="button"
              data-tour="nav-admin-more"
              onClick={() => setMoreOpen(true)}
              className={`relative flex w-full flex-col items-center gap-1 py-3 text-xs font-medium transition-colors ${
                moreOpen || moreIsActive ? "text-brandLight" : "text-paper/70"
              }`}
              aria-haspopup="dialog"
              aria-expanded={moreOpen}
            >
              More
              {unreadCount > 0 && (
                <span className="absolute right-4 top-1.5 h-2 w-2 rounded-full bg-rust" aria-label="Unread notifications" />
              )}
            </button>
          </li>
        </ul>
      </nav>

      {moreOpen && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="More admin sections">
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setMoreOpen(false)}
            className="absolute inset-0 bg-ink/60"
          />
          <div className="absolute inset-x-0 bottom-0 max-h-[75vh] overflow-y-auto rounded-t-2xl bg-ink text-paper p-4 pb-8">
            <div className="mb-2 flex items-center justify-between">
              <p className="font-display text-base font-bold">More</p>
              <button type="button" onClick={() => setMoreOpen(false)} className="px-2 py-1 text-sm text-paper/70">
                Close
              </button>
            </div>
            <ul className="mb-3">
              <li>
                <Link
                  href="/trips"
                  data-tour="nav-admin-mytrips"
                  className={`block rounded px-3 py-2 text-sm font-medium ${
                    pathname === "/trips" ? "bg-brand text-paper" : "text-paper/80 hover:bg-steel/30"
                  }`}
                >
                  My Trips
                </Link>
              </li>
            </ul>
            {moreGroups.map((group) => (
              <div key={group.label} className="mb-3">
                <p className="px-3 pb-1 text-[10px] font-bold uppercase tracking-widest text-paper/40">{group.label}</p>
                <ul className="flex flex-col gap-1">
                  {group.items.map((item) => {
                    const active = isActive(item, pathname);
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          data-tour={item.tourId}
                          className={`flex items-center justify-between rounded px-3 py-2 text-sm font-medium ${
                            active ? "bg-brand text-paper" : "text-paper/80 hover:bg-steel/30"
                          }`}
                        >
                          {item.label}
                          {item.href === "/admin/notifications" && unreadCount > 0 && (
                            <span className="ml-2 rounded-full bg-rust px-1.5 py-0.5 text-xs font-bold text-paper">{unreadCount}</span>
                          )}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
