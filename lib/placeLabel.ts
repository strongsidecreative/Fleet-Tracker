// Client-safe formatting for stored trip locations (migration 0024).

export function mapsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}

/** Map search for a place the driver typed (no GPS pin). */
export function mapsSearchUrl(text: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(text)}`;
}

/** "12 Main Street, Whakatāne" or, without an address, the coordinates. */
export function placeLabel(address: string | null | undefined, lat: number | null | undefined, lng: number | null | undefined): string | null {
  if (address) return address;
  if (lat == null || lng == null) return null;
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}
