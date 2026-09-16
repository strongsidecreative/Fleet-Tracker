"use client";

import { useRef } from "react";

// A plain ConfirmSubmitButton can only gate one action behind one
// window.confirm. Reactivating a driver needs a second question first:
// most drivers were deactivated the new way (see deactivateDriverAndFreeEmail
// in ../admin/users/actions.ts), which already replaced their email/password,
// so flipping `active` back on alone won't let them log back in. This asks
// that as a second confirm and submits to whichever hidden form matches the
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
      `Also send ${name} a fresh invite email? Do this unless you know their old login still works — most drivers deactivated since accounts started freeing their email will need a new invite to log back in.`
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
