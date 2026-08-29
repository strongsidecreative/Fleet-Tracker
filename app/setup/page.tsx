import SetupForm from "./SetupForm";

// Needs the service role key at request time (see actions.ts), so this
// can't be statically prerendered during `next build`.
export const dynamic = "force-dynamic";

export default function SetupPage({ searchParams }: { searchParams: { token?: string } }) {
  return <SetupForm token={searchParams.token} />;
}
