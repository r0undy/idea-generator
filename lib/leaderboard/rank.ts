/**
 * Leaderboard ranking.
 *
 * Pure function that turns a set of users and their idea counts into a ranked
 * list, highest idea count first. Ties share the same rank (standard
 * competition ranking: 1, 2, 2, 4) and are ordered by name for a stable,
 * deterministic result. Kept dependency-free so it is easy to unit-test apart
 * from Supabase.
 */

export interface LeaderboardUser {
  id: string;
  /** Display name (e.g. the local part of the user's email). */
  name: string;
}

export interface LeaderboardEntry extends LeaderboardUser {
  count: number;
  rank: number;
}

export function rankLeaderboard(
  users: LeaderboardUser[],
  countsByUser: Record<string, number>,
): LeaderboardEntry[] {
  const withCounts = users.map((u) => ({
    ...u,
    count: countsByUser[u.id] ?? 0,
  }));

  withCounts.sort(
    (a, b) => b.count - a.count || a.name.localeCompare(b.name),
  );

  let lastCount: number | null = null;
  let lastRank = 0;

  return withCounts.map((entry, index) => {
    const rank =
      lastCount !== null && entry.count === lastCount ? lastRank : index + 1;
    lastCount = entry.count;
    lastRank = rank;
    return { id: entry.id, name: entry.name, count: entry.count, rank };
  });
}
