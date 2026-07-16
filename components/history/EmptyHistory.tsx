/**
 * EmptyHistory
 *
 * Shown when the authenticated User has zero `pull_history` rows.
 * Requirements: 6.3 (empty-history state).
 */

import Link from "next/link";

import KiroGhost from "@/components/brand/KiroGhost";

export default function EmptyHistory() {
  return (
    <div className="mx-auto flex w-full max-w-sm flex-col items-center gap-4 rounded-xl border border-foreground/10 bg-[#15121e] px-6 py-10 text-center">
      <KiroGhost size={48} className="text-brand/70" aria-hidden />
      <p className="text-sm text-foreground/70">
        No pulls yet. Summon the ghost to get your first idea.
      </p>
      <Link
        href="/"
        className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border border-brand/50 bg-brand/10 px-5 text-sm font-medium text-brand transition-colors hover:bg-brand/20"
      >
        Go pull
      </Link>
    </div>
  );
}
