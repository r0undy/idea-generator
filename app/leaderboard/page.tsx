/**
 * Leaderboard view (RSC).
 *
 * Ranks every authenticated user by how many ideas they have pulled (their
 * pull_history row count), most first. Building this needs data across all
 * users, which RLS deliberately hides from a normal session, so the aggregate
 * read uses the service-role client (server-only). Only a display name (the
 * local part of the email) and the count are sent to the client, never the
 * full email.
 *
 * Paginated via `?page=` using the shared Pagination component.
 */

import Link from "next/link";
import { Trophy } from "@phosphor-icons/react/dist/ssr";

import LeaderboardList from "@/components/leaderboard/LeaderboardList";
import Pagination from "@/components/ui/Pagination";
import { rankLeaderboard, type LeaderboardUser } from "@/lib/leaderboard/rank";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";

/** Players per page. */
const PAGE_SIZE = 10;
/** Safety cap on auth.admin.listUsers pagination (perPage 1000 * 20 = 20k). */
const LIST_PER_PAGE = 1000;
const LIST_MAX_PAGES = 20;

/**
 * Display name: the onboarding first + last name (from auth user_metadata) when
 * set, otherwise the email local part, otherwise a short id fallback.
 */
function displayName(
  metadata: Record<string, unknown> | undefined,
  email: string | undefined,
  id: string,
): string {
  const first = String(metadata?.first_name ?? "").trim();
  const last = String(metadata?.last_name ?? "").trim();
  const full = `${first} ${last}`.trim();
  if (full) return full;
  const local = email?.split("@")[0]?.trim();
  return local && local.length > 0 ? local : `Player ${id.slice(0, 6)}`;
}

export default async function LeaderboardPage({
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
          Sign in to see the leaderboard.
        </p>
        <Link
          href="/"
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border border-brand/50 bg-brand/10 px-5 text-sm font-medium text-brand"
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

  const users: LeaderboardUser[] = [];
  const countsByUser: Record<string, number> = {};

  try {
    const service = createServiceRoleClient();

    // All authenticated users (service-role admin API), paginated.
    for (let page = 1; page <= LIST_MAX_PAGES; page++) {
      const { data, error } = await service.auth.admin.listUsers({
        page,
        perPage: LIST_PER_PAGE,
      });
      if (error) throw error;
      const batch = data.users ?? [];
      users.push(
        ...batch.map((u) => ({
          id: u.id,
          name: displayName(
            u.user_metadata as Record<string, unknown> | undefined,
            u.email,
            u.id,
          ),
        })),
      );
      if (batch.length < LIST_PER_PAGE) break;
    }

    // Idea counts per user. Service role bypasses RLS so we can see all rows;
    // we only need user_id to tally.
    const { data: rows, error: rowsError } = await service
      .from("pull_history")
      .select("user_id");
    if (rowsError) throw rowsError;
    for (const row of rows ?? []) {
      countsByUser[row.user_id] = (countsByUser[row.user_id] ?? 0) + 1;
    }
  } catch {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center sm:px-6">
        <p className="text-sm text-foreground/70">
          Couldn&apos;t load the leaderboard right now. Try again in a moment.
        </p>
      </div>
    );
  }

  const ranked = rankLeaderboard(users, countsByUser);
  const totalPages = Math.max(1, Math.ceil(ranked.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const start = (safePage - 1) * PAGE_SIZE;
  const pageEntries = ranked.slice(start, start + PAGE_SIZE);

  return (
    <div className="flex flex-1 flex-col gap-6 px-4 py-10 sm:px-6">
      <div className="flex flex-col items-center text-center">
        <span
          className="mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-rarity-super-rare/15 text-rarity-super-rare ring-1 ring-rarity-super-rare/40"
          aria-hidden="true"
        >
          <Trophy size={26} weight="fill" />
        </span>
        <h1 className="font-display text-2xl font-semibold tracking-wide sm:text-3xl">
          Leaderboard
        </h1>
        <p className="mt-1 text-sm text-foreground/75">
          Ranked by ideas summoned. Keep pulling to climb.
        </p>
      </div>
      <div className="mx-auto flex w-full max-w-lg flex-col gap-6">
        <LeaderboardList entries={pageEntries} currentUserId={user.id} />
        <Pagination
          currentPage={safePage}
          totalPages={totalPages}
          basePath="/leaderboard"
          ariaLabel="Leaderboard pages"
        />
      </div>
    </div>
  );
}
