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

/** Midnight (NZ time) of the Monday starting the week containing `date`. */
export function startOfWeekNZ(date: Date = new Date()) {
  const { year, month, day, weekday } = nzDateParts(date);
  const dayIndex = WEEKDAY_INDEX[weekday!] ?? 1;
  const diff = dayIndex === 0 ? -6 : 1 - dayIndex;
  // Construct as a UTC instant representing that NZ calendar date at midnight,
  // then let display formatting handle the actual NZ offset.
  const base = new Date(Date.UTC(year, month - 1, day));
  base.setUTCDate(base.getUTCDate() + diff);
  return base;
}

/** Midnight (NZ time) of the 1st of the month containing `date`. */
export function startOfMonthNZ(date: Date = new Date()) {
  const { year, month } = nzDateParts(date);
  return new Date(Date.UTC(year, month - 1, 1));
}

export function nzToday(): string {
  const { year, month, day } = nzDateParts(new Date());
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}
