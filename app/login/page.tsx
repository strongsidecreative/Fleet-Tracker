import LoginForm from "./LoginForm";
import { cookies } from "next/headers";

// LoginForm needs the Supabase env vars at render time. Forcing this route
// dynamic stops Next.js from trying to prerender it during `next build`
// (which runs before the deployed server actually has those vars wired up),
// which was causing the Vercel build to fail with "URL and API key are
// required to create a Supabase client!".
export const dynamic = "force-dynamic";

/** Only same-site paths like "/vehicle/abc" (never "//evil.com" or a full URL). */
function safeNextPath(raw: string | undefined): string | null {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\")) return null;
  if (raw === "/" || raw.startsWith("/login")) return null;
  return raw;
}

export default function LoginPage() {
  // Set by middleware when a logged-out person opens a protected page
  // (typically scanning a vehicle's QR code), so they land back on that
  // exact page after signing in.
  const next = safeNextPath(cookies().get("redirect_after_login")?.value);
  return <LoginForm next={next} />;
}
