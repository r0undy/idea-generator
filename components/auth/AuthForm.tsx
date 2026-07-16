import KiroGhost from "@/components/brand/KiroGhost";

/**
 * Shared auth card used by the separate /login and /register pages. A single
 * centered gate card over the FantasyBackground, echoing the app's dark-panel
 * treatment with the brand accent. No client JS: submits a server action.
 */
export interface AuthFormProps {
  title: string;
  subtitle: string;
  /** Server action the form submits to. */
  action: (formData: FormData) => Promise<void>;
  submitLabel: string;
  /** "current-password" for sign-in, "new-password" for register. */
  passwordAutoComplete: "current-password" | "new-password";
  /** Optional status/error banner rendered above the fields. */
  banner?: React.ReactNode;
  /** Footer row (e.g. the link to the other auth page). */
  footer: React.ReactNode;
}

export default function AuthForm({
  title,
  subtitle,
  action,
  submitLabel,
  passwordAutoComplete,
  banner,
  footer,
}: AuthFormProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-12 sm:px-6">
      <div className="w-full max-w-sm rounded-2xl border-2 border-brand/35 bg-[#15121e] p-6 shadow-[0_0_32px_-4px_var(--color-brand)] sm:p-8">
        <div className="mb-6 flex flex-col items-center text-center">
          <KiroGhost size={52} className="text-brand" />
          <h2 className="mt-3 font-display text-2xl font-semibold tracking-tight text-foreground">
            {title}
          </h2>
          <p className="mt-1 text-sm text-foreground/70">{subtitle}</p>
        </div>

        {banner}

        <form action={action} className="flex flex-col gap-4">
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
              autoComplete={passwordAutoComplete}
              required
              minLength={6}
              className="min-h-11 rounded-lg border border-foreground/15 bg-black/30 px-3 text-sm text-foreground placeholder:text-foreground/40 outline-none focus:border-brand focus:ring-2 focus:ring-brand/40"
              placeholder="At least 6 characters"
            />
          </div>

          <button
            type="submit"
            className="mt-2 min-h-11 rounded-lg bg-brand px-4 text-sm font-semibold text-white transition-colors hover:bg-brand/90 active:bg-brand/80"
          >
            {submitLabel}
          </button>
        </form>

        <div className="mt-5 text-center text-sm text-foreground/60">{footer}</div>
      </div>
    </div>
  );
}
