"use client";

/**
 * PullScreen orchestrates the interactive pull experience: the ghost vessel
 * (GhostVessel or its reduced-motion fallback), the pull controls, and the
 * result reveal modal. This is the client-side island rendered by
 * app/page.tsx (a Server Component) so that only the interactive pieces
 * ship as client code (see design.md > "Layering").
 *
 * Sequencing (design.md > "Frontend / UX Design", Requirement 2.2):
 *   1. PullControls calls the server and fires `onPullSuccess` with the
 *      awarded items.
 *   2. This screen sets `tier` to the HIGHEST awarded tier (batch pulls use
 *      the best result to drive the pre-reveal color), which starts the
 *      ghost vessel's charge-up + open animation.
 *   3. When the vessel's `onOpenComplete` fires, a modal appears showing the
 *      ResultReveal content (rarity color first, then idea text per the
 *      stagger).
 *   4. After a short auto-dismiss timer (or on user tap), the modal fades
 *      out, the vessel resets to idle, and the player is ready for the next
 *      pull.
 *
 * Exactly one of GhostVessel / GhostReducedMotion is mounted at a time, chosen
 * by `useReducedMotion()`, so the charge/reveal/sparkle motion is skipped
 * entirely when the user prefers reduced motion (Requirement 7.3).
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

import { useSound } from "@/components/audio/useSound";
import GhostVessel from "@/components/pull/GhostVessel";
import GhostReducedMotion from "@/components/pull/GhostReducedMotion";
import PullControls from "@/components/pull/PullControls";
import ResultReveal from "@/components/pull/ResultReveal";
import { PITY_THRESHOLD } from "@/lib/pull/types";
import type { PullResultItem, RarityTier } from "@/lib/pull/types";

/** Auto-dismiss delay: longer for batch (10 cards to scan) vs single. */
const DISMISS_MS_SINGLE = 4000;
const DISMISS_MS_BATCH = 7000;

/** Ranks tiers so the highest-rarity result can drive the chest's pre-reveal color. */
const TIER_RANK: Record<RarityTier, number> = {
  common: 0,
  rare: 1,
  super_rare: 2,
};

/** Highest tier among a pull's results (single pulls have exactly one item). */
function highestTier(items: PullResultItem[]): RarityTier {
  return items.reduce<RarityTier>(
    (best, item) => (TIER_RANK[item.tier] > TIER_RANK[best] ? item.tier : best),
    items[0].tier,
  );
}

const ERROR_MESSAGES: Record<string, { title: string; detail: string }> = {
  unauthenticated: {
    title: "Sign-in required",
    detail: "Sign in to pull for an idea.",
  },
  "config-error": {
    title: "Pull rates unavailable",
    detail: "Pull rates are misconfigured on our end. Try again in a moment.",
  },
  "catalog-error": {
    title: "No ideas available",
    detail: "The idea catalog is empty right now. Try again in a moment.",
  },
  "network-error": {
    title: "Connection lost",
    detail: "Couldn't reach the server. Check your connection and try again.",
  },
  internal: {
    title: "Pull failed",
    detail: "Something went wrong on our end. Try again in a moment.",
  },
};

const RETRY_HINT = "Tap Pull x1 or Pull x10 to try again.";

