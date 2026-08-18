"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordForm() {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    setLoading(false);
    if (error) {
      setError("Something went wrong. Please check the email address and try again.");
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper px-4">
        <div className="w-full max-w-sm text-center">
          <h1 className="mb-3 font-display text-xl font-semibold text-ink">Check your email</h1>
          <p className="text-sm text-steel">
            If an account exists for {email}, a password reset link is on its way. Follow the link to set a new
            password.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-4">
      <div className="w-full max-w-sm">
        <h1 className="mb-2 text-center font-display text-2xl font-semibold text-ink">Reset your password</h1>
        <p className="mb-6 text-center text-sm text-steel">
          Enter your email and we'll send you a link to set a new password.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
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
            {loading ? "Sending…" : "Send Reset Link"}
          </button>
        </form>

        <a href="/login" className="mt-4 block text-center text-sm font-medium text-steel underline underline-offset-2">
          Back to login
        </a>
      </div>
    </div>
  );
}
