import { NextResponse } from "next/server";
import { vapidPublicKey } from "@/lib/vapid";

// The push public key is public by design (every browser that subscribes
// gets it); serving it here means the app no longer depends on it being
// baked into the build.
export const dynamic = "force-dynamic";

export async function GET() {
  const key = vapidPublicKey();
  if (!key) return NextResponse.json({ error: "Push key not configured" }, { status: 500 });
  return NextResponse.json({ key }, { headers: { "Cache-Control": "no-store" } });
}
