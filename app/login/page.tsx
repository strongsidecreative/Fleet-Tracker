import LoginForm from "./LoginForm";

// LoginForm needs the Supabase env vars at render time. Forcing this route
// dynamic stops Next.js from trying to prerender it during `next build`
// (which runs before the deployed server actually has those vars wired up),
// which was causing the Vercel build to fail with "URL and API key are
// required to create a Supabase client!".
export const dynamic = "force-dynamic";

export default function LoginPage() {
  return <LoginForm />;
}
