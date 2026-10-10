import type { AdminClient } from "@/lib/supabase/admin";

/**
 * Every table that references a person via `driver_id` — see the
 * migrations (0001, 0002, 0003, 0007, 0008, 0018). `profiles.id` FKs to
 * `auth.users(id) on delete cascade`, but these reference `profiles(id)`
 * with no `on delete` clause (RESTRICT), so a person with any row here can
 * never be deleted outright. `driver_licences` and `push_subscriptions`
 * cascade, and `notifications` addressed to them are cleared before a
 * delete, so none of those count as history.
 */
const HISTORY_TABLES = [
  "vehicle_usage",
  "incident_reports",
  "bookings",
  "vehicle_checks",
  "booking_series",
  "fuel_logs",
] as const;

/**
 * Other columns that point at a person, mostly admin activity: approving
 * or deciding bookings, editing licences, raising incidents, audit entries.
 * Same RESTRICT rule, so these count as history too.
 */
const REFERENCE_COLUMNS: { table: string; column: string }[] = [
  { table: "audit_log", column: "user_id" },
  { table: "bookings", column: "approving_admin_id" },
  { table: "bookings", column: "decided_by" },
  { table: "bookings", column: "created_by" },
  { table: "driver_licences", column: "updated_by" },
  { table: "incident_reports", column: "created_by" },
];

const ALL_REFS = [
  ...HISTORY_TABLES.map((table) => ({ table, column: "driver_id" })),
  ...REFERENCE_COLUMNS,
];

/** True if this person has any row in any history table, i.e. deleting them outright would fail. */
export async function driverHasHistory(adminClient: AdminClient, userId: string): Promise<boolean> {
  const results = await Promise.all(
    ALL_REFS.map(({ table, column }) =>
      adminClient.from(table).select("id", { count: "exact", head: true }).eq(column, userId)
    )
  );
  return results.some((r) => (r.count ?? 0) > 0);
}

/** Batched version for a whole list at once (e.g. rendering the People page). */
export async function driverIdsWithHistory(adminClient: AdminClient, userIds: string[]): Promise<Set<string>> {
  if (userIds.length === 0) return new Set();
  const ids = new Set<string>();
  await Promise.all(
    ALL_REFS.map(async ({ table, column }) => {
      const { data } = await adminClient.from(table).select(column).in(column, userIds);
      ((data ?? []) as unknown as Record<string, string | null>[]).forEach((row) => {
        const v = row[column];
        if (v) ids.add(v);
      });
    })
  );
  return ids;
}
