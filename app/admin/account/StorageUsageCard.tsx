import { createClient } from "@/lib/supabase/server";

const FREE_PLAN_BYTES = 1024 * 1024 * 1024; // Supabase free plan: 1 GB of file storage

function mb(bytes: number): string {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Photo storage used (migration 0023's organisation_storage_usage()). Renders nothing if unavailable. */
export default async function StorageUsageCard() {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("organisation_storage_usage");
  const row = (Array.isArray(data) ? data[0] : data) as { org_bytes: number; org_files: number; total_bytes: number } | undefined;
  if (error || !row) return null;

  const orgBytes = Number(row.org_bytes);
  const totalBytes = Number(row.total_bytes);
  const pct = Math.min(100, Math.round((totalBytes / FREE_PLAN_BYTES) * 100));
  const tone = pct >= 90 ? "bg-rust" : pct >= 75 ? "bg-amber" : "bg-track";

  return (
    <div className="max-w-sm space-y-3 rounded-xl border border-steel/20 bg-white p-4">
      <p className="text-xs text-steel">Photo storage</p>
      <div>
        <p className="text-sm font-medium text-ink">
          Your organisation: {mb(orgBytes)} <span className="text-xs font-normal text-steel">({Number(row.org_files)} photos)</span>
        </p>
      </div>
      <div>
        <div className="mb-1 flex items-center justify-between text-xs text-steel">
          <span>All of Fleet Tracker</span>
          <span>
            {mb(totalBytes)} of 1 GB ({pct}%)
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-paper" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
          <div className={`h-full ${tone}`} style={{ width: `${Math.max(pct, 1)}%` }} />
        </div>
      </div>
      <p className="text-xs text-steel">
        Receipt photos are cleared automatically after they&apos;ve been saved (see Monthly fuel receipts above), which keeps
        this down.
      </p>
    </div>
  );
}
