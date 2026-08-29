"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function toggleUserActive(userId: string, newActive: boolean) {
  const supabase = createClient();
  await supabase.from("profiles").update({ active: newActive }).eq("id", userId);
  revalidatePath("/admin/drivers");
  revalidatePath("/admin/admins");
  revalidatePath("/admin/people");
}

/**
 * For someone who was invited but never finished signing in (invite email
 * lost to spam, hit Supabase's mailer rate limit, or just missed) — sends
 * them a fresh link to set their password. inviteUserByEmail errors on a
 * user that already exists, so this reuses the password-recovery flow
 * instead; ResetPasswordForm.tsx already handles both invite and recovery
 * links the same way, so no new page is needed.
 */
export async function resendInvite(email: string, role: "driver" | "admin") {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: callerProfile } = await supabase.from("profiles").select("role").eq("id", user!.id).single();
  if (callerProfile?.role !== "admin") {
    redirect(`/admin/people?role=${role}`);
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${siteUrl}/reset-password` });

  revalidatePath("/admin/people");
  redirect(`/admin/people?role=${role}&success=Invite resent`);
}
