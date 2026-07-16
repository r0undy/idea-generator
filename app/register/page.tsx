import Link from "next/link";

import { signup } from "./actions";
import AuthForm from "@/components/auth/AuthForm";

/**
 * Register screen (Server Component around a server-action form). Account
 * creation only; sign-in lives on the separate /login page. After sign-up the
 * user confirms their email, then completes a short onboarding to pick the
 * name shown on the leaderboard.
 */
export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  const banner = params.error ? (
    <div
      role="alert"
      className="mb-5 rounded-lg border border-red-400/40 bg-red-400/10 p-3 text-center text-sm text-red-300"
    >
      {params.error}
    </div>
  ) : null;

  return (
    <AuthForm
      title="Join the vault"
      subtitle="Create an account to start pulling ideas."
      action={signup}
      submitLabel="Create account"
      passwordAutoComplete="new-password"
      banner={banner}
      footer={
        <>
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-semibold text-brand hover:underline"
          >
            Sign in
          </Link>
        </>
      }
    />
  );
}
