import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-paper px-4 text-center">
      <p className="font-display text-6xl font-bold text-ink">404</p>
      <h1 className="mt-2 font-display text-xl font-semibold text-ink">Page not found</h1>
      <p className="mt-2 max-w-sm text-sm text-steel">
        That page doesn't exist, or the link might be out of date.
      </p>
      <Link href="/" className="mt-6 rounded-xl bg-ink px-5 py-3 text-sm font-semibold text-paper">
        Back to Home
      </Link>
    </div>
  );
}
