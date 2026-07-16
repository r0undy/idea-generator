/**
 * History view (RSC).
 *
 * Reads the authenticated User's `Pull_History`, joined with `project_ideas`
 * for idea content, ordered most-recent-first, and renders `HistoryList`
 * when there are entries or `EmptyHistory` when there are none. RLS already
 * scopes `pull_history` to `user_id = auth.uid()` via the session-aware
 * client (lib/supabase/server.ts's `createClient()`), so no explicit
 * `user_id` filter is required for correctness — it is still useful here to
 * detect the unauthenticated case up front.
 *
 * Requirements: 6.1 (idea content + tier + timestamp), 6.2 (most-recent-
 * first ordering), 6.3 (empty-history state).
 */

import Link from "next/link";

import EmptyHistory from "@/components/history/EmptyHistory";
import HistoryList, { type HistoryEntry } from "@/components/history/HistoryList";
import { createClient } from "@/lib/supabase/server";

export default async function HistoryPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center sm:px-6">
        <p className="text-sm text-foreground/70">
          Sign in to see your pull history.
        </p>
        <Link
          href="/"
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border border-rarity-rare/50 bg-rarity-rare/10 px-5 text-sm font-medium text-rarity-rare"
        >
          Back to pull screen
        </Link>
      </div>
    );
  }

  // pull_history.idea_id -> project_ideas.id (FK). Ordered by pulled_at
  // descending per Requirement 6.2 (most-recent-first).
  const { data, error } = await supabase
    .from("pull_history")
    .select("id, rarity_tier, pulled_at, project_ideas(title, description)")
    .order("pulled_at", { ascending: false });

  if (error) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center sm:px-6">
        <p className="text-sm text-foreground/70">
          Couldn&apos;t load your history right now. Try again in a moment.
        </p>
      </div>
    );
  }

  const entries: HistoryEntry[] = (data ?? []).map((row) => {
    // The generated relationship type models `project_ideas` as an array
    // for a to-many join; a `pull_history` row always has exactly one
    // related `project_ideas` row via its `idea_id` FK; Supabase returns it
    // as a single object at runtime for a to-one join, but we defensively
    // handle both shapes here.
    const idea = Array.isArray(row.project_ideas)
      ? row.project_ideas[0]
      : row.project_ideas;

    return {
      id: row.id,
      tier: row.rarity_tier as HistoryEntry["tier"],
      pulledAt: row.pulled_at,
      title: idea?.title ?? "Unknown idea",
      description: idea?.description ?? "",
    };
  });

  return (
    <div className="flex flex-1 flex-col gap-6 px-4 py-10 sm:px-6">
      <h1 className="text-center font-display text-2xl font-semibold tracking-wide sm:text-3xl">
        Pull History
      </h1>
      <div className="mx-auto w-full max-w-lg">
        {entries.length === 0 ? (
          <EmptyHistory />
        ) : (
          <HistoryList entries={entries} />
        )}
      </div>
    </div>
  );
}
