import { redirect } from "next/navigation";

// Drivers and Admins now live together on one "People" page (with a
// role toggle) instead of two separate nav tabs. This route stays in
// place — with its /new, /export, and /[id] children untouched — so any
// old links or bookmarks to it still land somewhere useful.
export default function DriversRedirect({
  searchParams,
}: {
  searchParams: { success?: string };
}) {
  const success = searchParams.success ? `&success=${encodeURIComponent(searchParams.success)}` : "";
  redirect(`/admin/people?role=driver${success}`);
}
