import AdminNav from "@/components/AdminNav";
import { createClient } from "@/lib/supabase/server";
import TourLauncher from "@/components/tour/TourLauncher";
import { adminTourSteps } from "@/components/tour/tourSteps";
import { getViewerFeatures } from "@/lib/orgFeatures.server";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();

  // middleware.ts already called getUser() (which revalidates against
  // Supabase Auth) for every /admin request and redirected anyone who
  // isn't an active admin — so by the time we're here, re-validating is
  // redundant. getSession() just decodes the already-verified JWT from
  // the cookie, no network round trip, so it's safe to use here purely
  // to read the id for these queries.
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const userId = session!.user.id;

  const [{ data: pending }, { count: unreadCount }, features] = await Promise.all([
    supabase.from("bookings").select("id, series_id").eq("approval_status", "pending"),
    // Feeds the small dot on the mobile "More" tab — Notifications lives
    // behind it now, so it needs some way to signal "something's waiting"
    // without a full count badge cluttering the tab bar.
    supabase.from("notifications").select("*", { count: "exact", head: true }).eq("recipient_id", userId).eq("read", false),
    // Which of Incidents/Checks/Reports/Audit this organisation has
    // switched off — those entries are simply omitted from the nav below.
    // middleware.ts is what actually blocks the pages; this is just so a
    // disabled feature doesn't dangle in the menu as a dead link.
    getViewerFeatures(supabase, userId),
  ]);

  const distinctRequestCount = new Set((pending ?? []).map((b) => b.series_id ?? b.id)).size;

  return (
    <div className="min-h-screen md:flex">
      <TourLauncher steps={adminTourSteps} storageKeyPrefix="ft_tour_admin" />
      <AdminNav pendingCount={distinctRequestCount} unreadCount={unreadCount ?? 0} features={features} />
      <main className="flex-1 px-4 py-6 md:px-8 md:py-8">{children}</main>
    </div>
  );
}
