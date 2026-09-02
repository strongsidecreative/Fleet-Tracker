import { createClient } from "@/lib/supabase/server";
import LogoutButton from "./LogoutButton";
import { licenceSeverity, LICENCE_LABEL, LICENCE_BADGE_CLASS } from "@/lib/licenceStatus";
import PushSubscribeButton from "@/components/PushSubscribeButton";
import { RestartTourButton } from "@/components/tour/TourLauncher";
import { driverTourSteps } from "@/components/tour/tourSteps";
import { deactivateOwnDriverAccount } from "@/app/admin/users/actions";
import ConfirmSubmitButton from "@/components/ConfirmSubmitButton";
import ErrorBanner from "@/components/ErrorBanner";
import Link from "next/link";
import { getViewerFeatures } from "@/lib/orgFeatures.server";

export default async function AccountPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: profile }, { data: licence }, features] = await Promise.all([
    supabase.from("profiles").select("name, email, role").eq("id", user!.id).single(),
    supabase.from("driver_licences").select("*").eq("driver_id", user!.id).maybeSingle(),
    getViewerFeatures(supabase, user!.id),
  ]);

  return (
    <div className="space-y-4">
      <h1 className="mb-1 font-display text-xl font-bold text-ink">Account</h1>

      <ErrorBanner />

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

      {features.fuel_tracking && (
        <Link
          href="/fuel"
          className="flex items-center justify-between rounded-xl border border-steel/20 bg-white p-4"
        >
          <span className="text-sm font-bold text-ink">My Fuel Log</span>
          <span className="text-xs font-medium text-brand underline">View →</span>
        </Link>
      )}

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

      {/* Self-service deactivation — driver-only. An admin viewing this
          same page in driver mode doesn't get this button; their account
          is managed from the Admin People list instead, where deactivating
          an admin stays a plain reversible toggle. This one is one-way:
          it frees the email for a fresh invite, which the database can't
          cleanly undo, and signs the driver straight out. */}
      {profile?.role === "driver" && (
        <div className="rounded-xl border border-rust/30 bg-white p-4">
          <p className="mb-1 text-sm font-bold text-ink">Deactivate Account</p>
          <p className="mb-3 text-xs text-steel">
            You'll be logged out and won't be able to log back in. Your trip, booking, and incident history is kept.
            This can't be undone.
          </p>
          <form action={deactivateOwnDriverAccount}>
            <ConfirmSubmitButton
              confirmMessage="Deactivate your account? You'll be logged out and this can't be undone."
              className="rounded-lg border border-rust px-4 py-2 text-sm font-semibold text-rust"
            >
              Deactivate Account
            </ConfirmSubmitButton>
          </form>
        </div>
      )}
    </div>
  );
}
