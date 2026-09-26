"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createAnonClient } from "@/lib/supabase/anon";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { randomBytes } from "crypto";
import { driverHasHistory } from "./history";

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
 *
 * The reset email itself is sent through createAnonClient(), not the
 * cookie-bound `supabase` client used for the caller check above. That
 * client is built with @supabase/ssr, which forces PKCE — fine for a
 * self-service "forgot password" request made and redeemed in the same
 * browser, but this call is an admin triggering a reset link that a
 * DIFFERENT person will open on a DIFFERENT device. PKCE's verifier would
 * only ever exist in the admin's own cookies, so that link could never be
 * redeemed — see anon.ts for the full explanation. This was breaking
 * every admin-resent invite and every driver reactivation link 100% of
 * the time, regardless of email provider or spam placement.
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
  await createAnonClient().auth.resetPasswordForEmail(email, { redirectTo: `${siteUrl}/reset-password` });

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
 * Deactivating a driver with NO trip/booking/incident/check/fuel history
 * now removes them completely — the profiles row, and the auth login,
 * gone outright, rather than left behind as an "Inactive" placeholder
 * forever. That's the common case (someone added by mistake, or who
 * never actually drove), and there's nothing worth keeping a record of.
 *
 * A driver WITH any history can't go this route — the database itself
 * won't allow deleting a profiles row that other tables still reference
 * (see history.ts), and it shouldn't: that history is real records other
 * people relied on. For that case this falls back to the original
 * behaviour: block their login and free their real email address so a
 * fresh invite can go out to it right away, leaving the `profiles` row
 * and everything tied to it exactly as it is. That's also the fallback
 * if the delete attempt fails for any other reason — this never leaves
 * an account in a broken half-state.
 *
 * Deliberately driver-only: an admin's own login isn't touched by this —
 * they keep the plain reversible Deactivate/Reactivate toggle above,
 * since losing admin access by accident is a much bigger deal than a
 * driver needing a fresh invite.
 */
export async function deactivateDriverAndFreeEmail(
  userId: string
): Promise<{ error: string | null; deleted?: boolean }> {
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

  const hasHistory = await driverHasHistory(adminClient, userId);
  if (!hasHistory) {
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId);
    if (!deleteError) {
      // profiles.id -> auth.users(id) on delete cascade, so the profile
      // row is already gone too — nothing left to update.
      revalidatePath("/admin/people");
      revalidatePath("/account");
      return { error: null, deleted: true };
    }
    // Fall through to the placeholder flow below rather than surface a
    // dead end — e.g. a table was missed in history.ts, or some other
    // FK this session doesn't know about. Deactivating still succeeds.
  }

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

  return { error: null, deleted: false };
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
    `/admin/people?role=driver&success=${encodeURIComponent(
      result.deleted
        ? "Driver removed — they had no trip history, so nothing was left behind."
        : "Driver deactivated. Their email is free to invite again."
    )}`
  );
}

/**
 * Frees a deactivated driver's real email address for good, and clears
 * their name — everything personally identifying about them, at every
 * level: the auth login (so the email can be invited again), and
 * `profiles.email`/`profiles.name` (used for display and exports, so
 * neither the real address nor their real name is left sitting in the
 * database). Every trip, booking, check and fuel log they're attached to
 * stays exactly as it is — this only touches the two fields that
 * identify the person, not anything they did.
 *
 * Does the full auth swap itself rather than assuming
 * deactivateDriverAndFreeEmail already did it — a driver deactivated the
 * OLD way (toggleUserActive alone, before email-freeing existed) still
 * has their real address live on their auth user, not a placeholder, so
 * skipping this step would be a no-op there: re-inviting them would still
 * fail with "a user with this email already exists." Running the real
 * swap here, unconditionally, fixes both cases the same way and makes
 * Remove safe to click regardless of how a driver was deactivated.
 * Deliberately a separate, explicit step from Deactivate — driver-only,
 * and only meaningful once a driver is already deactivated.
 */
