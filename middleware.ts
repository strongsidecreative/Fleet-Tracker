import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { featureForPath, normaliseFeatures } from "@/lib/orgFeatures";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          response.cookies.set({ name, value: "", ...options });
        },
      },
    }
  );

  // Refreshes the session if the access token has expired.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isAdminRoute = path.startsWith("/admin") || path.startsWith("/api/admin");
  const isProtectedRoute =
    isAdminRoute ||
    path === "/" ||
    path.startsWith("/vehicle") ||
    path.startsWith("/trips") ||
    path.startsWith("/vehicles") ||
    path.startsWith("/account") ||
    path.startsWith("/scan") ||
    path.startsWith("/bookings") ||
    path.startsWith("/report-incident");

  // Not logged in and trying to reach a protected page: save where they
  // were headed, then send them to login. This is what lets a driver who
  // scans a QR code without being logged in land back on that exact
  // vehicle right after they sign in.
  if (!user && isProtectedRoute) {
    const redirectUrl = new URL("/login", request.url);
    response = NextResponse.redirect(redirectUrl);
    response.cookies.set("redirect_after_login", path, {
      maxAge: 60 * 10,
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });
    return response;
  }

  // A page/route this request is hitting that's behind a per-organisation
  // feature toggle (Incident Reports, Vehicle Checks, Reports, Audit
  // Log). Only paths matching one of these get the extra query below —
  // everything else (scan, trips, vehicles, bookings, account) is
  // untouched.
  const requiredFeature = featureForPath(path);

  // Logged in: enforce the admin/driver split server-side, not just by
  // hiding nav links. A driver pasting an /admin URL in gets bounced. The
  // same query also covers the feature-toggle check below when needed,
  // so a disabled feature is blocked here too — not just hidden from nav
  // — whether it's a page load or a Server Action posted to the same
  // route.
  if (user && (isAdminRoute || requiredFeature)) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, active, organisation:organisations(features)")
      .eq("id", user.id)
      .single();

    if (isAdminRoute) {
      if (!profile?.active) {
        await supabase.auth.signOut();
        return NextResponse.redirect(new URL("/login", request.url));
      }

      if (profile.role !== "admin") {
        return NextResponse.redirect(new URL("/", request.url));
      }
    }

    if (requiredFeature && profile) {
      const orgRaw = profile.organisation as unknown;
      const org = Array.isArray(orgRaw) ? orgRaw[0] : orgRaw;
      const features = normaliseFeatures((org as { features?: unknown } | null | undefined)?.features);

      if (!features[requiredFeature]) {
        const fallback = isAdminRoute ? "/admin" : "/";
        return NextResponse.redirect(new URL(`${fallback}?featureDisabled=${requiredFeature}`, request.url));
      }
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/",
    "/vehicle/:path*",
    "/vehicle-check/:path*",
    "/trips/:path*",
    "/vehicles/:path*",
    "/account/:path*",
    "/scan/:path*",
    "/bookings/:path*",
    "/report-incident/:path*",
    "/admin/:path*",
    "/api/admin/:path*",
  ],
};
