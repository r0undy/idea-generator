/**
 * LeaderboardList
 *
 * Ranked players as an opaque, high-contrast list. Taste read: dark-locked
 * consumer UI, brand-pink accent plus the existing rarity palette, one
 * corner-radius scale (rounded-2xl), clear hierarchy (name = full contrast,
 * secondary labels stay >= WCAG AA), and a self-contained gold/silver/bronze
 * podium for the top three. The signed-in user's row is a solid brand-tinted
 * card with a "You" chip, never transparent.
 */

import { Medal } from "@phosphor-icons/react/dist/ssr";

import type { LeaderboardEntry } from "@/lib/leaderboard/rank";

export interface LeaderboardListProps {
  entries: LeaderboardEntry[];
  /** The signed-in user's id, so their row can be highlighted. */
  currentUserId: string;
}

interface Medalist {
  ring: string;
  text: string;
  bg: string;
  glow: string;
}

/** Podium colors: gold / silver / bronze. Gold and silver reuse rarity tokens. */
const MEDAL: Record<1 | 2 | 3, Medalist> = {
  1: {
    ring: "ring-rarity-super-rare/60",
    text: "text-rarity-super-rare",
    bg: "bg-rarity-super-rare/15",
    glow: "shadow-[0_0_22px_-8px_var(--color-rarity-super-rare)]",
  },
  2: {
    ring: "ring-rarity-common/60",
    text: "text-rarity-common",
    bg: "bg-rarity-common/15",
    glow: "",
  },
  3: {
    ring: "ring-[#d08b52]/60",
    text: "text-[#d08b52]",
    bg: "bg-[#d08b52]/15",
    glow: "",
  },
};

export default function LeaderboardList({
  entries,
  currentUserId,
}: LeaderboardListProps) {
  return (
    <ul role="list" className="flex w-full flex-col gap-2.5">
      {entries.map((entry) => {
        const isYou = entry.id === currentUserId;
        const medal =
          entry.rank <= 3 ? MEDAL[entry.rank as 1 | 2 | 3] : null;

        return (
          <li key={entry.id}>
            <div
              className={[
                "flex items-center gap-3.5 rounded-2xl border p-3.5 sm:p-4",
                isYou
                  ? "border-brand/60 bg-[#241327]"
                  : "border-white/10 bg-[#181423]",
                medal?.glow ?? "",
              ].join(" ")}
            >
              {/* Rank / medal */}
              <span
                className={[
                  "flex h-11 w-11 flex-none items-center justify-center rounded-full text-base font-bold ring-1",
                  medal
                    ? `${medal.bg} ${medal.text} ${medal.ring}`
                    : "bg-white/10 text-foreground ring-white/10",
                ].join(" ")}
                aria-hidden="true"
              >
                {medal ? <Medal size={22} weight="fill" /> : entry.rank}
              </span>

              {/* Name */}
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <span className="truncate text-[15px] font-semibold text-foreground">
                  {entry.name}
                </span>
                {isYou ? (
                  <span className="flex-none rounded-full bg-brand px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                    You
                  </span>
                ) : null}
              </div>

              {/* Idea count */}
              <div className="flex flex-none items-baseline gap-1">
                <span className="text-xl font-bold tabular-nums text-foreground">
                  {entry.count}
                </span>
                <span className="text-xs font-medium text-foreground/70">
                  {entry.count === 1 ? "idea" : "ideas"}
                </span>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
