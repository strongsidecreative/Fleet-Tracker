"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/", label: "Home", tourId: "nav-home" },
  { href: "/trips", label: "My Trips", tourId: "nav-trips" },
  { href: "/bookings", label: "Bookings", tourId: "nav-bookings" },
  { href: "/vehicles", label: "Vehicles", tourId: "nav-vehicles" },
  { href: "/account", label: "Account", tourId: "nav-account" },
];

// asDriver is true when an admin got here via "Switch to Driver" — the
// Home tab needs to keep the "?as=driver" flag on every subsequent tap,
// otherwise tapping Home mid-browse lands back on "/" with no flag and
// immediately bounces to /admin (see app/(driver)/page.tsx). The other
// four tabs aren't affected — only "/" itself has that redirect.
export default function DriverNav({ asDriver = false }: { asDriver?: boolean }) {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-steel/20 bg-ink text-paper"
      aria-label="Primary"
    >
      <ul className="flex justify-around">
        {items.map((item) => {
          const href = asDriver && item.href === "/" ? "/?as=driver" : item.href;
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={href}
                data-tour={item.tourId}
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
