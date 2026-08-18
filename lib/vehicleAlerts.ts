export type Severity = "ok" | "upcoming" | "due_soon" | "urgent" | "action_required";

const SEVERITY_RANK: Record<Severity, number> = {
  action_required: 4,
  urgent: 3,
  due_soon: 2,
  upcoming: 1,
  ok: 0,
};

export const SEVERITY_LABEL: Record<Severity, string> = {
  action_required: "Action Required",
  urgent: "Urgent",
  due_soon: "Due Soon",
  upcoming: "Upcoming",
  ok: "OK",
};

function daysUntil(isoDate: string | null): number | null {
  if (!isoDate) return null;
  const target = new Date(isoDate);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - now.getTime()) / 86400000);
}

function severityFromDays(days: number | null): Severity {
  if (days === null) return "ok";
  if (days <= 0) return "action_required";
  if (days <= 7) return "urgent";
  if (days <= 14) return "due_soon";
  if (days <= 30) return "upcoming";
  return "ok";
}

function severityFromKm(kmRemaining: number | null): Severity {
  if (kmRemaining === null) return "ok";
  if (kmRemaining <= 0) return "action_required";
  if (kmRemaining <= 200) return "urgent";
  if (kmRemaining <= 500) return "due_soon";
  if (kmRemaining <= 1000) return "upcoming";
  return "ok";
}

function worse(a: Severity, b: Severity): Severity {
  return SEVERITY_RANK[a] >= SEVERITY_RANK[b] ? a : b;
}

export interface VehicleForAlerts {
  wof_due: string | null;
  rego_due: string | null;
  ruc_purchased_to_km: number | null;
  service_due_date: string | null;
  service_due_km: number | null;
  current_odometer: number;
}

export function wofStatus(v: VehicleForAlerts) {
  const days = daysUntil(v.wof_due);
  const severity = severityFromDays(days);
  const label =
    severity === "action_required" ? "WOF EXPIRED" : days !== null ? `WOF due in ${days}d` : "No WOF date set";
  return { severity, label, days };
}

export function regoStatus(v: VehicleForAlerts) {
  const days = daysUntil(v.rego_due);
  const severity = severityFromDays(days);
  const label =
    severity === "action_required" ? "REGO EXPIRED" : days !== null ? `Rego due in ${days}d` : "No rego date set";
  return { severity, label, days };
}

export function rucStatus(v: VehicleForAlerts) {
  if (v.ruc_purchased_to_km === null) {
    return { severity: "ok" as Severity, label: "No RUC recorded", remainingKm: null };
  }
  const remainingKm = v.ruc_purchased_to_km - v.current_odometer;
  const severity = severityFromKm(remainingKm);
  const label = severity === "action_required" ? "RUC OVERDUE" : `${remainingKm.toLocaleString("en-NZ")} KM of RUC remaining`;
  return { severity, label, remainingKm };
}

export function serviceStatus(v: VehicleForAlerts) {
  const kmRemaining = v.service_due_km !== null ? v.service_due_km - v.current_odometer : null;
  const daysRemaining = daysUntil(v.service_due_date);

  const kmSeverity = severityFromKm(kmRemaining);
  const dateSeverity = severityFromDays(daysRemaining);
  const severity = worse(kmSeverity, dateSeverity);

  if (severity === "ok" && kmRemaining === null && daysRemaining === null) {
    return { severity, label: "No service info recorded", kmRemaining, daysRemaining };
  }

  const parts: string[] = [];
  if (kmRemaining !== null) parts.push(`${kmRemaining.toLocaleString("en-NZ")} KM`);
  if (daysRemaining !== null) parts.push(`${daysRemaining}d`);
  const label =
    severity === "action_required"
      ? "Service OVERDUE"
      : `Service due: ${parts.join(" / ")} remaining`;

  return { severity, label, kmRemaining, daysRemaining };
}

export function overallSeverity(v: VehicleForAlerts): Severity {
  return [wofStatus(v).severity, regoStatus(v).severity, rucStatus(v).severity, serviceStatus(v).severity].reduce(
    worse,
    "ok"
  );
}

export const SEVERITY_BADGE_CLASS: Record<Severity, string> = {
  action_required: "bg-rust text-paper",
  urgent: "bg-rust/15 text-rust",
  due_soon: "bg-amber/20 text-amber",
  upcoming: "bg-amber/10 text-amber",
  ok: "bg-track/15 text-track",
};
