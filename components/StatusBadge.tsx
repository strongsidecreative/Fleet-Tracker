type Status = "available" | "in-use";

export default function StatusBadge({ status }: { status: Status }) {
  const isAvailable = status === "available";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold uppercase tracking-wide ${
        isAvailable ? "bg-track/15 text-track" : "bg-amber/15 text-amber"
      }`}
    >
      <span
        className={`h-2 w-2 rounded-full ${isAvailable ? "bg-track" : "bg-amber"}`}
        aria-hidden="true"
      />
      {isAvailable ? "Available" : "In Use"}
    </span>
  );
}
