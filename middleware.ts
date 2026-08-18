import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

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

  // Logged in: enforce the admin/driver split server-side, not just by
  // hiding nav links. A driver pasting an /admin URL in gets bounced.
  if (user && isAdminRoute) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, active")
      .eq("id", user.id)
      .single();

    if (!profile?.active) {
      await supabase.auth.signOut();
      return NextResponse.redirect(new URL("/login", request.url));
    }

    if (profile.role !== "admin") {
      return NextResponse.redirect(new URL("/", request.url));
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
