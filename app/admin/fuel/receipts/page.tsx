import { createClient } from "@/lib/supabase/server";
import { getMyProfile } from "@/lib/supabase/current";
import BackButton from "@/components/BackButton";
import ReceiptMonthActions from "./ReceiptMonthActions";
import { addMonths, currentMonthKey, monthKeyOf, monthLabel, monthRangeIso } from "@/lib/receiptMonths";
import { fmtDate } from "@/lib/nz-time";
import { isEmailConfigured } from "@/lib/email";

type ExportRow = {
  month: string;
  exported_at: string | null;
  exported_via: "download" | "email" | null;
  images_purged_at: string | null;
};

export default async function MonthlyReceiptsPage() {
  const supabase = createClient();
  const profile = await getMyProfile();
  const orgId = profile?.organisation_id ?? "";

  const thisMonth = currentMonthKey();
  const oldest = addMonths(thisMonth, -23);

  const [{ data: logs }, { data: exports }, { data: org }] = await Promise.all([
    supabase
      .from("fuel_logs")
      .select("created_at, cost, receipt_photo_url, receipt_purged_at")
      .gte("created_at", monthRangeIso(oldest).fromIso),
    supabase.from("receipt_exports").select("month, exported_at, exported_via, images_purged_at"),
    supabase.from("organisations").select("receipt_delivery, receipt_retention_months").eq("id", orgId).single(),
  ]);

  const byMonth = new Map<string, { logs: number; photos: number; cleared: number; cost: number }>();
  for (const l of logs ?? []) {
    const key = monthKeyOf(l.created_at);
    const m = byMonth.get(key) ?? { logs: 0, photos: 0, cleared: 0, cost: 0 };
    m.logs++;
    m.cost += l.cost;
    if (l.receipt_photo_url) m.photos++;
    if (l.receipt_purged_at) m.cleared++;
    byMonth.set(key, m);
  }
  const exportByMonth = new Map((exports as ExportRow[] | null ?? []).map((e) => [e.month, e]));

  const months = Array.from(new Set([thisMonth, ...Array.from(byMonth.keys())]))
    .filter((k) => k >= oldest)
    .sort()
    .reverse();

  const retention = org?.receipt_retention_months ?? 3;
  const canEmail = isEmailConfigured();

  return (
    <div>
      <BackButton label="Back to Fuel" />
      <h1 className="mb-1 mt-2 font-display text-xl font-bold text-ink">Monthly Receipts</h1>
      <p className="mb-4 text-xs text-steel">
        Download each month&apos;s fuel receipts as a ZIP (photos plus a spreadsheet of every fill-up) and keep it with
        your records.{" "}
        {retention > 0
          ? `Photos are cleared from Fleet Tracker ${retention} month${retention === 1 ? "" : "s"} after a month has been downloaded or emailed; months you haven't saved are never cleared.`
          : "Photos are never cleared automatically."}{" "}
        Change this in Account.
      </p>

      <div className="space-y-3">
        {months.map((key) => {
          const m = byMonth.get(key) ?? { logs: 0, photos: 0, cleared: 0, cost: 0 };
          const e = exportByMonth.get(key);
          const inProgress = key === thisMonth;
          let status: { text: string; tone: string };
          if (inProgress) status = { text: "This month (still filling up)", tone: "text-steel" };
          else if (e?.images_purged_at) status = { text: `Saved, photos cleared ${fmtDate(e.images_purged_at)}`, tone: "text-steel" };
          else if (e?.exported_at)
            status = {
              text: `${e.exported_via === "email" ? "Emailed" : "Downloaded"} ${fmtDate(e.exported_at)}${
                retention > 0 ? `, photos clear after ${monthLabel(addMonths(key, retention + 1))} starts` : ""
              }`,
              tone: "text-track",
            };
          else if (m.logs > 0) status = { text: "Not saved yet", tone: "text-amber" };
          else status = { text: "No fuel logged", tone: "text-steel" };

          return (
            <div key={key} className="rounded-xl border border-steel/20 bg-white p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-ink">{monthLabel(key)}</p>
                  <p className="text-xs text-steel">
                    {m.logs} fill-up{m.logs === 1 ? "" : "s"} · {m.photos} photo{m.photos === 1 ? "" : "s"} ·{" "}
                    {m.cost.toLocaleString("en-NZ", { style: "currency", currency: "NZD" })}
                  </p>
                </div>
                <p className={`text-right text-xs font-semibold ${status.tone}`}>{status.text}</p>
              </div>
              <ReceiptMonthActions monthKey={key} canEmail={canEmail} hasLogs={m.logs > 0} />
            </div>
          );
        })}
      </div>

      {!canEmail && (
        <p className="mt-4 text-xs text-steel">Email delivery isn&apos;t switched on for Fleet Tracker yet, so Download is the way to save receipts for now.</p>
      )}
    </div>
  );
}
