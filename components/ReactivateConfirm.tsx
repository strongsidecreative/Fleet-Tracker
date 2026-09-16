"use client";

import { useRef } from "react";

// A plain ConfirmSubmitButton can only gate one action behind one
// window.confirm. Reactivating a driver needs a second, short question:
// most drivers were deactivated the new way (see deactivateDriverAndFreeEmail
// in ../admin/users/actions.ts), which already replaced their email/password,
// so flipping `active` back on alone won't let them log back in. This keeps
// both prompts short and submits to whichever hidden form matches the
// answer — reusing the existing resendInvite/resetPasswordForEmail path
// rather than inventing a new one.
export default function ReactivateConfirm({
  name,
  reactivateOnlyAction,
  reactivateAndInviteAction,
  className,
}: {
  name: string;
  reactivateOnlyAction: () => void;
  reactivateAndInviteAction: () => void;
  className?: string;
}) {
  const onlyFormRef = useRef<HTMLFormElement>(null);
  const inviteFormRef = useRef<HTMLFormElement>(null);

  const handleClick = () => {
    if (!window.confirm(`Reactivate ${name}?`)) {
      return;
    }

    const alsoInvite = window.confirm(
      `Also send ${name} a new invite email? Needed unless their old login still works.`
    );

    if (alsoInvite) {
      inviteFormRef.current?.requestSubmit();
    } else {
      onlyFormRef.current?.requestSubmit();
    }
  };

  return (
    <>
      <form ref={onlyFormRef} action={reactivateOnlyAction} className="hidden" />
      <form ref={inviteFormRef} action={reactivateAndInviteAction} className="hidden" />
      <button type="button" onClick={handleClick} className={className}>
        Reactivate
      </button>
    </>
  );
}