export default function PullScreen() {
  const prefersReducedMotion = useReducedMotion();
  const { playPull, playReveal } = useSound();
  const [tier, setTier] = useState<RarityTier | null>(null);
  const [pendingItems, setPendingItems] = useState<PullResultItem[] | null>(null);
  const [revealItems, setRevealItems] = useState<PullResultItem[] | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  // Latest pity counter (null until the first pull this session). Drives the
  // "pulls until a guaranteed Super Rare" meter below the controls.
  const [pity, setPity] = useState<number | null>(null);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** Dismiss the modal and reset the chest to idle. */
  const dismissReveal = useCallback(() => {
    if (dismissTimerRef.current) {
      clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = null;
    }
    setRevealItems(null);
    setPendingItems(null);
    setTier(null);
  }, []);

  /** Start the auto-dismiss countdown when items are revealed. */
  useEffect(() => {
    if (!revealItems) return;
    const delay =
      revealItems.length > 1 ? DISMISS_MS_BATCH : DISMISS_MS_SINGLE;
    dismissTimerRef.current = setTimeout(dismissReveal, delay);
    return () => {
      if (dismissTimerRef.current) {
        clearTimeout(dismissTimerRef.current);
        dismissTimerRef.current = null;
      }
    };
  }, [revealItems, dismissReveal]);

  const handlePullStart = useCallback(() => {
    setErrorCode(null);
    setRevealItems(null);
    setPendingItems(null);
    setTier(null);
    // Anticipation cue, fired on the tap itself (a user gesture, so the
    // AudioContext is allowed to start).
    playPull();
  }, [playPull]);

  const handlePullSuccess = useCallback(
    (result: { items: PullResultItem[]; pityAfter: number }) => {
      setErrorCode(null);
      setPendingItems(result.items);
      setTier(highestTier(result.items));
      setPity(result.pityAfter);
    },
    [],
  );

  const handlePullError = useCallback((error: string) => {
    setPendingItems(null);
    setRevealItems(null);
    setTier(null);
    setErrorCode(error);
  }, []);

  const errorContent = errorCode
    ? ERROR_MESSAGES[errorCode] ?? ERROR_MESSAGES.internal
    : null;

  const handleOpenComplete = useCallback(() => {
    setRevealItems(pendingItems);
    // Reveal cue escalates with the best tier in the pull (matching the
    // pre-reveal aura color the vessel just showed).
    if (pendingItems && pendingItems.length > 0) {
      playReveal(highestTier(pendingItems));
    }
  }, [pendingItems, playReveal]);

  // Keyed by the current tier so each pull remounts the vessel: this restarts
  // the charge/reveal sequence cleanly (handlePullStart always resets tier to
  // null first, so the key toggles idle <-> tier on every pull).
  const vesselKey = tier ?? "idle";
  const vessel = prefersReducedMotion ? (
    <GhostReducedMotion
      key={vesselKey}
      tier={tier}
      onOpenComplete={handleOpenComplete}
    />
  ) : (
    <GhostVessel
      key={vesselKey}
      tier={tier}
      onOpenComplete={handleOpenComplete}
    />
  );

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center gap-7 px-4 py-8 sm:px-6 sm:py-10">
      <motion.div
        className="w-full"
        initial={prefersReducedMotion ? false : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
      >
        {vessel}
      </motion.div>

      <motion.div
        className="w-full"
        initial={prefersReducedMotion ? false : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
      >
        <PullControls
          onPullStart={handlePullStart}
          onPullSuccess={handlePullSuccess}
          onPullError={handlePullError}
        />
      </motion.div>

      {/* Pity meter: appears once the user has pulled this session. Shows real
       * game state (progress toward the guaranteed Super Rare at the pity
       * threshold), so the bar communicates meaning rather than decoration. */}
      {pity !== null ? (
        <div className="w-full max-w-xs">
          <div className="mb-1.5 flex items-center justify-between text-xs text-foreground/60">
            <span>Guaranteed Super Rare</span>
            <span className="font-medium text-foreground/80">
              {Math.max(0, PITY_THRESHOLD - pity)} pulls left
            </span>
          </div>
          <div
            className="h-1.5 w-full overflow-hidden rounded-full bg-white/8"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={PITY_THRESHOLD}
            aria-valuenow={Math.min(pity, PITY_THRESHOLD)}
            aria-label="Progress toward a guaranteed Super Rare"
          >
            <div
              className="h-full rounded-full bg-rarity-super-rare transition-[width] duration-500"
              style={{
                width: `${Math.min(100, (pity / PITY_THRESHOLD) * 100)}%`,
              }}
            />
          </div>
        </div>
      ) : null}

      <AnimatePresence>
        {errorContent ? (
          <motion.div
            role="alert"
            className="flex w-full max-w-sm flex-col gap-1 rounded-xl border border-rarity-rare/50 bg-[#15121e] p-4 text-center"
            initial={prefersReducedMotion ? false : { opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={prefersReducedMotion ? undefined : { opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
            <p className="text-sm font-semibold text-rarity-rare">
              {errorContent.title}
            </p>
            <p className="text-sm text-foreground/80">{errorContent.detail}</p>
            <p className="mt-1 text-xs font-medium text-foreground/60">
              {RETRY_HINT}
            </p>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* Result modal overlay: appears after the chest opens, auto-dismisses
       * after a few seconds (or on tap), then resets the chest to idle. */}
      <AnimatePresence>
        {revealItems ? (
          <motion.div
            key="reveal-modal"
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={prefersReducedMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={prefersReducedMotion ? undefined : { opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
            {/* Backdrop scrim */}
            <div
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
              onClick={dismissReveal}
              aria-hidden="true"
            />

            {/* Modal content */}
            <motion.div
              className="relative z-10 w-full max-w-sm max-h-[80vh] overflow-y-auto rounded-2xl border border-foreground/10 bg-[#12101a] p-5 shadow-xl sm:max-w-md sm:p-6"
              initial={prefersReducedMotion ? false : { scale: 0.92, y: 24 }}
              animate={{ scale: 1, y: 0 }}
              exit={prefersReducedMotion ? undefined : { scale: 0.92, y: 24, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              role="dialog"
              aria-label="Pull results"
              onClick={dismissReveal}
            >
              <ResultReveal items={revealItems} />
              <p className="mt-4 text-center text-xs text-foreground/50">
                Tap anywhere to close
              </p>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
