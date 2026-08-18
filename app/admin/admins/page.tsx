import { createClient } from "@/lib/supabase/server";
import { toggleUserActive } from "../users/actions";
import ConfirmSubmitButton from "@/components/ConfirmSubmitButton";
import SuccessBanner from "@/components/SuccessBanner";

export default async function AdminAdminsPage() {
  const supabase = createClient();
  const { data: admins } = await supabase.from("profiles").select("*").eq("role", "admin").order("name");

  return (
    <div>
      <SuccessBanner />
      <div className="mb-4 flex items-center justify-between">
        <h1 className="font-display text-xl font-bold text-ink">Admins</h1>
        <a href="/admin/admins/new" className="rounded-lg bg-ink px-3 py-2 text-xs font-semibold text-paper">
          Add Admin
        </a>
      </div>
      <div className="space-y-2">
        {admins?.map((a) => (
          <div key={a.id} className="flex items-center justify-between rounded-xl border border-steel/20 bg-white p-3">
            <div>
              <p className="font-medium text-ink">
                {a.name} {!a.active && <span className="text-xs text-steel">(inactive)</span>}
              </p>
              <p className="text-xs text-steel">{a.email}</p>
            </div>
            <form action={toggleUserActive.bind(null, a.id, !a.active)}>
              <ConfirmSubmitButton
                confirmMessage={
                  a.active
                    ? `Deactivate ${a.name}? They won't be able to log in until reactivated.`
                    : `Reactivate ${a.name}?`
                }
                className="text-xs font-medium text-steel underline"
              >
                {a.active ? "Deactivate" : "Reactivate"}
              </ConfirmSubmitButton>
            </form>
          </div>
        ))}
        {(!admins || admins.length === 0) && (
          <p className="rounded-xl border border-steel/20 bg-white p-4 text-sm text-steel">No admins yet.</p>
        )}
      </div>
      <p className="mt-3 text-xs text-steel">
        Deactivating yourself will lock you out — make sure at least one other admin can log in first.
      </p>
    </div>
  );
}
