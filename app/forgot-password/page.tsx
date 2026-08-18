import ForgotPasswordForm from "./ForgotPasswordForm";

// See app/login/page.tsx for why this is forced dynamic.
export const dynamic = "force-dynamic";

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}
