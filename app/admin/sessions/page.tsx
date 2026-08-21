import { redirect } from "next/navigation";

// Open sessions now show at the top of Usage Records instead of on their
// own tab — same underlying vehicle_usage data, just surfaced where an
// admin is already looking. This route stays as a redirect so any old
// links or bookmarks still land somewhere useful.
export default function SessionsRedirect() {
  redirect("/admin/records");
}
