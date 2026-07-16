"use client";

/**
 * GhostReducedMotion
 *
 * Static counterpart to GhostVessel for users who prefer reduced motion. It
 * keeps the same contract (`tier`, `onOpenComplete`) but skips all animation:
 * the ghost simply tints to the awarded Rarity_Color and, after a short,
 * fixed delay, fires `onOpenComplete` once so the reveal can proceed. No
 * float, no charge pulse, no sparkle burst.
 *
 * Exactly one of GhostVessel / GhostReducedMotion is mounted at a time (chosen
 * by `useReducedMotion()` in PullScreen).
 */

import { useEffect } from "react";

import KiroGhost from "@/components/brand/KiroGhost";
import type { RarityTier } from "@/lib/pull/types";

const RARITY_HEX: Record<RarityTier, string> = {
  common: "#c7cdd6",
  rare: "#a56cf0",
  super_rare: "#f2c14e",
};

const BRAND_HEX = "#ff5fa8";

/** Short, static delay before the reveal (no charge/open animation to time). */
const REVEAL_DELAY_MS = 400;

export interface GhostReducedMotionProps {
  tier: RarityTier | null;
  onOpenComplete: () => void;
}

export default function GhostReducedMotion({
  tier,
  onOpenComplete,
}: GhostReducedMotionProps) {
  useEffect(() => {
    if (tier === null) return;
    const timer = setTimeout(onOpenComplete, REVEAL_DELAY_MS);
    return () => clearTimeout(timer);
  }, [tier, onOpenComplete]);

  const color = tier ? RARITY_HEX[tier] : BRAND_HEX;

  return (
    <div className="relative mx-auto aspect-square w-full max-w-xs">
      <div
        aria-hidden="true"
        className="absolute inset-[18%] rounded-full blur-2xl"
        style={{ backgroundColor: color, opacity: tier ? 0.75 : 0.4 }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-x-[22%] bottom-[14%] h-6 rounded-[100%] bg-black/40 blur-md"
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <KiroGhost
          size={140}
          expression={tier ? "happy" : "idle"}
          className="drop-shadow-[0_8px_24px_rgba(0,0,0,0.45)]"
          style={{ color }}
        />
      </div>
    </div>
  );
}
