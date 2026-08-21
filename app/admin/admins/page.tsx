import { redirect } from "next/navigation";

// See app/admin/drivers/page.tsx — same consolidation, same reasoning.
export default function AdminsRedirect({
  searchParams,
}: {
  searchParams: { success?: string };
}) {
  const success = searchParams.success ? `&success=${encodeURIComponent(searchParams.success)}` : "";
  redirect(`/admin/people?role=admin${success}`);
}
