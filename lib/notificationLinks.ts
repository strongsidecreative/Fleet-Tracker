// Where a notification should take the person who taps it, in the app
// list or from a push on their phone. Kept in one place so the bell list
// and push links always agree.

export type NotificationTarget = {
  type: string;
  related_table: string | null;
  related_id: string | null;
};

const ADMIN_FALLBACK = "/admin/notifications";

export function notificationHref(n: NotificationTarget, role: "admin" | "driver", licenceDriverId?: string | null): string {
  const id = n.related_id;

  if (role === "driver") {
    // Drivers only get booking decisions; their bookings list is the place.
    if (n.type.startsWith("booking_") && id) return `/bookings#booking-${id}`;
    return "/bookings";
  }

  switch (n.type) {
    case "booking_created":
      return id ? `/admin/bookings/${id}` : "/admin/bookings";
    case "booking_override":
    case "booking_approved":
    case "booking_declined":
    case "booking_cancelled":
      return id ? `/admin/bookings/${id}` : "/admin/bookings";
    case "incident_report":
      return id ? `/admin/incidents#incident-${id}` : "/admin/incidents";
    case "vehicle_check_issue":
      return id ? `/admin/vehicle-checks/${id}` : "/admin/vehicle-checks";
    case "maintenance_due":
      return n.related_table === "vehicles" && id ? `/admin/vehicles/${id}` : "/admin/vehicles";
    case "licence_expiring":
      return licenceDriverId ? `/admin/drivers/${licenceDriverId}` : "/admin/people";
    case "receipt_export_due":
      return "/admin/fuel/receipts";
    default:
      return ADMIN_FALLBACK;
  }
}
