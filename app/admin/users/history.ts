import type { AdminClient } from "@/lib/supabase/admin";

/**
 * Every table that references a driver via `driver_id` — see the
 * migrations (0001, 0002, 0003, 0007, 0008, 0018). `profiles.id` FKs to
 * `auth.users(id) on delete cascade`, but every one of these references
 * `profiles(id)` with no `on delete` clause, i.e. the default RESTRICT —
 * so a driver with any row in any of these tables can never actually be
 * deleted; the database itself blocks it. `driver_licences` is excluded:
 * it's 1:1 profile data with `on delete cascade` already set, not
 * "history" that blocks anything.
 */
const HISTORY_TABLES = [
  "vehicle_usage",
  "incident_reports",
  "bookings",
  "vehicle_checks",
  "booking_series",
  "fuel_logs",
] as const;

/** True if this driver has any row in any history table — i.e. deleting them would fail. */
export async function driverHasHistory(adminClient: AdminClient, driverId: string): Promise<boolean> {
  const results = await Promise.all(
    HISTORY_TABLES.map((table) =>
      adminClient.from(table).select("id", { count: "exact", head: true }).eq("driver_id", driverId)
    )
  );
  return results.some((r) => (r.count ?? 0) > 0);
}

/**
 * Batched version for a whole list at once (e.g. rendering the People
 * page) — one query per table instead of 6 per driver.
 */
export async function driverIdsWithHistory(adminClient: AdminClient, driverIds: string[]): Promise<Set<string>> {
  if (driverIds.length === 0) return new Set();
  const ids = new Set<string>();
  await Promise.all(
    HISTORY_TABLES.map(async (table) => {
      const { data } = await adminClient.from(table).select("driver_id").in("driver_id", driverIds);
      (data ?? []).forEach((row: { driver_id: string }) => ids.add(row.driver_id));
    })
  );
  return ids;
}
