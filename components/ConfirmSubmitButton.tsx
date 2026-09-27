"use client";

import { useFormStatus } from "react-dom";

/**
 * Submit button with a confirm() prompt. Shows a pending state while the
 * server action runs, so a slow action (deleting a driver, removing a
 * vehicle) visibly responds straight away instead of looking frozen, and
 * can't be tapped twice.
 */
export default function ConfirmSubmitButton({
  confirmMessage,
  className,
  children,
  pendingLabel = "Working…",
}: {
  confirmMessage: string;
  className?: string;
  children: React.ReactNode;
  pendingLabel?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className={`${className ?? ""} disabled:cursor-wait disabled:opacity-60`}
      onClick={(e) => {
        if (pending || !window.confirm(confirmMessage)) {
          e.preventDefault();
        }
      }}
    >
      {pending ? pendingLabel : children}
    </button>
  );
}
