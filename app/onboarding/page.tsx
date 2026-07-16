import { completeOnboarding } from "./actions";
import KiroGhost from "@/components/brand/KiroGhost";
import { createClient } from "@/lib/supabase/server";

/**
 * One-step onboarding shown to a new user right after their first sign-in.
 * Collects a first and last name, saved to auth user_metadata and used as the
 * leaderboard display name. The middleware routes here whenever a signed-in
 * user has no name yet, and away once they do.
 */
export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const meta = (user?.user_metadata ?? {}) as Record<string, unknown>;
  const firstDefault = String(meta.first_name ?? "");
  const lastDefault = String(meta.last_name ?? "");

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-12 sm:px-6">
      <div className="w-full max-w-sm rounded-2xl border-2 border-brand/35 bg-[#15121e] p-6 shadow-[0_0_32px_-4px_var(--color-brand)] sm:p-8">
        <div className="mb-6 flex flex-col items-center text-center">
          <KiroGhost size={52} className="text-brand" expression="happy" />
          <h2 className="mt-3 font-display text-2xl font-semibold tracking-tight text-foreground">
            Welcome to the vault
          </h2>
          <p className="mt-1 text-sm text-foreground/70">
            What should we call you on the leaderboard?
          </p>
        </div>

        {params.error ? (
          <div
            role="alert"
            className="mb-5 rounded-lg border border-red-400/40 bg-red-400/10 p-3 text-center text-sm text-red-300"
          >
            {params.error}
          </div>
        ) : null}

        <form action={completeOnboarding} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="firstName"
              className="text-xs font-medium uppercase tracking-wide text-foreground/60"
            >
              First name
            </label>
            <input
              id="firstName"
              name="firstName"
              type="text"
              autoComplete="given-name"
              required
              maxLength={40}
              defaultValue={firstDefault}
              className="min-h-11 rounded-lg border border-foreground/15 bg-black/30 px-3 text-sm text-foreground placeholder:text-foreground/40 outline-none focus:border-brand focus:ring-2 focus:ring-brand/40"
              placeholder="Ada"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="lastName"
              className="text-xs font-medium uppercase tracking-wide text-foreground/60"
            >
              Last name
            </label>
            <input
              id="lastName"
              name="lastName"
              type="text"
              autoComplete="family-name"
              required
              maxLength={40}
              defaultValue={lastDefault}
              className="min-h-11 rounded-lg border border-foreground/15 bg-black/30 px-3 text-sm text-foreground placeholder:text-foreground/40 outline-none focus:border-brand focus:ring-2 focus:ring-brand/40"
              placeholder="Lovelace"
            />
          </div>

          <button
            type="submit"
            className="mt-2 min-h-11 rounded-lg bg-brand px-4 text-sm font-semibold text-white transition-colors hover:bg-brand/90 active:bg-brand/80"
          >
            Enter the vault
          </button>
        </form>
      </div>
    </div>
  );
}
