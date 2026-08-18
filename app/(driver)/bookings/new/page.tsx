import { createClient } from "@/lib/supabase/server";
import NewBookingForm from "./NewBookingForm";

export default async function NewBookingPage() {
  const supabase = createClient();
  const { data: vehicles } = await supabase
    .from("vehicles")
    .select("id, name, registration")
    .eq("active", true)
    .order("name");
  const { data: admins } = await supabase
    .from("profiles")
    .select("id, name")
    .eq("role", "admin")
    .eq("active", true)
    .order("name");

  return (
    <div>
      <h1 className="mb-1 font-display text-xl font-bold text-ink">Book a Vehicle</h1>
      <p className="mb-4 text-sm text-steel">
        Your request goes to an admin for approval before it's confirmed.
      </p>
      <NewBookingForm vehicles={vehicles ?? []} admins={admins ?? []} />
    </div>
  );
}
