/**
 * EmptyHistory
 *
 * Shown when the authenticated User has zero `pull_history` rows.
 * Requirements: 6.3 (empty-history state).
 */

import Link from "next/link";

export default function EmptyHistory() {
  return (
    <div className="mx-auto flex w-full max-w-sm flex-col items-center gap-4 rounded-xl border border-foreground/10 bg-[#15121e] px-6 py-10 text-center">
      <div
        className="h-12 w-12 flex-none rounded-full bg-foreground/10"
        aria-hidden="true"
      />
      <p className="text-sm text-foreground/70">
        No pulls yet. Open the chest to get your first idea.
      </p>
      <Link
        href="/"
        className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border border-rarity-rare/50 bg-rarity-rare/10 px-5 text-sm font-medium text-rarity-rare"
      >
        Go pull
      </Link>
    </div>
  );
}
