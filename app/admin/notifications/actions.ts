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
