import { createClient } from "@/lib/supabase/server";

export default async function AdminAuditPage() {
  const supabase = createClient();
  const { data: entries } = await supabase
    .from("audit_log")
    .select("*, user:profiles(name)")
    .order("timestamp", { ascending: false })
    .limit(200);

  return (
    <div>
      <h1 className="mb-4 font-display text-xl font-bold text-ink">Audit Log</h1>
      <div className="space-y-2">
        {(!entries || entries.length === 0) && <p className="text-sm text-steel">No corrections logged yet.</p>}
        {entries?.map((e) => (
          <div key={e.id} className="rounded-xl border border-steel/20 bg-white p-3 text-sm">
            <div className="flex items-center justify-between">
              <p className="font-medium text-ink">{e.action.replace(/_/g, " ")}</p>
              <span className="text-xs text-steel">
                {new Date(e.timestamp).toLocaleString("en-NZ", { timeZone: "Pacific/Auckland", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}
              </span>
            </div>
            <p className="mt-1 text-xs text-steel">
              By {e.user?.name} · {e.record_type} #{e.record_id.slice(0, 8)}
            </p>
            <div className="mt-1 grid grid-cols-2 gap-2 text-xs">
              <div>
                <p className="text-steel">Before</p>
                <pre className="whitespace-pre-wrap text-ink">{JSON.stringify(e.old_value)}</pre>
              </div>
              <div>
                <p className="text-steel">After</p>
                <pre className="whitespace-pre-wrap text-ink">{JSON.stringify(e.new_value)}</pre>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
