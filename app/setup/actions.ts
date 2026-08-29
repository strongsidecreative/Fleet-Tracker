"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";

type ActionState = { error: string | null };

/**
 * Creates a brand new organisation and its first admin account. Unlike the
 * original single-tenant version of this page, /setup is now reusable —
 * every visit creates a fresh organisation, so there's no "already
 * complete" lock to check on page load any more.
 *
 * Optionally gated by SETUP_TOKEN: if that env var is set, the link must
 * be visited as /setup?token=<value> or submission is refused — set it
 * (and share /setup?token=<value> instead of the bare link) any time this
 * needs to be more than "private because nobody else has the URL". Unset,
 * this behaves exactly as before: safety rests entirely on the link being
 * sent privately to each new client rather than published anywhere.
 */
export async function setupOrganisation(prevState: ActionState, formData: FormData): Promise<ActionState> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return {
      error:
        "The service role key isn't set up yet. Add SUPABASE_SERVICE_ROLE_KEY to .env.local (see README), then restart the server.",
    };
  }

  if (process.env.SETUP_TOKEN) {
    const token = (formData.get("token") as string) ?? "";
    if (token !== process.env.SETUP_TOKEN) {
      return { error: "This setup link is invalid or has expired. Check the link with whoever sent it to you." };
    }
  }

  const organisationName = (formData.get("organisationName") as string)?.trim();
  const name = (formData.get("name") as string)?.trim();
  const email = (formData.get("email") as string)?.trim();
  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  if (!organisationName || !name || !email || !password) {
    return { error: "Organisation name, your name, email, and password are all required." };
  }
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }
  if (password !== confirmPassword) {
    return { error: "Passwords don't match." };
  }

  const adminClient = createAdminClient();

  const { data: org, error: orgError } = await adminClient
    .from("organisations")
    .insert({ name: organisationName })
    .select("id")
    .single();

  if (orgError || !org) {
    return { error: "Something went wrong creating the organisation. Please try again." };
  }

  const { data: created, error: createError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (createError || !created?.user) {
    // Roll back the organisation we just created so a failed signup
    // doesn't leave an empty, orphaned organisation behind.
    await adminClient.from("organisations").delete().eq("id", org.id);

    if (createError?.message?.toLowerCase().includes("already")) {
      return { error: "An account with this email already exists. Try logging in instead." };
    }
    return { error: "Something went wrong creating the account. Please try again." };
  }

  const { error: profileError } = await adminClient.from("profiles").insert({
    id: created.user.id,
    name,
    email,
    role: "admin",
    active: true,
    organisation_id: org.id,
  });

  if (profileError) {
    return {
      error: "The account was created, but setting up the admin profile failed. Please contact support.",
    };
  }

  // Straight to the Admin Guide (benefits + install steps + a way to sign
  // in) rather than the bare login page — the new admin hasn't installed
  // the app or seen what it does yet, so dropping them at a login form
  // with nothing else is a dead end.
  redirect("/guide/admin?setup=success");
}
