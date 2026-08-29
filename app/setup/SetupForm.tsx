"use client";

import { useFormState, useFormStatus } from "react-dom";
import { setupOrganisation } from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-lg bg-ink py-3 text-base font-semibold text-paper transition-opacity disabled:opacity-60"
    >
      {pending ? "Creating organisation…" : "Create Organisation"}
    </button>
  );
}

export default function SetupForm() {
  const [state, formAction] = useFormState(setupOrganisation, { error: null });

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
          <p className="mt-4 text-sm text-steel">
            Welcome. This sets up a new organisation on Fleet Tracker, with you as its first admin. Everyone
            else in your organisation gets added from inside the app afterwards.
          </p>
        </div>

        <form action={formAction} className="space-y-4">
          <div>
            <label htmlFor="organisationName" className="mb-1 block text-sm font-medium text-ink">
              Organisation Name
            </label>
            <input
              id="organisationName"
              name="organisationName"
              required
              autoComplete="organization"
              placeholder="e.g. Smith Family, Acme Landscaping"
              className="w-full rounded-lg border border-steel/30 bg-white px-4 py-3 text-base text-ink focus:border-ink focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </div>

          <div>
            <label htmlFor="name" className="mb-1 block text-sm font-medium text-ink">
              Your Full Name
            </label>
            <input
              id="name"
              name="name"
              required
              autoComplete="name"
              className="w-full rounded-lg border border-steel/30 bg-white px-4 py-3 text-base text-ink focus:border-ink focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </div>

          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium text-ink">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="username"
              className="w-full rounded-lg border border-steel/30 bg-white px-4 py-3 text-base text-ink focus:border-ink focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium text-ink">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              className="w-full rounded-lg border border-steel/30 bg-white px-4 py-3 text-base text-ink focus:border-ink focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="mb-1 block text-sm font-medium text-ink">
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              className="w-full rounded-lg border border-steel/30 bg-white px-4 py-3 text-base text-ink focus:border-ink focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </div>

          {state.error && (
            <p role="alert" className="text-sm font-medium text-rust">
              {state.error}
            </p>
          )}

          <SubmitButton />
        </form>
      </div>
    </div>
  );
}
