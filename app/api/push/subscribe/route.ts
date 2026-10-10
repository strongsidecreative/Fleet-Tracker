import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const sub = await req.json();
  const endpoint = sub?.endpoint as string | undefined;
  const p256dh = sub?.keys?.p256dh as string | undefined;
  const auth = sub?.keys?.auth as string | undefined;

  if (!endpoint || !p256dh || !auth) {
    return NextResponse.json({ error: "Malformed subscription" }, { status: 400 });
  }

  const { data: me } = await supabase.from("profiles").select("organisation_id").eq("id", user.id).single();
  if (!me?.organisation_id) return NextResponse.json({ error: "No organisation" }, { status: 400 });

  // A phone's push endpoint is unique per browser, not per person. On a
  // shared phone (one driver signs out, another signs in) the row still
  // belongs to the previous person, and RLS stopped this upsert from taking
  // it over, so the new person never got notifications. Hand the endpoint
  // to whoever just turned notifications on, server-side.
  const admin = createAdminClient();
  await admin.from("push_subscriptions").delete().eq("endpoint", endpoint).neq("user_id", user.id);
  const { error } = await admin
    .from("push_subscriptions")
    .upsert(
      { user_id: user.id, endpoint, p256dh, auth, organisation_id: me.organisation_id },
      { onConflict: "endpoint" }
    );

  if (error) return NextResponse.json({ error: "Couldn't save this device for notifications." }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { endpoint } = await req.json();
  if (!endpoint) return NextResponse.json({ error: "Missing endpoint" }, { status: 400 });

  // RLS also scopes this to the caller's own rows — user_id filter here is
  // just belt-and-braces / avoids relying solely on RLS for the intent.
  await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint).eq("user_id", user.id);
  return NextResponse.json({ ok: true });
}
