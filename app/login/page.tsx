import { login, signup } from "./actions";

import KiroGhost from "@/components/brand/KiroGhost";

/**
 * Login / sign-up screen (Server Component shell around server-action
 * forms - no client JS required for auth itself).
 *
 * Design direction (taste skill, dark-fantasy gacha): a single centered
 * gate card over the shared FantasyBackground, echoing the chest/reveal
 * card treatment (dark panel, rarity-tinted border) rather than a generic
 * SaaS auth form. One accent (rare/purple) is used for focus states and the
 * primary action, consistent with the rest of the app's locked palette.
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ checkEmail?: string; error?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-12 sm:px-6">
      <div className="w-full max-w-sm rounded-2xl border-2 border-brand/35 bg-[#15121e] p-6 shadow-[0_0_32px_-4px_var(--color-brand)] sm:p-8">
        <div className="mb-6 flex flex-col items-center text-center">
          <KiroGhost size={52} className="text-brand" />
          <h2 className="mt-3 font-display text-2xl font-semibold tracking-tight text-foreground">
            Enter the vault
          </h2>
          <p className="mt-1 text-sm text-foreground/70">
            Sign in to pull for your next project idea.
          </p>
        </div>

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
              ? "That confirmation link didn't work. Try signing in, or sign up again."
              : params.error}
          </div>
        ) : null}

        <form className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="email"
              className="text-xs font-medium uppercase tracking-wide text-foreground/60"
            >
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="min-h-11 rounded-lg border border-foreground/15 bg-black/30 px-3 text-sm text-foreground placeholder:text-foreground/40 outline-none focus:border-brand focus:ring-2 focus:ring-brand/40"
              placeholder="you@example.com"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="password"
              className="text-xs font-medium uppercase tracking-wide text-foreground/60"
            >
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              minLength={6}
              className="min-h-11 rounded-lg border border-foreground/15 bg-black/30 px-3 text-sm text-foreground placeholder:text-foreground/40 outline-none focus:border-brand focus:ring-2 focus:ring-brand/40"
              placeholder="At least 6 characters"
            />
          </div>

          <div className="mt-2 flex flex-col gap-3">
            <button
              formAction={login}
              type="submit"
              className="min-h-11 rounded-lg bg-brand px-4 text-sm font-semibold text-white transition-colors hover:bg-brand/90 active:bg-brand/80"
            >
              Sign in
            </button>
            <button
              formAction={signup}
              type="submit"
              className="min-h-11 rounded-lg border border-brand/50 bg-brand/10 px-4 text-sm font-semibold text-brand transition-colors hover:bg-brand/20 active:bg-brand/25"
            >
              Create account
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
