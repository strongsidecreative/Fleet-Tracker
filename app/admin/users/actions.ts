"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { randomBytes } from "crypto";

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

// Confirms the caller is allowed to deactivate this particular driver:
// either the driver deactivating themselves, or an admin deactivating a
// driver in their own organisation. Runs against the caller's own
// cookie-scoped client (RLS applies), never the service-role one — so
// this check can't be bypassed by calling the server action directly
// with an arbitrary userId.
async function requireSelfOrOwnOrgDriver(targetUserId: string): Promise<{ error: string | null }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You need to be signed in to do that." };
  }

  if (user.id === targetUserId) {
    return { error: null };
  }

  const { data: callerProfile } = await supabase
    .from("profiles")
    .select("role, organisation_id")
    .eq("id", user.id)
    .single();

  if (callerProfile?.role !== "admin") {
    return { error: "You're not authorised to do that." };
  }

  const { data: targetProfile } = await supabase
    .from("profiles")
    .select("role, organisation_id")
    .eq("id", targetUserId)
    .single();

  if (
    !targetProfile ||
    targetProfile.role !== "driver" ||
    targetProfile.organisation_id !== callerProfile.organisation_id
  ) {
    return { error: "You're not authorised to do that." };
  }

  return { error: null };
}

/**
 * Deactivating a driver used to just flip `profiles.active` off (same as
 * an admin) — but that leaves their real email tied up on an account that
 * can never really come back the same way, since re-inviting the same
 * address fails with "a user with this email already exists." This does
 * both in one step: blocks their login (same as before) AND frees their
 * real email address so a fresh invite can go out to it right away —
 * either to the same person starting over, or someone else. The `profiles`
 * row and every trip/booking/incident/check tied to it are left exactly
 * as they are (the database won't let a driver with any history be
 * deleted anyway) — only the login itself goes away, permanently.
 *
 * Deliberately driver-only: an admin's own login isn't touched by this —
 * they keep the plain reversible Deactivate/Reactivate toggle above,
 * since losing admin access by accident is a much bigger deal than a
 * driver needing a fresh invite.
 */
export async function deactivateDriverAndFreeEmail(userId: string): Promise<{ error: string | null }> {
  const authCheck = await requireSelfOrOwnOrgDriver(userId);
  if (authCheck.error) {
    return authCheck;
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return {
      error:
        "The service role key isn't set up yet, so this driver's email can't be freed up. Add SUPABASE_SERVICE_ROLE_KEY to your environment (see README), then try again.",
    };
  }

  const adminClient = createAdminClient();

  // Placeholder is keyed on the user's own id, so it can never collide
  // with another placeholder. email_confirm:true skips sending a
  // confirmation email to an address nothing will ever receive at.
  const placeholderEmail = `deactivated-${userId}@fleet-tracker.invalid`;
  const randomPassword = randomBytes(24).toString("hex");

  const { error: authError } = await adminClient.auth.admin.updateUserById(userId, {
    email: placeholderEmail,
    password: randomPassword,
    email_confirm: true,
    ban_duration: "87600h", // ten years — effectively permanent, no "unban" flow exists in this app
  });

  if (authError) {
    return { error: "Something went wrong deactivating this account. Please try again." };
  }

  await adminClient.from("profiles").update({ active: false }).eq("id", userId);

  revalidatePath("/admin/people");
  revalidatePath("/account");

  return { error: null };
}

/**
 * Wraps deactivateDriverAndFreeEmail for the admin People list — a plain
 * form action (bound to a specific driver id), redirecting back with a
 * banner instead of returning state, matching the success/error query
 * param pattern already used elsewhere in this app (see createUser).
 */
export async function deactivateDriverFromAdmin(userId: string) {
  const result = await deactivateDriverAndFreeEmail(userId);
  if (result.error) {
    redirect(`/admin/people?role=driver&error=${encodeURIComponent(result.error)}`);
  }
  redirect(
    `/admin/people?role=driver&success=${encodeURIComponent("Driver deactivated. Their email is free to invite again.")}`
  );
}

/**
 * Wraps deactivateDriverAndFreeEmail for a driver's own Account page —
 * self-service, always targets the caller's own id. Signs them out
 * immediately afterwards: the ban and password reset block future
 * logins, but their current session cookie would otherwise stay valid
 * until it naturally expires.
 */
export async function deactivateOwnDriverAccount() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const result = await deactivateDriverAndFreeEmail(user!.id);
  if (result.error) {
    redirect(`/account?error=${encodeURIComponent(result.error)}`);
  }

  await supabase.auth.signOut();
  redirect("/login");
}
