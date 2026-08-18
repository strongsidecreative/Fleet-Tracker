"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/vehicles", label: "Vehicles" },
  { href: "/admin/drivers", label: "Drivers" },
  { href: "/admin/admins", label: "Admins" },
  { href: "/admin/bookings", label: "Bookings" },
  { href: "/admin/incidents", label: "Incidents" },
  { href: "/admin/vehicle-checks", label: "Checks" },
  { href: "/admin/reports", label: "Reports" },
  { href: "/admin/records", label: "Records" },
  { href: "/admin/sessions", label: "Sessions" },
  { href: "/admin/audit", label: "Audit" },
  { href: "/admin/notifications", label: "Notifications" },
  { href: "/admin/account", label: "Account" },
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
      <ul className="flex flex-wrap gap-1 px-2 pb-3 md:flex-col md:pb-4">
        {items.map((item) => {
          const active =
            item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
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
    </nav>
  );
}
