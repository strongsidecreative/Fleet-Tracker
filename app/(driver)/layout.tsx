import DriverNav from "@/components/DriverNav";
import TourLauncher from "@/components/tour/TourLauncher";
import { driverTourSteps } from "@/components/tour/tourSteps";

export default function DriverLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen pb-20">
      <TourLauncher steps={driverTourSteps} storageKeyPrefix="ft_tour_driver" />
      <main className="mx-auto max-w-lg px-4 py-6">{children}</main>
      <DriverNav />
    </div>
  );
}
