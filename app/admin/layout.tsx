import AdminNav from "@/components/AdminNav";
import { createClient } from "@/lib/supabase/server";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: pending } = await supabase
    .from("bookings")
    .select("id, series_id")
    .eq("approval_status", "pending");

  const distinctRequestCount = new Set((pending ?? []).map((b) => b.series_id ?? b.id)).size;

  return (
    <div className="min-h-screen md:flex">
      <AdminNav pendingCount={distinctRequestCount} />
      <main className="flex-1 px-4 py-6 md:px-8 md:py-8">{children}</main>
    </div>
  );
}
