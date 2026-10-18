import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { reverseGeocode } from "@/lib/geo";

export const dynamic = "force-dynamic";

/**
 * GET /api/geocode?lat=..&lng=.. -> { address: "12 Main Street, Whakatāne" | null }
 * Lets the start/finish trip form show the street and town as soon as the
 * phone has a GPS fix. Signed-in users only, so it can't be used as a free
 * public proxy to OpenStreetMap.
 */
export async function GET(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ address: null }, { status: 401 });

  const lat = Number(request.nextUrl.searchParams.get("lat"));
  const lng = Number(request.nextUrl.searchParams.get("lng"));
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return NextResponse.json({ address: null }, { status: 400 });
  }

  const address = await reverseGeocode(lat, lng);
  return NextResponse.json({ address }, { headers: { "Cache-Control": "private, max-age=300" } });
}
