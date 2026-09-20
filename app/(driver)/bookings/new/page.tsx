import { createClient } from "@/lib/supabase/server";
import NewBookingForm from "./NewBookingForm";
import BackButton from "@/components/BackButton";

export default async function NewBookingPage() {
  const supabase = createClient();
  const [{ data: vehicles }, { data: admins }] = await Promise.all([
    supabase.from("vehicles").select("id, name, registration").eq("active", true).order("name"),
    supabase.from("profiles").select("id, name").eq("role", "admin").eq("active", true).order("name"),
  ]);

  return (
    <div>
      <BackButton label="Back to Bookings" />
      <h1 className="mb-1 mt-2 font-display text-xl font-bold text-ink">Book a Vehicle</h1>
      <p className="mb-4 text-sm text-steel">
        Your request goes to an admin for approval before it's confirmed.
      </p>
      <NewBookingForm vehicles={vehicles ?? []} admins={admins ?? []} />
    </div>
  );
}
