"use client";

/**
 * GhostVessel
 *
 * The interactive centerpiece of the pull experience: the Kiro ghost mascot as
 * the "vessel" that charges up in the awarded Rarity_Color and then reveals the
 * result. It replaces the earlier 3D treasure chest but keeps the exact same
 * contract so PullScreen's wiring is unchanged:
 *
 *   - `tier === null` (idle): the ghost floats calmly with a soft pink brand
 *     aura and no rarity color yet.
 *   - `tier !== null` (charge-up): the aura swells to the Rarity_Color
 *     (silver / purple / gold) with an anticipation pulse, communicating rarity
 *     BEFORE the idea is shown. For a batch pull the caller passes the highest
 *     tier so the pre-reveal color reflects the best result.
 *   - After `CHARGE_UP_MS`, the vessel "opens": a reveal burst flashes, the
 *     ghost switches to a happy expression, and (for super_rare only) sparkle
 *     particles fan out. When the open beat finishes, `onOpenComplete` fires
 *     exactly once so the caller can show the ResultReveal content.
 *   - Setting `tier` back to `null` resets to idle.
 *
 * Motion is motivated, not decorative: the aura color is feedback (previews an
 * already-determined rarity) and the open burst is a state transition (reveal
 * complete). This component is only mounted when motion is allowed;
 * GhostReducedMotion is the static counterpart (see PullScreen).
 */

import { useEffect, useState } from "react";
import { motion, type Variants } from "motion/react";

import KiroGhost from "@/components/brand/KiroGhost";
import type { RarityTier } from "@/lib/pull/types";

/** Rarity aura color, matching the rarity tokens in globals.css. */
const RARITY_HEX: Record<RarityTier, string> = {
  common: "#c7cdd6",
  rare: "#a56cf0",
  super_rare: "#f2c14e",
};

/** Idle aura uses the pink brand accent (distinct from the rarity system). */
const BRAND_HEX = "#ff5fa8";

/** How long (ms) the vessel charges before it opens. Matches the old chest. */
const CHARGE_UP_MS = 900;
/** How long (ms) the open/reveal burst runs before onOpenComplete fires. */
const OPEN_ANIMATION_MS = 700;

type Phase = "idle" | "charging" | "opening" | "open";

export interface GhostVesselProps {
  /** Awarded rarity tier driving the pre-open aura; null = idle, no color yet. */
  tier: RarityTier | null;
  /** Fires exactly once when the open animation finishes. */
  onOpenComplete: () => void;
}

/** Fixed sparkle offsets (deg, distance) so super_rare bursts read as a fan. */
const SPARKLES = [
  { angle: -90, dist: 96 },
  { angle: -50, dist: 82 },
  { angle: -20, dist: 100 },
  { angle: 20, dist: 86 },
  { angle: 55, dist: 98 },
  { angle: 130, dist: 80 },
  { angle: 160, dist: 92 },
  { angle: -140, dist: 84 },
];

