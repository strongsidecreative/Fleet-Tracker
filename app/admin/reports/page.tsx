import Link from "next/link";
import { startOfWeekNZ, nzToday } from "@/lib/nz-time";

function iso(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default function ReportsIndexPage() {
  const thisWeekStart = startOfWeekNZ();
  const lastWeekStart = new Date(thisWeekStart);
  lastWeekStart.setUTCDate(lastWeekStart.getUTCDate() - 7);
  const lastWeekEnd = new Date(lastWeekStart);
  lastWeekEnd.setUTCDate(lastWeekStart.getUTCDate() + 6);

  const today = nzToday();
  const [ty, tm] = today.split("-").map(Number);
  const lastMonthEnd = new Date(Date.UTC(ty, tm - 1, 0));
  const lastMonthStart = new Date(Date.UTC(lastMonthEnd.getUTCFullYear(), lastMonthEnd.getUTCMonth(), 1));

  return (
    <div>
      <h1 className="mb-4 font-display text-xl font-bold text-ink">Reports</h1>
      <div className="space-y-2">
        <Link
          href={`/admin/reports/view?start=${iso(thisWeekStart)}&end=${today}&label=This Week (so far)`}
          className="block rounded-xl border border-steel/20 bg-white p-3 font-medium text-ink"
        >
          This Week (so far)
        </Link>
        <Link
          href={`/admin/reports/view?start=${iso(lastWeekStart)}&end=${iso(lastWeekEnd)}&label=Last Week`}
          className="block rounded-xl border border-steel/20 bg-white p-3 font-medium text-ink"
        >
          Last Week
        </Link>
        <Link
          href={`/admin/reports/view?start=${iso(lastMonthStart)}&end=${iso(lastMonthEnd)}&label=Last Month`}
          className="block rounded-xl border border-steel/20 bg-white p-3 font-medium text-ink"
        >
          Last Month
        </Link>
      </div>
      <p className="mt-4 text-xs text-steel">
        Weekly and monthly reports also generate automatically as notifications — see the bell icon.
      </p>
    </div>
  );
}
