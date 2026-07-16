import Link from "next/link";

import { login } from "./actions";
import AuthForm from "@/components/auth/AuthForm";

/**
 * Login screen (Server Component around a server-action form). Sign-in only;
 * account creation lives on the separate /register page.
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ checkEmail?: string; error?: string }>;
}) {
  const params = await searchParams;

  const banner = (
    <>
      {params.checkEmail ? (
        <div
          role="status"
          className="mb-5 rounded-lg border border-rarity-super-rare/50 bg-rarity-super-rare/10 p-3 text-center text-sm text-rarity-super-rare"
        >
          Check your email to confirm your account, then sign in below.
        </div>
      ) : null}

      {params.error ? (
        <div
          role="alert"
          className="mb-5 rounded-lg border border-red-400/40 bg-red-400/10 p-3 text-center text-sm text-red-300"
        >
          {params.error === "confirm-failed"
            ? "That confirmation link didn't work. Try signing in, or register again."
            : params.error}
        </div>
      ) : null}
    </>
  );

  return (
    <AuthForm
      title="Enter the vault"
      subtitle="Sign in to pull for your next project idea."
      action={login}
      submitLabel="Sign in"
      passwordAutoComplete="current-password"
      banner={banner}
      footer={
        <>
          New here?{" "}
          <Link
            href="/register"
            className="font-semibold text-brand hover:underline"
          >
            Create an account
          </Link>
        </>
      }
    />
  );
}
