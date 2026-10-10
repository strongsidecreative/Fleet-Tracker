import Link from "next/link";
import { startOfWeekNZDateString, addDaysToDateString, nzToday } from "@/lib/nz-time";

export default function ReportsIndexPage() {
  // Plain NZ calendar dates (YYYY-MM-DD); the view/export turn them into
  // NZ-midnight boundaries.
  const thisWeekStart = startOfWeekNZDateString();
  const lastWeekStart = addDaysToDateString(thisWeekStart, -7);
  const lastWeekEnd = addDaysToDateString(thisWeekStart, -1);

  const today = nzToday();
  const [ty, tm] = today.split("-").map(Number);
  const lastMonthEnd = new Date(Date.UTC(ty, tm - 1, 0)).toISOString().slice(0, 10);
  const lastMonthStart = `${lastMonthEnd.slice(0, 7)}-01`;

  return (
    <div>
      <h1 className="mb-4 font-display text-xl font-bold text-ink">Reports</h1>
      <div className="space-y-2">
        <Link
          href={`/admin/reports/view?start=${thisWeekStart}&end=${today}&label=This Week (so far)`}
          className="block rounded-xl border border-steel/20 bg-white p-3 font-medium text-ink"
        >
          This Week (so far)
        </Link>
        <Link
          href={`/admin/reports/view?start=${lastWeekStart}&end=${lastWeekEnd}&label=Last Week`}
          className="block rounded-xl border border-steel/20 bg-white p-3 font-medium text-ink"
        >
          Last Week
        </Link>
        <Link
          href={`/admin/reports/view?start=${lastMonthStart}&end=${lastMonthEnd}&label=Last Month`}
          className="block rounded-xl border border-steel/20 bg-white p-3 font-medium text-ink"
        >
          Last Month
        </Link>
      </div>
      <p className="mb-2 mt-5 text-sm font-bold text-ink">Custom Range</p>
      <form
        action="/admin/reports/view"
        method="get"
        className="flex flex-wrap items-end gap-2 rounded-xl border border-steel/20 bg-white p-3"
      >
        <label className="flex flex-col text-xs font-medium text-steel">
          Start
          <input
            type="date"
            name="start"
            required
            max={today}
            className="mt-1 rounded-lg border border-steel/30 px-2 py-1.5 text-sm text-ink"
          />
        </label>
        <label className="flex flex-col text-xs font-medium text-steel">
          End
          <input
            type="date"
            name="end"
            required
            max={today}
            className="mt-1 rounded-lg border border-steel/30 px-2 py-1.5 text-sm text-ink"
          />
        </label>
        <button type="submit" className="rounded-lg bg-ink px-3 py-2 text-xs font-semibold text-paper">
          View Report
        </button>
      </form>

      <p className="mt-4 text-xs text-steel">
        Weekly and monthly reports also generate automatically as notifications — see the bell icon.
      </p>
    </div>
  );
}
