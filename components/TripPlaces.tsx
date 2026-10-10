import { mapsSearchUrl, mapsUrl, placeLabel } from "@/lib/placeLabel";

type Trip = {
  start_address?: string | null;
  start_lat?: number | null;
  start_lng?: number | null;
  end_address?: string | null;
  end_lat?: number | null;
  end_lng?: number | null;
};

function Place({ label, lat, lng }: { label: string | null; lat?: number | null; lng?: number | null }) {
  if (!label) return <span className="text-steel">not recorded</span>;
  const href = lat != null && lng != null ? mapsUrl(lat, lng) : mapsSearchUrl(label);
  return (
    <a href={href} target="_blank" rel="noreferrer" className="text-brand underline">
      {label}
    </a>
  );
}

/** "From … → To …" line for a trip, with map links (migration 0024). Renders nothing for older trips with no locations. */
export default function TripPlaces({ trip }: { trip: Trip }) {
  const from = placeLabel(trip.start_address, trip.start_lat, trip.start_lng);
  const to = placeLabel(trip.end_address, trip.end_lat, trip.end_lng);
  if (!from && !to) return null;
  return (
    <p className="mt-1 text-xs text-ink">
      <span className="text-steel">From </span>
      <Place label={from} lat={trip.start_lat} lng={trip.start_lng} />
      <span className="text-steel"> → To </span>
      <Place label={to} lat={trip.end_lat} lng={trip.end_lng} />
    </p>
  );
}
