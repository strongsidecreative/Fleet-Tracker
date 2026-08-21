"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Grouped so the sidebar reads as sections instead of one flat list of
// 13 links. Group labels only render in the vertical (md+) layout — on
// mobile the nav wraps into a horizontal row where a label per group
// would just add clutter.
const groups: { label: string; items: { href: string; label: string; tourId: string; match?: (path: string) => boolean }[] }[] = [
  {
    label: "Overview",
    items: [{ href: "/admin", label: "Dashboard", tourId: "nav-admin-dashboard", match: (p) => p === "/admin" }],
  },
  {
    // Admins are drivers too when it comes to their own vehicle use —
    // these reuse the same scan/trip pages drivers use, just reached
    // from here instead of a QR code.
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
      { href: "/admin/incidents", label: "Incidents", tourId: "nav-admin-incidents" },
      { href: "/admin/vehicle-checks", label: "Checks", tourId: "nav-admin-checks" },
      { href: "/admin/reports", label: "Reports", tourId: "nav-admin-reports" },
    ],
  },
  {
    label: "System",
    items: [
      { href: "/admin/audit", label: "Audit", tourId: "nav-admin-audit" },
      { href: "/admin/notifications", label: "Notifications", tourId: "nav-admin-notifications" },
      { href: "/admin/account", label: "Account", tourId: "nav-admin-account" },
    ],
  },
];

export default function AdminNav({ pendingCount = 0 }: { pendingCount?: number }) {
  const pathname = usePathname();

  return (
    <nav
      className="border-b border-steel/20 bg-ink text-paper md:w-56 md:border-b-0 md:border-r md:min-h-screen"
      aria-label="Admin"
    >
      <div className="px-4 py-4 font-display text-lg font-bold uppercase tracking-wide">
        Fleet Tracker
        <span className="ml-2 rounded bg-brand px-1.5 py-0.5 text-xs font-medium text-paper">
          Admin
        </span>
      </div>
      <div className="px-2 pb-3 md:pb-4">
        {groups.map((group) => (
          <div key={group.label} className="md:mb-3">
            <p className="hidden px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-widest text-paper/40 md:block">
              {group.label}
            </p>
            <ul className="flex flex-wrap gap-1">
              {group.items.map((item) => {
                const active = item.match ? item.match(pathname) : pathname.startsWith(item.href);
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
                        <span className="ml-2 rounded-full bg-rust px-1.5 py-0.5 text-xs font-bold text-paper">
                          {pendingCount}
                        </span>
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
  );
}
