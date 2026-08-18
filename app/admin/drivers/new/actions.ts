"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

type ActionState = { error: string | null };

export async function createUser(role: "driver" | "admin", prevState: ActionState, formData: FormData): Promise<ActionState> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return {
      error:
        "The service role key isn't set up yet. Add SUPABASE_SERVICE_ROLE_KEY to .env.local (see README), then restart the server.",
    };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: callerProfile } = await supabase.from("profiles").select("role").eq("id", user!.id).single();
  if (callerProfile?.role !== "admin") {
    return { error: "Only admins can add users." };
  }

  const name = (formData.get("name") as string)?.trim();
  const email = (formData.get("email") as string)?.trim();

  if (!name || !email) {
    return { error: "Name and email are both required." };
  }

  const adminClient = createAdminClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

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
  });

  if (profileError) {
    return { error: "The invite was sent, but creating the profile failed. Please contact support." };
  }

  revalidatePath("/admin/drivers");
  revalidatePath("/admin/admins");
  redirect(role === "admin" ? "/admin/admins?success=Invite sent" : "/admin/drivers?success=Invite sent");
}

export async function createDriver(prevState: ActionState, formData: FormData): Promise<ActionState> {
  return createUser("driver", prevState, formData);
}

export async function createAdmin(prevState: ActionState, formData: FormData): Promise<ActionState> {
  return createUser("admin", prevState, formData);
}
