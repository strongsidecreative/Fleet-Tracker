import { createClient } from "@/lib/supabase/server";
import LogoutButton from "../../(driver)/account/LogoutButton";
import PushSubscribeButton from "@/components/PushSubscribeButton";
import { RestartTourButton } from "@/components/tour/TourLauncher";
import { adminTourSteps } from "@/components/tour/tourSteps";
import OrganisationCard from "./OrganisationCard";

export default async function AdminAccountPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("name, email, role, organisation:organisations(name)")
    .eq("id", user!.id)
    .single();

  // Supabase's query builder types this join as an array even though the
  // FK (profiles.organisation_id -> organisations.id) makes it a single
  // row at runtime. Read it loosely rather than fighting the inferred
  // type, since there's no generated Database type in this project to
  // give postgrest-js an accurate shape to infer from in the first place.
  const organisationRaw = profile?.organisation as unknown;
  const organisationName = Array.isArray(organisationRaw)
    ? organisationRaw[0]?.name
    : (organisationRaw as { name?: string } | null | undefined)?.name;

  return (
    <div>
      <h1 className="mb-4 font-display text-xl font-bold text-ink">Account</h1>

      <div className="mb-4 max-w-sm">
        <RestartTourButton steps={adminTourSteps} storageKeyPrefix="ft_tour_admin" />
      </div>

      <div className="mb-4 max-w-sm">
        <OrganisationCard organisationName={organisationName ?? ""} />
      </div>

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
