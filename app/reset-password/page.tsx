import ResetPasswordForm from "./ResetPasswordForm";

// See app/login/page.tsx for why this is forced dynamic.
export const dynamic = "force-dynamic";

export default function ResetPasswordPage() {
  return <ResetPasswordForm />;
}
