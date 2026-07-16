/**
 * Sign-out control. A plain HTML form POSTing to the sign-out Route Handler
 * so it works without client JS, matching the rest of the auth flow's
 * server-action-first approach.
 */
export default function SignOutButton() {
  return (
    <form action="/auth/signout" method="post">
      <button
        type="submit"
        className="inline-flex min-h-11 items-center justify-center rounded-lg border border-foreground/15 bg-white/5 px-4 text-xs font-semibold uppercase tracking-wide text-foreground/70 transition-colors hover:bg-white/10 active:bg-white/15"
      >
        Sign out
      </button>
    </form>
  );
}
