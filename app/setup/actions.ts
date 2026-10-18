"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

type ActionState = { error: string | null; redirectTo?: string };

/**
 * Where a brand-new organisation admin goes once setup succeeds: the Admin
 * Guide (benefits, getting started, install steps, a way to sign in).
 * NEXT_PUBLIC_GUIDE_URL lets the guide live on its own domain (e.g.
 * https://guide.example.com); unset, it is the /guide pages on this app.
 */
function adminGuideUrl() {
  const base = (process.env.NEXT_PUBLIC_GUIDE_URL || "/guide").replace(/\/+$/, "");
  return `${base}/admin?setup=success`;
}

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
    // Undo both halves so the same email and org name can simply be tried
    // again, instead of leaving a login with no profile behind.
    await adminClient.auth.admin.deleteUser(created.user.id);
    await adminClient.from("organisations").delete().eq("id", org.id);
    return {
      error: "Something went wrong setting up the admin account. Nothing was saved, so please try again.",
    };
  }

  // Straight to the Admin Guide (benefits + install steps + a way to sign
  // in) rather than the bare login page: the new admin hasn't installed
  // the app or seen what it does yet, so a login form alone is a dead end.
  //
  // Returned to the form, which does a full-page navigation, instead of
  // redirect(): the guide pages are plain route handlers (static HTML, not
  // React pages), and a Server Action redirect() tries a client-side
  // router transition into them, which doesn't reliably land. A full-page
  // load always does, and also works if the guide is on another domain.
  revalidatePath("/", "layout");
  return { error: null, redirectTo: adminGuideUrl() };
}
