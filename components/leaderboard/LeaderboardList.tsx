/**
 * LeaderboardList
 *
 * Ranked players as a mobile-first list of solid (opaque) cards. The top three
 * ranks get a medal-colored badge drawn from the existing rarity palette
 * (gold / silver) plus the brand accent for third, so no new colors are
 * introduced; rank 1 also gets a soft gold glow. The signed-in user's own row
 * is highlighted with a solid brand-tinted background, a brand border, and a
 * "You" chip.
 */

import { Medal } from "@phosphor-icons/react/dist/ssr";

import type { LeaderboardEntry } from "@/lib/leaderboard/rank";

export interface LeaderboardListProps {
  entries: LeaderboardEntry[];
  /** The signed-in user's id, so their row can be highlighted. */
  currentUserId: string;
}

/** Badge styling per rank: 1 gold, 2 silver, 3 brand, rest neutral. */
function rankBadgeClass(rank: number): string {
  if (rank === 1)
    return "bg-rarity-super-rare/20 text-rarity-super-rare ring-1 ring-rarity-super-rare/50";
  if (rank === 2)
    return "bg-rarity-common/20 text-rarity-common ring-1 ring-rarity-common/50";
  if (rank === 3) return "bg-brand/20 text-brand ring-1 ring-brand/50";
  return "bg-white/10 text-foreground/70";
}

export default function LeaderboardList({
  entries,
  currentUserId,
}: LeaderboardListProps) {
  return (
    <ul role="list" className="flex w-full flex-col gap-2">
      {entries.map((entry) => {
        const isYou = entry.id === currentUserId;
        const isTop = entry.rank <= 3;

        return (
          <li key={entry.id}>
            <div
              className={[
                "flex items-center gap-3 rounded-xl border p-3 sm:p-4",
                isYou
                  ? "border-brand/60 bg-[#241327]"
                  : "border-foreground/10 bg-[#15121e]",
                entry.rank === 1
                  ? "shadow-[0_0_20px_-6px_var(--color-rarity-super-rare)]"
                  : "",
              ].join(" ")}
            >
              <span
                className={`flex h-10 w-10 flex-none items-center justify-center rounded-full text-sm font-bold ${rankBadgeClass(
                  entry.rank,
                )}`}
                aria-hidden="true"
              >
                {isTop ? <Medal size={20} weight="fill" /> : entry.rank}
              </span>

              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-semibold text-foreground">
                    {entry.name}
                  </span>
                  {isYou ? (
                    <span className="flex-none rounded-full bg-brand/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand">
                      You
                    </span>
                  ) : null}
                </div>
                <span className="text-xs text-foreground/50">
                  Rank #{entry.rank}
                </span>
              </div>

              <span className="flex flex-none flex-col items-end leading-tight">
                <span className="text-lg font-bold text-foreground">
                  {entry.count}
                </span>
                <span className="text-[10px] uppercase tracking-wide text-foreground/50">
                  {entry.count === 1 ? "idea" : "ideas"}
                </span>
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