export async function removeDriverPersonalInfo(userId: string): Promise<{ error: string | null }> {
  const authCheck = await requireSelfOrOwnOrgDriver(userId);
  if (authCheck.error) {
    return authCheck;
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return {
      error:
        "The service role key isn't set up yet, so this driver's details can't be removed. Add SUPABASE_SERVICE_ROLE_KEY to your environment (see README), then try again.",
    };
  }

  const adminClient = createAdminClient();

  // Keyed on the user's own id, so it can never collide with another
  // placeholder — same pattern as deactivateDriverAndFreeEmail, just its
  // own prefix so the two are distinguishable if it ever matters.
  const placeholderEmail = `removed-${userId}@fleet-tracker.invalid`;
  const randomPassword = randomBytes(24).toString("hex");

  const { error: authError } = await adminClient.auth.admin.updateUserById(userId, {
    email: placeholderEmail,
    password: randomPassword,
    email_confirm: true,
    ban_duration: "87600h",
  });

  if (authError) {
    return { error: "Something went wrong removing this driver's details. Please try again." };
  }

  await adminClient.from("profiles").update({ email: placeholderEmail, name: "Removed Driver" }).eq("id", userId);

  revalidatePath("/admin/people");

  return { error: null };
}

/**
 * Wraps removeDriverPersonalInfo for the admin People list — a plain form
 * action (bound to a specific driver id), matching the
 * deactivateDriverFromAdmin pattern above.
 */
export async function removeDriverPersonalInfoFromAdmin(userId: string) {
  const result = await removeDriverPersonalInfo(userId);
  if (result.error) {
    redirect(`/admin/people?role=driver&error=${encodeURIComponent(result.error)}`);
  }
  redirect(
    `/admin/people?role=driver&success=${encodeURIComponent("Personal details removed. The email address is free to invite again any time from Add Driver.")}`
  );
}

/**
 * Hard-deletes an already-deactivated driver outright — the profiles row
 * and the auth login, gone completely, no "Inactive" placeholder left
 * behind. For drivers deactivated before deactivateDriverAndFreeEmail
 * started doing this automatically (see there), or any other case where
 * one is somehow still sitting inactive with no history attached.
 *
 * Admin-only (not self-service — a driver deactivating their own account
 * goes through deactivateOwnDriverAccount, which already deletes outright
 * when there's no history) and only for a driver already inactive, as a
 * safety rail against accidentally deleting someone still in use.
 */
export async function deletePermanentlyFromAdmin(userId: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: callerProfile } = await supabase
    .from("profiles")
    .select("role, organisation_id")
    .eq("id", user!.id)
    .single();

  if (callerProfile?.role !== "admin") {
    redirect(`/admin/people?role=driver&error=${encodeURIComponent("You're not authorised to do that.")}`);
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    redirect(
      `/admin/people?role=driver&error=${encodeURIComponent(
        "The service role key isn't set up yet, so this driver can't be deleted. Add SUPABASE_SERVICE_ROLE_KEY to your environment (see README), then try again."
      )}`
    );
  }

  const adminClient = createAdminClient();

  const { data: targetProfile } = await adminClient
    .from("profiles")
    .select("role, active, organisation_id")
    .eq("id", userId)
    .single();

  if (
    !targetProfile ||
    targetProfile.role !== "driver" ||
    targetProfile.organisation_id !== callerProfile.organisation_id
  ) {
    redirect(`/admin/people?role=driver&error=${encodeURIComponent("You're not authorised to do that.")}`);
  }

  if (targetProfile!.active) {
    redirect(
      `/admin/people?role=driver&error=${encodeURIComponent("Deactivate this driver before deleting them.")}`
    );
  }

  const hasHistory = await driverHasHistory(adminClient, userId);
  if (hasHistory) {
    redirect(
      `/admin/people?role=driver&error=${encodeURIComponent(
        "This driver has trip, booking, check or fuel history and can't be permanently deleted."
      )}`
    );
  }

  const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId);
  if (deleteError) {
    redirect(
      `/admin/people?role=driver&error=${encodeURIComponent("Something went wrong deleting this driver. Please try again.")}`
    );
  }

  revalidatePath("/admin/people");
  redirect(`/admin/people?role=driver&success=${encodeURIComponent("Driver permanently deleted.")}`);
}

/**
 * Deletes an already-deactivated driver AND every record attached to them
 * (trips, bookings, recurring series, vehicle checks, fuel logs, incident
 * reports, notifications, audit entries), then the login itself. The
 * driver-side equivalent of deleteVehicleAndRecords, for the case
 * deletePermanentlyFromAdmin refuses: an inactive driver whose history
 * blocks a plain delete (typically a test account).
 *
 * Admin-only, same-org only, inactive-only, and refuses while the driver
 * has an active trip. References to this driver on OTHER people's rows
 * (booking approver/creator, licence updated_by, incident created_by, a
 * booking linked to one of their trips) are cleared to null rather than
 * deleting those rows. Stops at the first failed step.
 */
