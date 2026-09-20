import NewAdminForm from "./NewAdminForm";
import BackButton from "@/components/BackButton";

export default function NewAdminPage() {
  return (
    <div>
      <BackButton label="Back to Admins" />
      <h1 className="mb-4 mt-2 font-display text-xl font-bold text-ink">Add Admin</h1>
      <NewAdminForm />
    </div>
  );
}
