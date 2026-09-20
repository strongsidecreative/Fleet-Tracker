"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { EmailOtpType } from "@supabase/supabase-js";

export default function ResetPasswordForm() {
  const supabase = createClient();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [linkDead, setLinkDead] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));

    // Supabase appends error=...&error_description=... instead of a session
    // when the link is invalid, expired, or already used. This is also what
    // shows up when the invite/reset link's one-time token has already been
    // consumed by something other than the person themselves clicking it —
    // e.g. Gmail/Outlook's automatic link-scanning, which fetches every link
    // in an incoming email server-side to check it for phishing/malware
    // *before* the recipient ever opens the message. Supabase's classic
    // {{ .ConfirmationURL }} link points straight at a stateful, single-use
    // verify endpoint on Supabase's own domain, so that automated fetch is
    // indistinguishable from the real click and burns the token — the person
    // then opens the email and gets exactly this "expired" error on a link
    // that's actually only ever been "used" by a bot. See the token_hash
    // branch below for the fix (see also the two email templates, updated to
    // point at this page directly instead of Supabase's /verify endpoint).
    const errorDescription =
      searchParams.get("error_description") || hashParams.get("error_description");
    if (errorDescription) {
      setLinkDead(decodeURIComponent(errorDescription.replace(/\+/g, " ")));
      return;
    }

    // New-style link: the email templates now point straight at this page
    // with ?token_hash=...&type=... instead of Supabase's own /verify
    // endpoint (see comment above for why). A mail scanner fetching *this*
    // URL just downloads an inert page — it doesn't run this component's JS,
    // so it can't consume the token. The token is only ever exchanged here,
    // client-side, when a real browser actually loads and runs this page.
    const tokenHash = searchParams.get("token_hash");
    const type = searchParams.get("type") as EmailOtpType | null;
    if (tokenHash && type) {
      supabase.auth.verifyOtp({ token_hash: tokenHash, type }).then(({ error: verifyError }) => {
        if (verifyError) {
          setLinkDead(verifyError.message || "This link has expired or has already been used.");
          return;
        }
        setReady(true);
      });
      return;
    }

    // Old-style link (Supabase-hosted /verify redirecting back with tokens
    // in the URL fragment). Kept as a fallback for any links already sent
    // before the templates were switched to token_hash above.
    // Recovery links (resetPasswordForEmail) fire PASSWORD_RECOVERY.
    // Invite links (inviteUserByEmail) fire SIGNED_IN instead — both mean
    // a valid session now exists and the form should show.
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") && session) {
        setReady(true);
      }
    });

    // In case the event already fired before this component mounted.
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });

    // Safety net: if nothing has resolved a session after a few seconds,
    // stop showing "checking..." forever and tell the person plainly.
    const timeout = setTimeout(() => {
      setLinkDead((current) => current ?? "This link has expired or has already been used.");
    }, 6000);

    return () => {
      listener.subscription.unsubscribe();
      clearTimeout(timeout);
    };
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

    // Send them to their role's guide (benefits + install steps + a way to
    // sign in) rather than straight to a bare login form — for someone who
    // was just invited, that's the first time they've seen what the app
    // does or how to install it. Falls back to /login if the role lookup
    // fails for any reason, so this never leaves someone stuck.
    let destination = "/login";
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
      if (profile?.role === "admin") destination = "/guide/admin?setup=success";
      else if (profile?.role === "driver") destination = "/guide/driver?setup=success";
    }
    setTimeout(() => router.push(destination), 1800);
  }

  if (done) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper px-4">
        <p className="text-center text-sm text-ink">Password updated. Taking you to your guide…</p>
      </div>
    );
  }

  if (linkDead) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper px-4">
        <div className="max-w-sm text-center">
          <p className="text-sm text-steel">{linkDead}</p>
          <a href="/login" className="mt-4 inline-block text-sm font-semibold text-brand underline">
            Go to login to request a new one
          </a>
        </div>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper px-4">
        <p className="text-center text-sm text-steel">Checking your reset link…</p>
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
