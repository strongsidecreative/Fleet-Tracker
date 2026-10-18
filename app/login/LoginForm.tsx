"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginForm({ next = null }: { next?: string | null }) {
  const searchParams = useSearchParams();
  const justSetUp = searchParams.get("setup") === "success";
  const serverError = searchParams.get("error") === "server";
  const orgDeleted = searchParams.get("deleted") === "1";
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error, data } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError("That email or password isn't right. Please try again.");
      setLoading(false);
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.user.id)
      .single();

    // One navigation, not two: router.push() followed by router.refresh()
    // rendered the destination on the server twice back to back, which is
    // a big part of why admin sign-in felt slow. A single hard navigation
    // also guarantees the new session cookies are what the server sees.
    // Back to the page they were trying to open (e.g. a scanned vehicle),
    // unless it's an admin page and they're a driver.
    const isAdmin = profile?.role === "admin";
    const destination = next && (isAdmin || !next.startsWith("/admin")) ? next : isAdmin ? "/admin" : "/";
    window.location.replace(destination);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <img
            src="/icon-512.png"
            alt="Fleet Tracker"
            width={512}
            height={512}
            className="mx-auto h-24 w-24 rounded-2xl"
          />
        </div>

        {serverError && (
          <p className="mb-4 rounded-lg border border-rust/40 bg-rust/10 px-4 py-3 text-sm font-medium text-rust">
            You signed in, but the app couldn&apos;t load your account details just now. Please try again in a moment. If it keeps happening, let your fleet admin know.
          </p>
        )}

        {orgDeleted && (
          <p className="mb-4 rounded-lg border border-steel/30 bg-white px-4 py-3 text-sm font-medium text-ink">
            Your organisation and all of its accounts and records have been permanently deleted.
          </p>
        )}

        {justSetUp && (
          <p className="mb-4 rounded-lg border border-track/40 bg-track/10 px-4 py-3 text-sm font-medium text-track">
            Organisation created. Log in below to get started.
          </p>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium text-ink">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-steel/30 bg-white px-4 py-3 text-base text-ink focus:border-ink focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium text-ink">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-steel/30 bg-white px-4 py-3 text-base text-ink focus:border-ink focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </div>

          {error && (
            <p role="alert" className="text-sm font-medium text-rust">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-ink py-3 text-base font-semibold text-paper transition-opacity disabled:opacity-60"
          >
            {loading ? "Logging in…" : "Log In"}
          </button>
        </form>

        <a
          href="/forgot-password"
          className="mt-4 block text-center text-sm font-medium text-steel underline underline-offset-2"
        >
          Forgot Password
        </a>
      </div>
    </div>
  );
}
