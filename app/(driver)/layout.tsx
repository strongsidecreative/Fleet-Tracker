import DriverNav from "@/components/DriverNav";

export default function DriverLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen pb-20">
      <main className="mx-auto max-w-lg px-4 py-6">{children}</main>
      <DriverNav />
    </div>
  );
}
