import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import CheckForm from "./CheckForm";

export default async function VehicleCheckPage({ searchParams }: { searchParams: { vehicleId?: string } }) {
  const supabase = createClient();

  if (!searchParams.vehicleId) {
    const { data: vehicles } = await supabase.from("vehicles").select("id, name, registration").eq("active", true).order("name");

    return (
      <div>
        <div className="mb-1 flex items-center justify-between">
          <h1 className="font-display text-xl font-bold text-ink">Vehicle Check</h1>
          <Link href="/vehicle-check/history" className="text-xs font-medium text-brand underline">
            My History
          </Link>
        </div>
        <p className="mb-4 text-sm text-steel">Select the vehicle you're checking.</p>
        <div className="space-y-2">
          {vehicles?.map((v) => (
            <Link
              key={v.id}
              href={`/vehicle-check?vehicleId=${v.id}`}
              className="block rounded-xl border border-steel/20 bg-white p-3"
            >
              <p className="font-medium text-ink">{v.name}</p>
              <p className="text-xs text-steel">{v.registration}</p>
            </Link>
          ))}
        </div>
      </div>
    );
  }

  const { data: vehicle } = await supabase
    .from("vehicles")
    .select("id, name, registration, current_odometer")
    .eq("id", searchParams.vehicleId)
    .single();

  if (!vehicle) {
    return <p className="text-sm text-steel">That vehicle couldn't be found.</p>;
  }

  return (
    <div>
      <h1 className="mb-4 font-display text-xl font-bold text-ink">Vehicle Check</h1>
      <CheckForm vehicle={vehicle} />
    </div>
  );
}
