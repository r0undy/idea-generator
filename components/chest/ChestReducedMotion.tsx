/**
 * ChestReducedMotion is the static, non-animated stand-in for Chest3D used
 * whenever the user's device signals `prefers-reduced-motion: reduce`
 * (Requirement 7.3 / Reduced_Motion_Mode).
 *
 * This is a plain presentational component -- no animation, no timers, no
 * "use client" requirement of its own beyond what the parent needs. It must
 * never be rendered alongside Chest3D; the caller decides which one to mount
 * (see the `useReducedMotion` check exported below) so the Three.js bundle
 * is never loaded when reduced motion is preferred.
 *
 * Mirrors Chest3D's tier prop so callers can swap between the two
 * components without changing how the result is sequenced: passing a tier
 * shows the rarity badge/color immediately (no charge-up beat, since motion
 * is disabled), and `onOpenComplete` fires once on mount when a tier is
 * present so result sequencing still works without an animation to wait on.
 */

"use client";

import { useEffect, useRef } from "react";
import type { RarityTier } from "@/lib/pull/types";

const RARITY_LABEL: Record<RarityTier, string> = {
  common: "Common",
  rare: "Rare",
  super_rare: "Super Rare",
};

const RARITY_BADGE_CLASS: Record<RarityTier, string> = {
  common: "bg-rarity-common text-black",
  rare: "bg-rarity-rare text-white",
  super_rare: "bg-rarity-super-rare text-black",
};

export interface ChestReducedMotionProps {
  /** Awarded rarity tier; null = idle, no result yet. */
  tier: RarityTier | null;
  /** Fires once (synchronously, on mount/update) when a tier becomes available. */
  onOpenComplete: () => void;
  /** Optional tap handler so this can also serve as the primary tap target. */
  onTap?: () => void;
  disabled?: boolean;
}

export default function ChestReducedMotion({
  tier,
  onOpenComplete,
  onTap,
  disabled = false,
}: ChestReducedMotionProps) {
  const firedRef = useRef(false);

  useEffect(() => {
    if (tier === null) {
      firedRef.current = false;
      return;
    }
    if (!firedRef.current) {
      firedRef.current = true;
      onOpenComplete();
    }
  }, [tier, onOpenComplete]);

  const content = (
    <div className="flex aspect-square w-full max-w-xs mx-auto flex-col items-center justify-center gap-3 rounded-2xl border-2 border-brand/30 bg-[#15121e] p-6 text-center shadow-[0_0_24px_-6px_var(--color-brand)]">
      <div
        aria-hidden="true"
        className={`flex h-16 w-16 items-center justify-center rounded-full border-4 text-2xl ${
          tier
            ? `border-white/20 ${RARITY_BADGE_CLASS[tier]}`
            : "border-brand/50 bg-brand/15"
        }`}
      >
        {!tier ? <span aria-hidden="true">🎁</span> : null}
      </div>
      <p className="font-display text-sm font-semibold uppercase tracking-wide text-foreground/80">
        {tier ? RARITY_LABEL[tier] : "Chest ready"}
      </p>
    </div>
  );

  if (!onTap) {
    return (
      <div role="img" aria-label={tier ? `Chest result: ${RARITY_LABEL[tier]}` : "Closed chest"}>
        {content}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onTap}
      disabled={disabled}
      aria-label="Tap to open the chest"
      className="block w-full min-h-11 min-w-11 rounded-2xl disabled:cursor-not-allowed disabled:opacity-70"
    >
      {content}
    </button>
  );
}
