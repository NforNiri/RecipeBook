import { redirect } from "next/navigation";
import LoginForm from "./login-form";

const ERROR_MESSAGES: Record<string, string> = {
  otp_expired: "That sign-in link has expired. Request a new one below.",
  access_denied: "Sign-in was denied or the link is no longer valid. Try again.",
  auth_callback_failed: "Something went wrong during sign-in. Please try again.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string; error?: string; error_code?: string }>;
}) {
  const params = await searchParams;

  if (params.code) {
    redirect(`/callback?code=${params.code}`);
  }

  const isInviteOnly = params.error === "invite-only";

  const errorMessage = isInviteOnly
    ? undefined
    : params.error_code
    ? (ERROR_MESSAGES[params.error_code] ?? "Sign-in failed. Please try again.")
    : params.error
    ? (ERROR_MESSAGES[params.error] ?? "Sign-in failed. Please try again.")
    : undefined;

  return <LoginForm initialError={errorMessage} isInviteOnly={isInviteOnly} />;
}
