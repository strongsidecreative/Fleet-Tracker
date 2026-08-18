export type RecurrencePattern = {
  mode?: "weekly" | "monthly"; // defaults to "weekly" for backward compatibility
  days: number[]; // 0 = Sunday .. 6 = Saturday — only used when mode is "weekly"
  intervalWeeks: 1 | 2; // 1 = weekly, 2 = fortnightly — only used when mode is "weekly"
  endType: "date" | "occurrences" | "weeks";
  endValue: string | number;
};

const DAY_LABELS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function dayLabel(day: number, short = false) {
  return short ? DAY_SHORT[day] : DAY_LABELS[day];
}

/**
 * Returns the ISO date (YYYY-MM-DD) of every occurrence, starting from
 * startDateIso, matching the given pattern. Deterministic and pure, so the
 * driver's preview and the server's authoritative creation always agree.
 */
export function generateOccurrenceDates(startDateIso: string, pattern: RecurrencePattern): string[] {
  if (pattern.mode === "monthly") {
    return generateMonthlyOccurrenceDates(startDateIso, pattern);
  }

  const start = new Date(`${startDateIso}T00:00:00`);
  const results: string[] = [];
  const SAFETY_CAP_DAYS = 400; // ~13 months of daily scanning, well past any sane request

  const weekAnchor = new Date(start);
  weekAnchor.setDate(weekAnchor.getDate() - weekAnchor.getDay());

  let endDate: Date | null = null;
  let maxOccurrences: number | null = null;

  if (pattern.endType === "date") {
    endDate = new Date(`${pattern.endValue}T23:59:59`);
  } else if (pattern.endType === "occurrences") {
    maxOccurrences = Number(pattern.endValue);
  } else if (pattern.endType === "weeks") {
    endDate = new Date(start);
    endDate.setDate(endDate.getDate() + Number(pattern.endValue) * 7 - 1);
  }

  for (let i = 0; i < SAFETY_CAP_DAYS; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    if (endDate && d > endDate) break;
    if (!pattern.days.includes(d.getDay())) continue;

    const weeksSinceAnchor = Math.floor((d.getTime() - weekAnchor.getTime()) / (7 * 86400000));
    if (weeksSinceAnchor % pattern.intervalWeeks !== 0) continue;

    results.push(d.toISOString().slice(0, 10));
    if (maxOccurrences && results.length >= maxOccurrences) break;
  }

  return results;
}

/**
 * Monthly recurrence: same day-of-month as the start date, every month.
 * If a given month is shorter than that day (e.g. start on the 31st),
 * that month is skipped rather than silently rolling into the next month.
 */
function generateMonthlyOccurrenceDates(startDateIso: string, pattern: RecurrencePattern): string[] {
  const start = new Date(`${startDateIso}T00:00:00`);
  const dayOfMonth = start.getDate();
  const results: string[] = [];

  let endDate: Date | null = null;
  let maxOccurrences: number | null = null;
  if (pattern.endType === "date") {
    endDate = new Date(`${pattern.endValue}T23:59:59`);
  } else if (pattern.endType === "occurrences") {
    maxOccurrences = Number(pattern.endValue);
  }

  const SAFETY_CAP_MONTHS = 36;
  for (let i = 0; i < SAFETY_CAP_MONTHS; i++) {
    const candidate = new Date(start.getFullYear(), start.getMonth() + i, dayOfMonth);
    if (candidate.getDate() !== dayOfMonth) continue; // that month is too short — skip it
    if (endDate && candidate > endDate) break;

    results.push(candidate.toISOString().slice(0, 10));
    if (maxOccurrences && results.length >= maxOccurrences) break;
  }

  return results;
}
