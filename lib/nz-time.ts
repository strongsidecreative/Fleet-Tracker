const NZ_TZ = "Pacific/Auckland";

export function fmtDate(date: string | Date) {
  return new Date(date).toLocaleDateString("en-NZ", { day: "numeric", month: "short", timeZone: NZ_TZ });
}

export function fmtDateLong(date: string | Date) {
  return new Date(date).toLocaleDateString("en-NZ", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: NZ_TZ,
  });
}

export function fmtTime(date: string | Date) {
  return new Date(date).toLocaleTimeString("en-NZ", { hour: "numeric", minute: "2-digit", timeZone: NZ_TZ });
}

export function fmtDateTime(date: string | Date) {
  return new Date(date).toLocaleString("en-NZ", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    timeZone: NZ_TZ,
  });
}

/**
 * Returns the y/m/d a given instant falls on in NZ time, regardless of what
 * timezone the server process itself is running in. Used for week/month
 * boundary math so "this week" matches what a person in NZ would expect.
 */
function nzDateParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-NZ", {
    timeZone: NZ_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value;
  return {
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
    weekday: get("weekday"),
  };
}

const WEEKDAY_INDEX: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

/**
 * Offset (ms) of NZ local time from UTC at a given instant: +13h in
 * summer (NZDT), +12h in winter (NZST).
 */
function nzOffsetMs(instant: Date): number {
  const parts = new Intl.DateTimeFormat("en-NZ", {
    timeZone: NZ_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(instant);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return asUtc - Math.floor(instant.getTime() / 1000) * 1000;
}

/**
 * The real instant for a wall-clock date + time typed in NZ, e.g.
 * nzLocalToDate("2026-10-12", "09:00") is 9am in Auckland, whatever
 * timezone the server or browser runs in. Vercel runs in UTC, so
 * `new Date("2026-10-12T09:00")` there means 9am UTC (10pm NZ) — never
 * parse a form's date/time that way.
 */
export function nzLocalToDate(date: string, time = "00:00"): Date {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  const wall = Date.UTC(y, m - 1, d, hh || 0, mm || 0);
  let instant = new Date(wall - nzOffsetMs(new Date(wall)));
  // Second pass settles the hour either side of a daylight-saving change.
  instant = new Date(wall - nzOffsetMs(instant));
  return instant;
}

/** YYYY-MM-DD plus a whole number of days (calendar arithmetic, no timezone). */
export function addDaysToDateString(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** ISO bounds for an inclusive NZ date range: [start 00:00 NZ, day after end 00:00 NZ). */
export function nzRangeIso(start: string, end: string): { fromIso: string; toIso: string } {
  return {
    fromIso: nzLocalToDate(start).toISOString(),
    toIso: nzLocalToDate(addDaysToDateString(end, 1)).toISOString(),
  };
}

/** YYYY-MM-DD of the Monday starting the NZ week containing `date`. */
export function startOfWeekNZDateString(date: Date = new Date()): string {
  const { year, month, day, weekday } = nzDateParts(date);
  const dayIndex = WEEKDAY_INDEX[weekday!] ?? 1;
  const diff = dayIndex === 0 ? -6 : 1 - dayIndex;
  return new Date(Date.UTC(year, month - 1, day + diff)).toISOString().slice(0, 10);
}

/** Midnight (NZ time) of the Monday starting the week containing `date`, as a real instant. */
export function startOfWeekNZ(date: Date = new Date()) {
  return nzLocalToDate(startOfWeekNZDateString(date));
}

/** Midnight (NZ time) of the 1st of the month containing `date`, as a real instant. */
export function startOfMonthNZ(date: Date = new Date()) {
  const { year, month } = nzDateParts(date);
  return nzLocalToDate(`${year}-${String(month).padStart(2, "0")}-01`);
}

/** The NZ calendar date of an instant, as YYYY-MM-DD (for <input type="date">). */
export function nzDateInputValue(date: string | Date): string {
  return nzDateString(new Date(date));
}

/** The NZ wall-clock time of an instant, as HH:MM (for <input type="time">). */
export function nzTimeInputValue(date: string | Date): string {
  const parts = new Intl.DateTimeFormat("en-NZ", {
    timeZone: NZ_TZ,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(date));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";
  return `${get("hour")}:${get("minute")}`;
}

function nzDateString(date: Date): string {
  const { year, month, day } = nzDateParts(date);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function nzToday(): string {
  return nzDateString(new Date());
}

/** True if `date` falls on the same NZ calendar day as right now. */
export function isTodayNZ(date: string | Date): boolean {
  return nzDateString(new Date(date)) === nzToday();
}

// Compulsory vehicle-check days — see startTrip() in
// app/(driver)/vehicle/[qr_identifier]/actions.ts. Currently fixed to
// Monday and Friday; if this ever needs to be configurable per
// organisation rather than a fleet-wide constant, this is the one place
// to change.
const COMPULSORY_CHECK_WEEKDAYS = new Set(["Mon", "Fri"]);

/** True if today (NZ time) is a day a pre-operation check is compulsory. */
export function isComplianceCheckDayNZ(date: Date = new Date()): boolean {
  const { weekday } = nzDateParts(date);
  return COMPULSORY_CHECK_WEEKDAYS.has(weekday!);
}
