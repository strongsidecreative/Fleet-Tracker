"use client";

import { useFormState, useFormStatus } from "react-dom";
import { createAdmin } from "../../drivers/new/actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-xl bg-ink py-3 text-base font-semibold text-paper disabled:opacity-60"
    >
      {pending ? "Sending Invite…" : "Add Admin"}
    </button>
  );
}

export default function NewAdminForm() {
  const [state, formAction] = useFormState(createAdmin, { error: null });

  return (
    <form action={formAction} className="space-y-4 rounded-xl border border-steel/20 bg-white p-4">
      <div>
        <label htmlFor="name" className="mb-1 block text-sm font-medium text-ink">
          Full Name
        </label>
        <input
          id="name"
          name="name"
          required
          className="w-full rounded-lg border border-steel/30 px-4 py-3 text-base focus:border-ink focus:outline-none focus:ring-2 focus:ring-brand"
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
          className="w-full rounded-lg border border-steel/30 px-4 py-3 text-base focus:border-ink focus:outline-none focus:ring-2 focus:ring-brand"
        />
      </div>
      <p className="text-xs text-steel">
        This sends an invite email through Supabase, with full admin access once they set a password.
      </p>
      {state.error && (
        <p role="alert" className="text-sm font-medium text-rust">
          {state.error}
        </p>
      )}
      <SubmitButton />
    </form>
  );
}
