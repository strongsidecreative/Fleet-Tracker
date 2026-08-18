"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/", label: "Home" },
  { href: "/trips", label: "My Trips" },
  { href: "/bookings", label: "Bookings" },
  { href: "/vehicles", label: "Vehicles" },
  { href: "/account", label: "Account" },
];

export default function DriverNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-steel/20 bg-ink text-paper"
      aria-label="Primary"
    >
      <ul className="flex justify-around">
        {items.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                className={`flex flex-col items-center gap-1 py-3 text-sm font-medium transition-colors ${
                  active ? "text-brandLight" : "text-paper/70"
                }`}
                aria-current={active ? "page" : undefined}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
