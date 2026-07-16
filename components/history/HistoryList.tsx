/**
 * HistoryList
 *
 * Renders a User's `Pull_History` entries as a mobile-first, single-column
 * list of spaced cards (matching the dark panel + rarity-tinted-border
 * treatment established by ResultReveal). Each entry shows the awarded
 * Project_Idea content, its Rarity_Tier (with color), and its pull
 * timestamp, per design.md > "Frontend / UX Design" > "History view".
 *
 * Requirements: 6.1 (idea content + tier + timestamp), 6.2 (most-recent-
 * first ordering is the caller's responsibility — this component renders
 * entries in the order it receives them).
 *
 * Reuses the `bg-rarity-*` / `border-rarity-*` / `text-rarity-*` tokens from
 * app/globals.css. No new colors are introduced here.
 */

import type { RarityTier } from "@/lib/pull/types";

export interface HistoryEntry {
  id: string;
  tier: RarityTier;
  pulledAt: string;
  title: string;
  description: string;
}

export interface HistoryListProps {
  /** Entries ordered most-recent-first by the caller. */
  entries: HistoryEntry[];
}

interface TierStyle {
  label: string;
  badgeBg: string;
  border: string;
  text: string;
}

const TIER_STYLES: Record<RarityTier, TierStyle> = {
  common: {
    label: "Common",
    badgeBg: "bg-rarity-common",
    border: "border-rarity-common/40",
    text: "text-rarity-common",
  },
  rare: {
    label: "Rare",
    badgeBg: "bg-rarity-rare",
    border: "border-rarity-rare/60",
    text: "text-rarity-rare",
  },
  super_rare: {
    label: "Super Rare",
    badgeBg: "bg-rarity-super-rare",
    border: "border-rarity-super-rare/90",
    text: "text-rarity-super-rare",
  },
};

const timestampFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});

function formatPulledAt(pulledAt: string): string {
  const date = new Date(pulledAt);
  if (Number.isNaN(date.getTime())) {
    return pulledAt;
  }
  return timestampFormatter.format(date);
}

export default function HistoryList({ entries }: HistoryListProps) {
  return (
    <ul role="list" className="flex w-full flex-col gap-3">
      {entries.map((entry) => {
        const style = TIER_STYLES[entry.tier];
        const borderWidthClass =
          entry.tier === "super_rare"
            ? "border-[3px]"
            : entry.tier === "rare"
              ? "border-2"
              : "border";

        return (
          <li key={entry.id}>
            <div
              className={[
                "flex items-start gap-3 rounded-xl bg-[#15121e] p-4",
                borderWidthClass,
                style.border,
              ].join(" ")}
            >
              <div
                className={`mt-1 h-3 w-3 flex-none rounded-full ${style.badgeBg}`}
                aria-hidden="true"
              />
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <h3 className="text-base font-semibold text-foreground">
                    {entry.title}
                  </h3>
                  <span
                    className={`text-xs font-semibold tracking-wide uppercase ${style.text}`}
                  >
                    {style.label}
                  </span>
                </div>
                <p className="text-sm text-foreground/80">
                  {entry.description}
                </p>
                <time
                  dateTime={entry.pulledAt}
                  className="text-xs text-foreground/50"
                >
                  {formatPulledAt(entry.pulledAt)}
                </time>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
