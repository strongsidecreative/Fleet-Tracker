import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { notificationHref } from "@/lib/notificationLinks";

// Tapping a notification (in the list or a push on the phone) comes here:
// mark it read, then go straight to the booking / check / vehicle it's
// about. RLS only lets people read and update their own notifications.
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const res = NextResponse.redirect(new URL("/login", req.url));
    res.cookies.set("redirect_after_login", `/notifications/open/${params.id}`, {
      maxAge: 60 * 10,
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });
    return res;
  }

  const [{ data: n }, { data: profile }] = await Promise.all([
    supabase
      .from("notifications")
      .select("id, type, related_table, related_id, read")
      .eq("id", params.id)
      .eq("recipient_id", user.id)
      .maybeSingle(),
    supabase.from("profiles").select("role").eq("id", user.id).single(),
  ]);

  const role = profile?.role === "admin" ? "admin" : "driver";
  if (!n) {
    return NextResponse.redirect(new URL(role === "admin" ? "/admin/notifications" : "/bookings", req.url));
  }

  let licenceDriverId: string | null = null;
  if (n.related_table === "driver_licences" && n.related_id) {
    const { data: lic } = await supabase.from("driver_licences").select("driver_id").eq("id", n.related_id).maybeSingle();
    licenceDriverId = lic?.driver_id ?? null;
  }

  if (!n.read) {
    await supabase.from("notifications").update({ read: true }).eq("id", n.id);
  }

  return NextResponse.redirect(new URL(notificationHref(n, role, licenceDriverId), req.url));
}
