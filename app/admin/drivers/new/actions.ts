"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient, type AdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

type ActionState = { error: string | null };

/**
 * Shared by both the single-add and bulk-add flows. organisationId is the
 * CALLING admin's own organisation — set explicitly here rather than left
 * for a database trigger to fill in, because this insert goes through the
 * service-role client (to create the invited auth user first), which has
 * no logged-in session of its own for a trigger to read.
 */
async function inviteAndCreateProfile(
  adminClient: AdminClient,
  role: "driver" | "admin",
  name: string,
  email: string,
  siteUrl: string,
  organisationId: string
): Promise<{ error: string | null }> {
  const { data: invited, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${siteUrl}/reset-password`,
  });

  if (inviteError || !invited?.user) {
    if (inviteError?.message?.toLowerCase().includes("already")) {
      return { error: "A user with this email already exists." };
    }
    return { error: "Something went wrong sending the invite. Please try again." };
  }

  const { error: profileError } = await adminClient.from("profiles").insert({
    id: invited.user.id,
    name,
    email,
    role,
    active: true,
    organisation_id: organisationId,
  });

  if (profileError) {
    return { error: "The invite was sent, but creating the profile failed. Please contact support." };
  }

  return { error: null };
}

type CallerCheck = { error: string | null; organisationId: string | null };

/**
 * Confirms the caller is a logged-in admin, and returns their organisation
 * so every user they invite lands in that same organisation rather than
 * some other one.
 */
async function requireAdminCaller(): Promise<CallerCheck> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: callerProfile } = await supabase
    .from("profiles")
    .select("role, organisation_id")
    .eq("id", user!.id)
    .single();

  if (callerProfile?.role !== "admin") {
    return { error: "Only admins can add users.", organisationId: null };
  }
  return { error: null, organisationId: callerProfile.organisation_id };
}

export async function createUser(role: "driver" | "admin", prevState: ActionState, formData: FormData): Promise<ActionState> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return {
      error:
        "The service role key isn't set up yet. Add SUPABASE_SERVICE_ROLE_KEY to .env.local (see README), then restart the server.",
    };
  }

  const caller = await requireAdminCaller();
  if (caller.error || !caller.organisationId) {
    return { error: caller.error ?? "Could not determine your organisation." };
  }

  const name = (formData.get("name") as string)?.trim();
  const email = (formData.get("email") as string)?.trim();

  if (!name || !email) {
    return { error: "Name and email are both required." };
  }

  const adminClient = createAdminClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  const { error } = await inviteAndCreateProfile(adminClient, role, name, email, siteUrl, caller.organisationId);
  if (error) {
    return { error };
  }

  revalidatePath("/admin/people");
  redirect(`/admin/people?role=${role}&success=Invite sent`);
}

export async function createDriver(prevState: ActionState, formData: FormData): Promise<ActionState> {
  return createUser("driver", prevState, formData);
}

export async function createAdmin(prevState: ActionState, formData: FormData): Promise<ActionState> {
  return createUser("admin", prevState, formData);
}

// ============================================================
// Bulk driver add — one form, "+ Add Another Driver" rows.
// ============================================================

export type BulkRowResult = { rowId: string; error: string | null };
export type BulkActionState = { results: BulkRowResult[]; formError?: string | null };

const EMPTY_BULK_STATE: BulkActionState = { results: [], formError: null };

/**
 * Rows are submitted as `driver-<rowId>-name` / `driver-<rowId>-email` pairs
 * rather than a numeric index, so removing a row in the middle on the
 * client never shifts anyone else's field names around.
 */
function parseRowIds(formData: FormData): string[] {
  const rowIds = new Set<string>();
  for (const key of formData.keys()) {
    const match = key.match(/^driver-(.+)-(name|email)$/);
    if (match) rowIds.add(match[1]);
  }
  return Array.from(rowIds);
}

export async function createDrivers(prevState: BulkActionState, formData: FormData): Promise<BulkActionState> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return {
      ...EMPTY_BULK_STATE,
      formError:
        "The service role key isn't set up yet. Add SUPABASE_SERVICE_ROLE_KEY to .env.local (see README), then restart the server.",
    };
  }

  const caller = await requireAdminCaller();
  if (caller.error || !caller.organisationId) {
    return { ...EMPTY_BULK_STATE, formError: caller.error ?? "Could not determine your organisation." };
  }
  const organisationId = caller.organisationId;

  const rowIds = parseRowIds(formData);
  if (rowIds.length === 0) {
    return { ...EMPTY_BULK_STATE, formError: "Add at least one driver." };
  }

  const adminClient = createAdminClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  const results: BulkRowResult[] = [];
  const seenEmails = new Set<string>();
  let successCount = 0;

  for (const rowId of rowIds) {
    const name = (formData.get(`driver-${rowId}-name`) as string)?.trim();
    const email = (formData.get(`driver-${rowId}-email`) as string)?.trim().toLowerCase();

    if (!name || !email) {
      results.push({ rowId, error: "Name and email are both required." });
      continue;
    }

    // Catch an accidental copy-paste across rows before it ever reaches
    // Supabase — otherwise the second row just fails with a generic
    // "already exists" that doesn't explain why.
    if (seenEmails.has(email)) {
      results.push({ rowId, error: "This email is used by another row in this form." });
      continue;
    }
    seenEmails.add(email);

    const { error } = await inviteAndCreateProfile(adminClient, "driver", name, email, siteUrl, organisationId);
    results.push({ rowId, error });
    if (!error) successCount++;
  }

  revalidatePath("/admin/people");

  const allSucceeded = successCount === rowIds.length;
  if (allSucceeded) {
    redirect(`/admin/people?role=driver&success=${successCount} invite${successCount === 1 ? "" : "s"} sent`);
  }

  // Partial or total failure: stay on the page and report per-row errors so
  // the admin only has to fix the bad rows, not retype everyone. Rows that
  // did succeed already got a real invite — the client removes those rows
  // itself so resubmitting doesn't invite them a second time.
  return {
    results,
    formError:
      successCount > 0
        ? `${successCount} invite${successCount === 1 ? "" : "s"} sent. Fix the row${
            rowIds.length - successCount === 1 ? "" : "s"
          } below and submit again for the rest.`
        : null,
  };
}
