import NewVehicleForm from "./NewVehicleForm";
import BackButton from "@/components/BackButton";

export default function NewVehiclePage() {
  return (
    <div>
      <BackButton label="Back to Vehicles" />
      <h1 className="mb-4 mt-2 font-display text-xl font-bold text-ink">Add Vehicle</h1>
      <NewVehicleForm />
    </div>
  );
}
