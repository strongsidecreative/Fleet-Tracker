"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordForm() {
  const supabase = createClient();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    // Supabase fires this once it's parsed the recovery token from the
    // email link's URL fragment. Until then, the form stays hidden so
    // people don't submit before a valid recovery session exists.
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setReady(true);
    });
    // In case the event already fired before this component mounted.
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => listener.subscription.unsubscribe();
  }, [supabase]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      setError("Something went wrong. Please try requesting a new reset link.");
      return;
    }
    setDone(true);
    setTimeout(() => router.push("/login"), 2000);
  }

  if (done) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper px-4">
        <p className="text-center text-sm text-ink">Password updated. Redirecting you to login…</p>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper px-4">
        <p className="text-center text-sm text-steel">
          Checking your reset link… If nothing happens, the link may have expired — request a new one from the
          login page.
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-4">
      <div className="w-full max-w-sm">
        <h1 className="mb-6 text-center font-display text-2xl font-semibold text-ink">Set a new password</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium text-ink">
              New password
            </label>
            <input
              id="password"
              type="password"
              required
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-steel/30 bg-white px-4 py-3 text-base text-ink focus:border-ink focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </div>
          <div>
            <label htmlFor="confirmPassword" className="mb-1 block text-sm font-medium text-ink">
              Confirm new password
            </label>
            <input
              id="confirmPassword"
              type="password"
              required
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
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
            className="w-full rounded-lg bg-ink py-3 text-base font-semibold text-paper disabled:opacity-60"
          >
            {loading ? "Saving…" : "Set New Password"}
          </button>
        </form>
      </div>
    </div>
  );
}
