/**
 * Trip start/finish locations (migration 0024). SERVER-ONLY helpers.
 * The phone sends lat/lng/accuracy from the browser's geolocation; the
 * server validates them and looks up a short street/suburb label with
 * OpenStreetMap's free Nominatim service (best effort, 2.5 s timeout:
 * if it's slow or down, the trip still saves with just the coordinates).
 */

export type TripLocation = { lat: number | null; lng: number | null; accuracy: number | null; address: string | null };

export function readLocation(formData: FormData): { lat: number; lng: number; accuracy: number | null } | null {
  const lat = Number(formData.get("lat"));
  const lng = Number(formData.get("lng"));
  const accRaw = formData.get("accuracy");
  if (!formData.get("lat") || !formData.get("lng")) return null;
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  const accuracy = accRaw ? Number(accRaw) : null;
  return { lat, lng, accuracy: accuracy !== null && Number.isFinite(accuracy) ? Math.round(accuracy) : null };
}

export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=17&addressdetails=1&lat=${lat}&lon=${lng}`;
    const res = await fetch(url, {
      headers: {
        // Nominatim's usage policy asks for an identifying User-Agent.
        "User-Agent": `FleetTracker/1.0 (${process.env.NEXT_PUBLIC_SITE_URL || "fleet tracker"})`,
        "Accept-Language": "en-NZ,en",
      },
      signal: AbortSignal.timeout(2500),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { address?: Record<string, string>; display_name?: string };
    const a = data.address ?? {};
    const street = [a.house_number, a.road].filter(Boolean).join(" ");
    const area = a.suburb || a.neighbourhood || a.village || a.hamlet;
    const town = a.town || a.city || a.county;
    const parts = [street, area, town].filter((p, i, arr) => p && arr.indexOf(p) === i);
    const label = parts.join(", ") || data.display_name || null;
    return label ? label.slice(0, 200) : null;
  } catch {
    return null;
  }
}

/** What the driver typed in the Location box, tidied and capped. */
export function typedPlace(formData: FormData): string | null {
  const raw = String(formData.get("place") ?? "").replace(/\s+/g, " ").trim();
  return raw ? raw.slice(0, 120) : null;
}

/**
 * Location from the form. A place the driver typed is used as the label
 * (and the phone's GPS, if allowed, is still kept as the map pin);
 * otherwise the GPS position is looked up as a street/suburb. Null when
 * there is neither.
 */
export async function tripLocationFrom(formData: FormData): Promise<TripLocation | null> {
  const loc = readLocation(formData);
  const typed = typedPlace(formData);
  if (!loc && !typed) return null;
  if (!loc) return { lat: null, lng: null, accuracy: null, address: typed };
  return { ...loc, address: typed ?? (await reverseGeocode(loc.lat, loc.lng)) };
}
