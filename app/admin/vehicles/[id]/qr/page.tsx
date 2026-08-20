import { createClient } from "@/lib/supabase/server";
import QRCode from "qrcode";
import Link from "next/link";
import QrCardActions from "./QrCardActions";
import SuccessBanner from "@/components/SuccessBanner";

export default async function VehicleQrPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: vehicle } = await supabase.from("vehicles").select("*").eq("id", params.id).single();

  if (!vehicle) {
    return <p className="text-sm text-steel">Vehicle not found.</p>;
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const scanUrl = `${siteUrl}/vehicle/${vehicle.qr_identifier}`;
  const qrDataUrl = await QRCode.toDataURL(scanUrl, { width: 480, margin: 2 });

  return (
    <div className="mx-auto max-w-sm">
      <SuccessBanner />
      <div className="rounded-2xl border-2 border-ink bg-white p-6 text-center print:border print:shadow-none">
        <p className="font-display text-sm font-bold uppercase tracking-widest text-steel">Fleet Tracker</p>
        <h1 className="mt-2 font-display text-2xl font-bold text-ink">{vehicle.name}</h1>
        <p className="text-sm text-steel">{vehicle.registration}</p>

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={qrDataUrl} alt={`QR code for ${vehicle.name}`} className="mx-auto my-6 h-64 w-64" />

        <p className="text-xs font-bold uppercase tracking-wide text-ink">
          Scan Before And After Using This Vehicle
        </p>
      </div>

      <QrCardActions qrDataUrl={qrDataUrl} vehicleName={vehicle.name} registration={vehicle.registration} />

      <Link
        href="/admin/vehicles"
        className="mt-4 block text-center text-sm font-semibold text-ink print:hidden"
      >
        Done, back to vehicles
      </Link>

      <p className="mt-4 text-center text-xs text-steel print:hidden">
        This QR points to {scanUrl}. If your site URL changes (e.g. after deploying), update
        NEXT_PUBLIC_SITE_URL and reprint.
      </p>
    </div>
  );
}
