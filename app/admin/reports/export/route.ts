import { createClient } from "@/lib/supabase/server";
import { toCsv, csvResponse } from "@/lib/csv";
import { nzLocalToDate, addDaysToDateString } from "@/lib/nz-time";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const start = searchParams.get("start");
  const end = searchParams.get("end");

  if (!start || !end) {
    return new Response("Missing start/end", { status: 400 });
  }

  const supabase = createClient();
  const { data: trips } = await supabase
    .from("vehicle_usage")
    .select("*, vehicle:vehicles(name, registration), driver:profiles(name)")
    .in("status", ["completed", "corrected"])
    .gte("start_datetime", nzLocalToDate(start).toISOString())
    .lt("start_datetime", nzLocalToDate(addDaysToDateString(end, 1)).toISOString())
    .order("start_datetime", { ascending: false });

  const rows = (trips ?? []).map((t) => ({
    date: new Date(t.start_datetime).toLocaleDateString("en-NZ", { timeZone: "Pacific/Auckland" }),
    driver: t.driver?.name ?? "",
    vehicle: t.vehicle?.name ?? "",
    registration: t.vehicle?.registration ?? "",
    start_km: t.start_km,
    end_km: t.end_km ?? "",
    kilometres: t.kilometres_used ?? "",
  }));

  const csv = toCsv(rows, ["date", "driver", "vehicle", "registration", "start_km", "end_km", "kilometres"]);
  return csvResponse(csv, `report-${start}-to-${end}.csv`);
}
