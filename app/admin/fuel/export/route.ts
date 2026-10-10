import { createClient } from "@/lib/supabase/server";
import { toCsv, csvResponse } from "@/lib/csv";
import { isPrivateRef } from "@/lib/photos";
import { nzLocalToDate, addDaysToDateString } from "@/lib/nz-time";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const start = searchParams.get("start");
  const end = searchParams.get("end");
  const vehicleId = searchParams.get("vehicleId");

  const supabase = createClient();
  let query = supabase
    .from("fuel_logs")
    .select("*, vehicle:vehicles(name, registration), driver:profiles(name)")
    .order("created_at", { ascending: false });

  if (start) query = query.gte("created_at", nzLocalToDate(start).toISOString());
  if (end) query = query.lt("created_at", nzLocalToDate(addDaysToDateString(end, 1)).toISOString());
  if (vehicleId) query = query.eq("vehicle_id", vehicleId);

  const { data: logs } = await query;

  const rows = (logs ?? []).map((l) => ({
    date: new Date(l.created_at).toLocaleDateString("en-NZ", { timeZone: "Pacific/Auckland" }),
    driver: l.driver?.name ?? "",
    vehicle: l.vehicle?.name ?? "",
    registration: l.vehicle?.registration ?? "",
    odometer_km: l.odometer_km,
    cost: l.cost,
    notes: l.notes ?? "",
    receipt_url: !l.receipt_photo_url
      ? ""
      : isPrivateRef(l.receipt_photo_url)
        ? "in the Monthly Receipts ZIP"
        : l.receipt_photo_url,
  }));

  const csv = toCsv(rows, ["date", "driver", "vehicle", "registration", "odometer_km", "cost", "notes", "receipt_url"]);
  const suffix = start && end ? `-${start}-to-${end}` : "";
  return csvResponse(csv, `fuel-log${suffix}.csv`);
}