export async function deleteDriverAndRecordsFromAdmin(userId: string) {
  const fail = (msg: string) => redirect(`/admin/people?role=driver&error=${encodeURIComponent(msg)}`);

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: callerProfile } = await supabase
    .from("profiles")
    .select("role, organisation_id")
    .eq("id", user!.id)
    .single();
  if (callerProfile?.role !== "admin") fail("You're not authorised to do that.");

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    fail("The service role key isn't set up yet, so this driver can't be deleted. Add SUPABASE_SERVICE_ROLE_KEY to your environment (see README), then try again.");
  }

  const adminClient = createAdminClient();

  const { data: targetProfile } = await adminClient
    .from("profiles")
    .select("role, active, organisation_id")
    .eq("id", userId)
    .single();
  if (!targetProfile || targetProfile.role !== "driver" || targetProfile.organisation_id !== callerProfile!.organisation_id) {
    fail("You're not authorised to do that.");
  }
  if (targetProfile!.active) fail("Deactivate this driver before deleting them.");

  const { data: activeTrip } = await adminClient
    .from("vehicle_usage")
    .select("id")
    .eq("driver_id", userId)
    .eq("status", "active")
    .maybeSingle();
  if (activeTrip) fail("This driver has a vehicle checked out right now. It needs to be checked back in first.");

  const { data: trips } = await adminClient.from("vehicle_usage").select("id").eq("driver_id", userId);
  const tripIds = (trips ?? []).map((t: { id: string }) => t.id);
  const { data: checks } = await adminClient.from("vehicle_checks").select("id").eq("driver_id", userId);
  const checkIds = (checks ?? []).map((c: { id: string }) => c.id);
  let checkItemIds: string[] = [];
  if (checkIds.length > 0) {
    const { data: items } = await adminClient.from("vehicle_check_items").select("id").in("check_id", checkIds);
    checkItemIds = (items ?? []).map((i: { id: string }) => i.id);
  }

  type Step = { label: string; run: () => PromiseLike<{ error: { message: string } | null }> };
  const steps: Step[] = [
    // Detach references on rows that aren't this driver's own.
    { label: "booking approver links", run: () => adminClient.from("bookings").update({ approving_admin_id: null }).eq("approving_admin_id", userId) },
    { label: "booking decision links", run: () => adminClient.from("bookings").update({ decided_by: null }).eq("decided_by", userId) },
    { label: "booking creator links", run: () => adminClient.from("bookings").update({ created_by: null }).eq("created_by", userId) },
    { label: "licence update links", run: () => adminClient.from("driver_licences").update({ updated_by: null }).eq("updated_by", userId) },
    { label: "incident creator links", run: () => adminClient.from("incident_reports").update({ created_by: null }).eq("created_by", userId) },
    ...(checkItemIds.length > 0
      ? [{ label: "incident links to vehicle checks", run: () => adminClient.from("incident_reports").update({ source_vehicle_check_item_id: null }).in("source_vehicle_check_item_id", checkItemIds) }]
      : []),
    ...(tripIds.length > 0
      ? [{ label: "booking links to trips", run: () => adminClient.from("bookings").update({ linked_trip_id: null }).in("linked_trip_id", tripIds) }]
      : []),
    // Then the driver's own records, children before parents.
    { label: "incident reports", run: () => adminClient.from("incident_reports").delete().eq("driver_id", userId) },
    { label: "fuel logs", run: () => adminClient.from("fuel_logs").delete().eq("driver_id", userId) },
    { label: "vehicle checks", run: () => adminClient.from("vehicle_checks").delete().eq("driver_id", userId) },
    { label: "bookings", run: () => adminClient.from("bookings").delete().eq("driver_id", userId) },
    { label: "recurring booking series", run: () => adminClient.from("booking_series").delete().eq("driver_id", userId) },
    { label: "trip history", run: () => adminClient.from("vehicle_usage").delete().eq("driver_id", userId) },
    { label: "notifications", run: () => adminClient.from("notifications").delete().eq("recipient_id", userId) },
    { label: "audit entries", run: () => adminClient.from("audit_log").delete().eq("user_id", userId) },
  ];

  for (const step of steps) {
    const { error } = await step.run();
    if (error) fail(`Something went wrong deleting this driver's ${step.label} (nothing further was deleted): ${error.message}`);
  }

  const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId);
  if (deleteError) fail("Every record for this driver was deleted, but removing the login itself failed. Please try again.");

  revalidatePath("/admin/people");
  redirect(`/admin/people?role=driver&success=${encodeURIComponent("Driver and all their records deleted.")}`);
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
