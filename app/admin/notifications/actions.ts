"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function markNotificationRead(id: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  await supabase.from("notifications").update({ read: true }).eq("id", id).eq("recipient_id", user!.id);
  revalidatePath("/admin/notifications");
  revalidatePath("/admin");
}

export async function markAllNotificationsRead() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  await supabase.from("notifications").update({ read: true }).eq("recipient_id", user!.id).eq("read", false);
  revalidatePath("/admin/notifications");
  revalidatePath("/admin");
}

/**
 * "Clear" hides a notification from the list (and marks it read). It's
 * not a hard delete: compliance alerts check past notifications so they
 * don't repeat, so a deleted alert would just come back the next day.
 */
export async function clearNotification(id: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("notifications")
    .update({ read: true, cleared_at: new Date().toISOString() })
    .eq("id", id)
    .eq("recipient_id", user.id);
  revalidatePath("/admin/notifications");
  revalidatePath("/admin");
}

export async function clearAllNotifications() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("notifications")
    .update({ read: true, cleared_at: new Date().toISOString() })
    .eq("recipient_id", user.id)
    .is("cleared_at", null);
  revalidatePath("/admin/notifications");
  revalidatePath("/admin");
}
