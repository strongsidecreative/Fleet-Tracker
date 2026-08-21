import DriverNav from "@/components/DriverNav";
import TourLauncher from "@/components/tour/TourLauncher";
import { driverTourSteps } from "@/components/tour/tourSteps";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function DriverLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Admins land here too — scanning a vehicle and tracking trips uses the
  // same pages as drivers (no separate admin-only version of this flow).
  // Show a way back to the admin dashboard so it doesn't feel like a dead
  // end once they're on these driver-facing pages.
  let isAdmin = false;
  if (user) {
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    isAdmin = profile?.role === "admin";
  }

  return (
    <div className="min-h-screen pb-20">
      <TourLauncher steps={driverTourSteps} storageKeyPrefix="ft_tour_driver" />
      {isAdmin && (
        <div className="border-b border-steel/20 bg-ink px-4 py-2 text-center">
          <Link href="/admin" className="text-xs font-semibold text-brandLight underline">
            ← Back to Admin Dashboard
          </Link>
        </div>
      )}
      <main className="mx-auto max-w-lg px-4 py-6">{children}</main>
      <DriverNav />
    </div>
  );
}
