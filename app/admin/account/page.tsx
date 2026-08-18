import { createClient } from "@/lib/supabase/server";
import LogoutButton from "../../(driver)/account/LogoutButton";
import PushSubscribeButton from "@/components/PushSubscribeButton";

export default async function AdminAccountPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("name, email, role")
    .eq("id", user!.id)
    .single();

  return (
    <div>
      <h1 className="mb-4 font-display text-xl font-bold text-ink">Account</h1>
      <div className="max-w-sm space-y-3 rounded-xl border border-steel/20 bg-white p-4">
        <div>
          <p className="text-xs text-steel">Name</p>
          <p className="font-medium text-ink">{profile?.name}</p>
        </div>
        <div>
          <p className="text-xs text-steel">Email</p>
          <p className="font-medium text-ink">{profile?.email}</p>
        </div>
        <div>
          <p className="text-xs text-steel">Role</p>
          <p className="font-medium capitalize text-ink">{profile?.role}</p>
        </div>
        <LogoutButton />
      </div>

      <div className="mt-4 max-w-sm">
        <PushSubscribeButton />
      </div>
    </div>
  );
}
