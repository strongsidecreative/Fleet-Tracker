import { createClient } from "@/lib/supabase/server";
import { toCsv, csvResponse } from "@/lib/csv";

export async function GET() {
  const supabase = createClient();
  const { data: drivers } = await supabase.from("profiles").select("*").eq("role", "driver").order("name");

  const rows = (drivers ?? []).map((d) => ({
    name: d.name,
    email: d.email,
    active: d.active ? "yes" : "no",
    created_at: new Date(d.created_at).toLocaleDateString("en-NZ", { timeZone: "Pacific/Auckland" }),
  }));

  const csv = toCsv(rows, ["name", "email", "active", "created_at"]);
  return csvResponse(csv, `drivers-${new Date().toISOString().slice(0, 10)}.csv`);
}
