import DriverNav from "@/components/DriverNav";
import TourLauncher from "@/components/tour/TourLauncher";
import PullToRefresh from "@/components/PullToRefresh";
import { driverTourSteps } from "@/components/tour/tourSteps";
import Link from "next/link";
import { getCurrentUser, getMyProfile } from "@/lib/supabase/current";

export default async function DriverLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  // Admins land here too — scanning a vehicle and tracking trips uses the
  // same pages as drivers (no separate admin-only version of this flow).
  // Show a way back to the admin dashboard so it doesn't feel like a dead
  // end once they're on these driver-facing pages.
  // Shared with the page (and getViewerFeatures) via React cache — one
  // profiles query per request instead of one per component.
  const profile = user ? await getMyProfile() : null;
  const isAdmin = profile?.role === "admin";

  return (
    <div className="min-h-screen">
      <PullToRefresh />
      {/* The full driver welcome tour (its "Home"/"Start a trip" steps
          target path "/", which now redirects admins straight to
          /admin unless "?as=driver" is present) doesn't make sense for an
          admin anyway — they get their own tour, launched from the admin
          dashboard. Auto-starting this one for an admin's first visit to
          /scan or /trips used to leave the tooltip stuck on-screen with
          nothing to highlight and bounce back to /admin on every "Next". */}
      {!isAdmin && user && (
        <TourLauncher steps={driverTourSteps} storageKeyPrefix="ft_tour_driver" userId={user.id} />
      )}
      {/* Header + tabs both sit up top in normal document flow now,
          instead of a fixed bottom tab bar — consistent with the admin
          nav layout. */}
      <div className="flex items-center justify-between border-b border-steel/20 bg-ink px-4 py-4">
        <span className="font-display text-lg font-bold uppercase tracking-wide text-paper">Fleet Tracker</span>
        {isAdmin && (
          <Link
            href="/admin"
            className="rounded bg-brand px-2.5 py-1.5 text-xs font-semibold text-paper hover:opacity-90"
          >
            Switch to Admin
          </Link>
        )}
      </div>
      <DriverNav asDriver={isAdmin} />
      <main className="mx-auto max-w-lg px-4 py-6">{children}</main>
    </div>
  );
}
