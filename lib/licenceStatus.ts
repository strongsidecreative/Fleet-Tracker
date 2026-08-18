export type LicenceSeverity = "valid" | "expiring_soon" | "urgent" | "expired";

export const LICENCE_LABEL: Record<LicenceSeverity, string> = {
  valid: "Valid",
  expiring_soon: "Expiring Soon",
  urgent: "Urgent",
  expired: "Expired",
};

export const LICENCE_BADGE_CLASS: Record<LicenceSeverity, string> = {
  valid: "bg-track/15 text-track",
  expiring_soon: "bg-amber/10 text-amber",
  urgent: "bg-rust/15 text-rust",
  expired: "bg-rust text-paper",
};

export function daysUntil(isoDate: string): number {
  const target = new Date(isoDate);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - now.getTime()) / 86400000);
}

export function licenceSeverity(expiryDate: string): LicenceSeverity {
  const days = daysUntil(expiryDate);
  if (days <= 0) return "expired";
  if (days <= 7) return "urgent";
  if (days <= 30) return "expiring_soon";
  return "valid";
}
