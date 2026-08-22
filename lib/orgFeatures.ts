// Fleet Tracker — per-organisation feature toggles
//
// Pure, edge-safe (no Supabase client, no Node-only APIs) — this file is
// imported by middleware.ts, which runs on the Edge runtime, as well as
// by ordinary server components. Anything that needs a Supabase client
// lives in orgFeatures.server.ts instead.

export type FeatureKey = "incident_reports" | "vehicle_checks" | "reports" | "audit_log";

export const FEATURE_LABELS: Record<FeatureKey, string> = {
  incident_reports: "Incident Reports",
  vehicle_checks: "Vehicle Checks",
  reports: "Reports",
  audit_log: "Audit Log",
};

export const FEATURE_DESCRIPTIONS: Record<FeatureKey, string> = {
  incident_reports: "Drivers can report incidents; admins see the Incidents inbox.",
  vehicle_checks: "Drivers complete pre/post-operation vehicle checks.",
  reports: "The admin Reports page, date-range views, and CSV exports.",
  audit_log: "The admin Audit Log of overrides and approval decisions.",
};

// Every organisation gets every feature unless it's been explicitly
// switched off — a brand new key added here in future defaults to "on"
// for every existing organisation, not silently hidden.
export const DEFAULT_FEATURES: Record<FeatureKey, boolean> = {
  incident_reports: true,
  vehicle_checks: true,
  reports: true,
  audit_log: true,
};

const FEATURE_KEYS = Object.keys(DEFAULT_FEATURES) as FeatureKey[];

/**
 * Takes whatever came back from organisations.features (jsonb — could be
 * null, malformed, or missing keys if this ever runs against a stale
 * cache) and returns a complete, safely-typed features object. Unknown
 * shapes fall back to "everything on" per key rather than "everything
 * off", so a bug here can never accidentally lock an org out of its own
 * app.
 */
export function normaliseFeatures(raw: unknown): Record<FeatureKey, boolean> {
  const obj = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const result = { ...DEFAULT_FEATURES };
  for (const key of FEATURE_KEYS) {
    if (typeof obj[key] === "boolean") result[key] = obj[key] as boolean;
  }
  return result;
}

// Route prefixes that a disabled feature should fully block — both the
// page itself and any Server Action form-posted to it (Next.js posts
// Server Actions to the same route the form is rendered on, so this one
// list covers both).
export const FEATURE_PATH_RULES: { prefix: string; feature: FeatureKey }[] = [
  { prefix: "/admin/incidents", feature: "incident_reports" },
  { prefix: "/report-incident", feature: "incident_reports" },
  { prefix: "/admin/vehicle-checks", feature: "vehicle_checks" },
  { prefix: "/vehicle-check", feature: "vehicle_checks" },
  { prefix: "/admin/reports", feature: "reports" },
  { prefix: "/admin/audit", feature: "audit_log" },
];

export function featureForPath(path: string): FeatureKey | null {
  const rule = FEATURE_PATH_RULES.find((r) => path.startsWith(r.prefix));
  return rule?.feature ?? null;
}
