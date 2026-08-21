import AdminNav from "@/components/AdminNav";
import { createClient } from "@/lib/supabase/server";
import TourLauncher from "@/components/tour/TourLauncher";
import { adminTourSteps } from "@/components/tour/tourSteps";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: pending } = await supabase
    .from("bookings")
    .select("id, series_id")
    .eq("approval_status", "pending");

  const distinctRequestCount = new Set((pending ?? []).map((b) => b.series_id ?? b.id)).size;

  // Feeds the small dot on the mobile "More" tab — Notifications lives
  // behind it now, so it needs some way to signal "something's waiting"
  // without a full count badge cluttering the tab bar.
  const { count: unreadCount } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("recipient_id", user!.id)
    .eq("read", false);

  return (
    <div className="min-h-screen pb-20 md:flex md:pb-0">
      <TourLauncher steps={adminTourSteps} storageKeyPrefix="ft_tour_admin" />
      <AdminNav pendingCount={distinctRequestCount} unreadCount={unreadCount ?? 0} />
      <main className="flex-1 px-4 py-6 md:px-8 md:py-8">{children}</main>
    </div>
  );
}
