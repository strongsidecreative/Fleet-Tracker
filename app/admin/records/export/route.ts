import { createClient } from "@/lib/supabase/server";
import { toCsv, csvResponse } from "@/lib/csv";
import { nzLocalToDate, addDaysToDateString } from "@/lib/nz-time";
import { placeLabel } from "@/lib/placeLabel";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const driverId = searchParams.get("driverId");
  const vehicleId = searchParams.get("vehicleId");
  const status = searchParams.get("status");
  const start = searchParams.get("start");
  const end = searchParams.get("end");

  const supabase = createClient();
  let query = supabase
    .from("vehicle_usage")
    .select("*, vehicle:vehicles(name, registration), driver:profiles(name)")
    .order("start_datetime", { ascending: false });

  if (driverId) query = query.eq("driver_id", driverId);
  if (vehicleId) query = query.eq("vehicle_id", vehicleId);
  if (status) query = query.eq("status", status);
  if (start) query = query.gte("start_datetime", nzLocalToDate(start).toISOString());
  if (end) query = query.lt("start_datetime", nzLocalToDate(addDaysToDateString(end, 1)).toISOString());

  const { data: trips } = await query;

  const rows = (trips ?? []).map((t) => ({
    date: new Date(t.start_datetime).toLocaleDateString("en-NZ", { timeZone: "Pacific/Auckland" }),
    driver: t.driver?.name ?? "",
    vehicle: t.vehicle?.name ?? "",
    registration: t.vehicle?.registration ?? "",
    start_km: t.start_km,
    end_km: t.end_km ?? "",
    kilometres: t.kilometres_used ?? "",
    start_time: new Date(t.start_datetime).toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" }),
    end_time: t.end_datetime ? new Date(t.end_datetime).toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" }) : "",
    status: t.status,
    start_location: placeLabel(t.start_address, t.start_lat, t.start_lng) ?? "",
    end_location: placeLabel(t.end_address, t.end_lat, t.end_lng) ?? "",
    start_coords: t.start_lat != null ? `${t.start_lat},${t.start_lng}` : "",
    end_coords: t.end_lat != null ? `${t.end_lat},${t.end_lng}` : "",
  }));

  const csv = toCsv(rows, [
    "date",
    "driver",
    "vehicle",
    "registration",
    "start_km",
    "end_km",
    "kilometres",
    "start_time",
    "end_time",
    "status",
    "start_location",
    "end_location",
    "start_coords",
    "end_coords",
  ]);

  return csvResponse(csv, `usage-records-${new Date().toISOString().slice(0, 10)}.csv`);
}
