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
import HistoryPagination from "@/components/history/HistoryPagination";
import { createClient } from "@/lib/supabase/server";

/** Rows per page. Kept small so a page of cards fits comfortably on mobile. */
const PAGE_SIZE = 10;

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
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

  const params = await searchParams;
  const requestedPage = Number.parseInt(params.page ?? "1", 10);
  const currentPage =
    Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const from = (currentPage - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  // pull_history.idea_id -> project_ideas.id (FK). Ordered by pulled_at
  // descending per Requirement 6.2 (most-recent-first). `count: "exact"` +
  // `.range()` gives us both the page of rows and the total row count in one
  // query, which is all pagination needs.
  const { data, error, count } = await supabase
    .from("pull_history")
    .select(
      "id, idea_id, rarity_tier, pulled_at, project_ideas(id, title, description)",
      { count: "exact" },
    )
    .order("pulled_at", { ascending: false })
    .range(from, to);

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
      ideaId: idea?.id ?? row.idea_id,
      tier: row.rarity_tier as HistoryEntry["tier"],
      pulledAt: row.pulled_at,
      title: idea?.title ?? "Unknown idea",
      description: idea?.description ?? "",
    };
  });

  const totalCount = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  // A page number past the last real page (e.g. from a stale bookmark after
  // history shrinks) still renders cleanly: no rows, pagination clamps links.
  const safePage = Math.min(currentPage, totalPages);

  return (
    <div className="flex flex-1 flex-col gap-6 px-4 py-10 sm:px-6">
      <h1 className="text-center font-display text-2xl font-semibold tracking-wide sm:text-3xl">
        Pull History
      </h1>
      <div className="mx-auto flex w-full max-w-lg flex-col gap-6">
        {entries.length === 0 ? (
          <EmptyHistory />
        ) : (
          <>
            <HistoryList entries={entries} />
            <HistoryPagination currentPage={safePage} totalPages={totalPages} />
          </>
        )}
      </div>
    </div>
  );
}
