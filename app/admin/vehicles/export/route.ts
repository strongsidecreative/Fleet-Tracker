import { createClient } from "@/lib/supabase/server";
import { toCsv, csvResponse } from "@/lib/csv";

export async function GET() {
  const supabase = createClient();
  const { data: vehicles } = await supabase.from("vehicles").select("*").order("name");

  const rows = (vehicles ?? []).map((v) => ({
    name: v.name,
    make: v.make ?? "",
    model: v.model ?? "",
    registration: v.registration,
    current_odometer: v.current_odometer,
    active: v.active ? "yes" : "no",
    wof_due: v.wof_due ?? "",
    rego_due: v.rego_due ?? "",
    ruc_purchased_to_km: v.ruc_purchased_to_km ?? "",
    service_due_date: v.service_due_date ?? "",
    service_due_km: v.service_due_km ?? "",
    wheel_alignment_due_date: v.wheel_alignment_due_date ?? "",
    wheel_alignment_due_km: v.wheel_alignment_due_km ?? "",
  }));

  const csv = toCsv(rows, [
    "name",
    "make",
    "model",
    "registration",
    "current_odometer",
    "active",
    "wof_due",
    "rego_due",
    "ruc_purchased_to_km",
    "service_due_date",
    "service_due_km",
    "wheel_alignment_due_date",
    "wheel_alignment_due_km",
  ]);
  return csvResponse(csv, `vehicles-${new Date().toISOString().slice(0, 10)}.csv`);
}
