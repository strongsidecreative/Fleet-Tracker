import NewDriverForm from "./NewDriverForm";
import BackButton from "@/components/BackButton";

export default function NewDriverPage() {
  return (
    <div>
      <BackButton label="Back to Drivers" />
      <h1 className="mb-4 mt-2 font-display text-xl font-bold text-ink">Add Driver</h1>
      <NewDriverForm />
    </div>
  );
}