export default function GhostVessel({ tier, onOpenComplete }: GhostVesselProps) {
  // The vessel is remounted per pull (via a `key` on the parent), so the
  // initial phase is derived once from `tier`: "charging" when a tier is
  // already awarded at mount, "idle" otherwise. This avoids setState during
  // render / in an effect body while still starting in the right state.
  const [phase, setPhase] = useState<Phase>(() =>
    tier === null ? "idle" : "charging",
  );

  // After a tier is awarded, advance charging -> opening -> open on timers and
  // fire onOpenComplete once when the open beat finishes. (These setState calls
  // live in timer callbacks, not the effect body, so they don't cascade.)
  useEffect(() => {
    if (tier === null) return;
    const timers: ReturnType<typeof setTimeout>[] = [];

    timers.push(
      setTimeout(() => {
        setPhase("opening");
        timers.push(
          setTimeout(() => {
            setPhase("open");
            onOpenComplete();
          }, OPEN_ANIMATION_MS),
        );
      }, CHARGE_UP_MS),
    );

    return () => timers.forEach(clearTimeout);
  }, [tier, onOpenComplete]);

  const auraColor = tier ? RARITY_HEX[tier] : BRAND_HEX;
  const isOpen = phase === "opening" || phase === "open";
  const showSparkles = tier === "super_rare" && isOpen;

  const auraVariants: Variants = {
    idle: { backgroundColor: BRAND_HEX, opacity: 0.4, scale: 1 },
    charging: {
      backgroundColor: auraColor,
      opacity: [0.5, 0.95, 0.7],
      scale: [1, 1.14, 1.05],
      transition: {
        duration: CHARGE_UP_MS / 1000,
        ease: "easeInOut",
        times: [0, 0.6, 1],
      },
    },
    opening: {
      backgroundColor: auraColor,
      opacity: [0.7, 1, 0.85],
      scale: [1.05, 1.5, 1.28],
      transition: { duration: OPEN_ANIMATION_MS / 1000, ease: "easeOut" },
    },
    open: { backgroundColor: auraColor, opacity: 0.85, scale: 1.28 },
  };

  const ghostVariants: Variants = {
    idle: { scale: 1, rotate: 0 },
    charging: {
      scale: [1, 1.05, 1],
      rotate: [0, -2.5, 2.5, 0],
      transition: {
        duration: 0.35,
        ease: "easeInOut",
        repeat: Math.ceil(CHARGE_UP_MS / 350),
      },
    },
    opening: {
      scale: [1, 1.18, 1.1],
      rotate: 0,
      transition: { duration: OPEN_ANIMATION_MS / 1000, ease: "easeOut" },
    },
    open: { scale: 1.1, rotate: 0 },
  };

  return (
    <div className="relative mx-auto aspect-square w-full max-w-xs">
      {/* Rarity aura: a blurred color field behind the ghost. Animating only
       * backgroundColor / opacity / transform keeps it on the compositor. */}
      <motion.div
        aria-hidden="true"
        className="absolute inset-[18%] rounded-full blur-2xl"
        variants={auraVariants}
        initial="idle"
        animate={phase}
      />

      {/* Ground spotlight so the ghost never reads as floating in a void. */}
      <div
        aria-hidden="true"
        className="absolute inset-x-[22%] bottom-[14%] h-6 rounded-[100%] bg-black/40 blur-md"
      />

      {/* The ghost. Outer wrapper does the perpetual gentle float (CSS, reduced
       * -motion gated); inner Motion element handles phase-driven scale/wiggle. */}
      <div className="ghost-float absolute inset-0 flex items-center justify-center">
        <motion.div
          variants={ghostVariants}
          initial="idle"
          animate={phase}
          className="relative"
        >
          <KiroGhost
            size={140}
            expression={isOpen ? "happy" : "idle"}
            className="drop-shadow-[0_8px_24px_rgba(0,0,0,0.45)]"
            style={{ color: auraColor }}
          />
        </motion.div>
      </div>

      {/* Super-rare celebration: sparkle particles fanning out on reveal. */}
      {showSparkles
        ? SPARKLES.map((s, i) => {
            const rad = (s.angle * Math.PI) / 180;
            return (
              <motion.span
                key={i}
                aria-hidden="true"
                className="absolute left-1/2 top-1/2 h-2 w-2 rounded-full bg-rarity-super-rare"
                initial={{ opacity: 0, scale: 0.4, x: 0, y: 0 }}
                animate={{
                  opacity: [0, 1, 0],
                  scale: [0.4, 1.1, 0.6],
                  x: Math.cos(rad) * s.dist,
                  y: Math.sin(rad) * s.dist,
                }}
                transition={{
                  duration: 0.9,
                  delay: 0.05 + (i % 4) * 0.04,
                  ease: "easeOut",
                }}
              />
            );
          })
        : null}
    </div>
  );
}
