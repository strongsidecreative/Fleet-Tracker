import { createClient } from "@/lib/supabase/server";
import LogoutButton from "./LogoutButton";
import { licenceSeverity, LICENCE_LABEL, LICENCE_BADGE_CLASS } from "@/lib/licenceStatus";
import PushSubscribeButton from "@/components/PushSubscribeButton";
import { RestartTourButton } from "@/components/tour/TourLauncher";
import { driverTourSteps } from "@/components/tour/tourSteps";

export default async function AccountPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: profile }, { data: licence }] = await Promise.all([
    supabase.from("profiles").select("name, email, role").eq("id", user!.id).single(),
    supabase.from("driver_licences").select("*").eq("driver_id", user!.id).maybeSingle(),
  ]);

  return (
    <div className="space-y-4">
      <h1 className="mb-1 font-display text-xl font-bold text-ink">Account</h1>

      <RestartTourButton steps={driverTourSteps} storageKeyPrefix="ft_tour_driver" />

      <div className="space-y-3 rounded-xl border border-steel/20 bg-white p-4">
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

      <PushSubscribeButton />

      <div>
        <p className="mb-2 text-sm font-bold text-ink">Driver Licence</p>
        <div className="rounded-xl border border-steel/20 bg-white p-4">
          {licence ? (
            <>
              <div className="mb-3">
                <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${LICENCE_BADGE_CLASS[licenceSeverity(licence.expiry_date)]}`}>
                  {LICENCE_LABEL[licenceSeverity(licence.expiry_date)].toUpperCase()}
                </span>
              </div>
              <div className="space-y-2 text-sm">
                <div>
                  <p className="text-xs text-steel">Licence Number</p>
                  <p className="font-medium text-ink">{licence.licence_number}</p>
                </div>
                <div>
                  <p className="text-xs text-steel">Version</p>
                  <p className="font-medium text-ink">{licence.version_number || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-steel">Class</p>
                  <p className="font-medium text-ink">{licence.licence_class || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-steel">Expiry</p>
                  <p className="font-medium text-ink">
                    {new Date(licence.expiry_date).toLocaleDateString("en-NZ", { timeZone: "Pacific/Auckland", day: "numeric", month: "long", year: "numeric" })}
                  </p>
                </div>
              </div>
              <p className="mt-3 text-xs text-steel">Contact an admin if any of these details need updating.</p>
            </>
          ) : (
            <p className="text-sm text-steel">No licence details on file. Contact an admin to have these added.</p>
          )}
        </div>
      </div>
    </div>
  );
}
