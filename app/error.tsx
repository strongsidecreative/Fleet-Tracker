"use client";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-paper px-4 text-center">
      <p className="font-display text-6xl font-bold text-rust">!</p>
      <h1 className="mt-2 font-display text-xl font-semibold text-ink">Something went wrong</h1>
      <p className="mt-2 max-w-sm text-sm text-steel">
        That's on us, not you. Try again, and if it keeps happening, let the admin know what you were doing.
      </p>
      <button onClick={() => reset()} className="mt-6 rounded-xl bg-ink px-5 py-3 text-sm font-semibold text-paper">
        Try Again
      </button>
    </div>
  );
}
