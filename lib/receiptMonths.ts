// Pure month helpers shared by the receipts page, actions and daily job.
import { nzLocalToDate, nzToday } from "./nz-time";

/** "2026-09-01" style key for the NZ calendar month containing an instant. */
export function monthKeyOf(date: string | Date): string {
  const d = new Date(date);
  const s = new Intl.DateTimeFormat("en-CA", { timeZone: "Pacific/Auckland", year: "numeric", month: "2-digit" }).format(d);
  return `${s}-01`;
}

export function isMonthKey(s: string | null | undefined): s is string {
  return !!s && /^\d{4}-(0[1-9]|1[0-2])-01$/.test(s);
}

/** Month key plus/minus whole months. */
export function addMonths(monthKey: string, n: number): string {
  const [y, m] = monthKey.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return d.toISOString().slice(0, 10);
}

export function currentMonthKey(): string {
  return `${nzToday().slice(0, 7)}-01`;
}

/** ISO bounds of an NZ calendar month: [1st 00:00 NZ, next 1st 00:00 NZ). */
export function monthRangeIso(monthKey: string): { fromIso: string; toIso: string } {
  return {
    fromIso: nzLocalToDate(monthKey).toISOString(),
    toIso: nzLocalToDate(addMonths(monthKey, 1)).toISOString(),
  };
}

export function monthLabel(monthKey: string): string {
  const [y, m] = monthKey.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 15)).toLocaleDateString("en-NZ", { month: "long", year: "numeric", timeZone: "UTC" });
}
