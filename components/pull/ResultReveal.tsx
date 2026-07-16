"use client";

/**
 * ResultReveal
 *
 * Client-side presentation of a pull outcome. Renders single (1x) and
 * batch (10x) results, always showing the Rarity_Color before the idea
 * content per design.md > "Frontend / UX Design":
 *
 *   "the chest emits the Rarity_Color ... before opening to reveal the
 *   idea, so the color previews rarity."
 *
 * Requirements: 2.2 (color revealed before content, for both single and
 * batch results).
 *
 * Reuses `RarityTier` / `PullResultItem` from lib/pull/types.ts and the
 * `bg-rarity-*` / `border-rarity-*` / `text-rarity-*` Tailwind tokens from
 * app/globals.css. No new colors are introduced here.
 */

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion, type Variants } from "motion/react";
import { CaretLeft, CaretRight } from "@phosphor-icons/react";
import DownloadPrdButton from "@/components/prd/DownloadPrdButton";
import type { RarityTier, PullResultItem } from "@/lib/pull/types";

export interface ResultRevealProps {
  /** Awarded results in pull order. Length 1 for a single pull, 10 for a batch pull. */
  items: PullResultItem[];
}

interface TierStyle {
  label: string;
  badgeBg: string;
  border: string;
  text: string;
  glow: string;
}

/**
 * Visual weight increases with rarity: super_rare gets the thickest border
 * and strongest glow, common the least. Colors map 1:1 to the existing
 * rarity tokens (no new golds/purples invented here).
 */
const TIER_STYLES: Record<RarityTier, TierStyle> = {
  common: {
    label: "Common",
    badgeBg: "bg-rarity-common",
    border: "border-rarity-common/50",
    text: "text-rarity-common",
    glow: "shadow-[0_0_14px_-2px_var(--color-rarity-common)]",
  },
  rare: {
    label: "Rare",
    badgeBg: "bg-rarity-rare",
    border: "border-rarity-rare/70",
    text: "text-rarity-rare",
    glow: "shadow-[0_0_20px_-2px_var(--color-rarity-rare)]",
  },
  super_rare: {
    label: "Super Rare",
    badgeBg: "bg-rarity-super-rare",
    border: "border-rarity-super-rare",
    text: "text-rarity-super-rare",
    glow: "shadow-[0_0_28px_0px_var(--color-rarity-super-rare)]",
  },
};

/** A single card's own entrance, and the stagger that governs its children. */
const cardVariants: Variants = {
  hidden: { opacity: 0, y: 14 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.32,
      ease: "easeOut",
      staggerChildren: 0.16,
    },
  },
};

/** The color reveal (badge/orb): appears first within a card. */
const colorVariants: Variants = {
  hidden: { opacity: 0, scale: 0.55 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.3, ease: "easeOut" },
  },
};

/** The idea content: fades/slides in after the color, per card. */
const contentVariants: Variants = {
  hidden: { opacity: 0, y: 6 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: "easeOut" },
  },
};

interface RevealCardProps {
  item: PullResultItem;
  reducedMotion: boolean;
}

/**
 * A single result card: rarity orb, tier label, idea title, and a clamped
 * description (so the card stays a bounded height and the reveal modal never
 * needs a scrollbar on small screens), plus the PRD download.
 */
function RevealCard({ item, reducedMotion }: RevealCardProps) {
  const style = TIER_STYLES[item.tier];
  const isSuperRare = item.tier === "super_rare";
  const borderWidthClass = isSuperRare
    ? "border-[3px]"
    : item.tier === "rare"
      ? "border-2"
      : "border";

  const orb = (
    <span
      className={`flex-none rounded-full ${style.badgeBg} h-14 w-14`}
      aria-hidden="true"
    />
  );

  const content = (
    <div className="flex flex-col items-center gap-1.5">
      <span
        className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${style.text} bg-white/5`}
      >
        {style.label}
      </span>
      <h3 className="text-lg font-semibold leading-snug text-foreground">
        {item.title}
      </h3>
      <p className="line-clamp-4 text-sm text-foreground/75">
        {item.description}
      </p>
    </div>
  );

  return (
    <div
      className={[
        "flex flex-col items-center gap-3 rounded-2xl bg-[#15121e] p-5 text-center",
        borderWidthClass,
        style.border,
        style.glow,
      ].join(" ")}
    >
      {reducedMotion ? (
        orb
      ) : (
        <motion.span
          variants={colorVariants}
          className={`flex-none rounded-full ${style.badgeBg} h-14 w-14`}
          aria-hidden="true"
        />
      )}

      {reducedMotion ? (
        content
      ) : (
        <motion.div variants={contentVariants} className="w-full">
          {content}
        </motion.div>
      )}

      <DownloadPrdButton ideaId={item.ideaId} variant="full" className="mt-1 w-full" />
    </div>
  );
}

export default function ResultReveal({ items }: ResultRevealProps) {
  const prefersReducedMotion = useReducedMotion();
  const reducedMotion = Boolean(prefersReducedMotion);
  const isBatch = items.length > 1;

  if (items.length === 0) {
    return null;
  }

  if (!isBatch) {
    const item = items[0];
    if (reducedMotion) {
      return (
        <div className="mx-auto w-full max-w-sm">
          <RevealCard item={item} reducedMotion />
        </div>
      );
    }
    return (
      <motion.div
        className="mx-auto w-full max-w-sm"
        initial="hidden"
        animate="visible"
        variants={cardVariants}
      >
        <RevealCard item={item} reducedMotion={false} />
      </motion.div>
    );
  }

  return <BatchCarousel items={items} reducedMotion={reducedMotion} />;
}

/** Slide transition for the carousel: enters from the travel direction. */
const slideVariants: Variants = {
  enter: (dir: number) => ({ opacity: 0, x: dir >= 0 ? 48 : -48 }),
  center: { opacity: 1, x: 0 },
  exit: (dir: number) => ({ opacity: 0, x: dir >= 0 ? -48 : 48 }),
};

/**
 * Batch (10x) results as a one-card-at-a-time carousel. The old 2-column grid
 * of ten compact cards was cramped and hard to read; the carousel shows each
 * idea full-size (same card as a single pull) with prev/next controls, a
 * position counter, and clickable rarity-colored dots. Arrow keys also work.
 */
function BatchCarousel({
  items,
  reducedMotion,
}: {
  items: PullResultItem[];
  reducedMotion: boolean;
}) {
  const [index, setIndex] = useState(0);
  const [dir, setDir] = useState(0);
  const total = items.length;

  const goTo = (next: number) => {
    const clamped = ((next % total) + total) % total;
    setDir(clamped === index ? 0 : clamped > index ? 1 : -1);
    setIndex(clamped);
  };

  const item = items[index];

  return (
    <div
      className="mx-auto w-full max-w-sm"
      role="group"
      aria-roledescription="carousel"
      aria-label="Your 10x pull results"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft") goTo(index - 1);
        if (e.key === "ArrowRight") goTo(index + 1);
      }}
    >
      <div className="mb-3 flex items-center justify-between text-xs text-foreground/60">
        <span>Your 10x pull</span>
        <span className="font-medium text-foreground/80">
          {index + 1} / {total}
        </span>
      </div>

      <div className="relative overflow-hidden">
        {reducedMotion ? (
          <RevealCard item={item} reducedMotion />
        ) : (
          <AnimatePresence mode="wait" custom={dir} initial={false}>
            <motion.div
              key={index}
              custom={dir}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
            >
              <RevealCard item={item} reducedMotion={false} />
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => goTo(index - 1)}
          aria-label="Previous result"
          className="flex h-10 w-10 flex-none items-center justify-center rounded-lg border border-foreground/15 bg-white/5 text-foreground/80 transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50 active:scale-[0.96] motion-reduce:active:scale-100"
        >
          <CaretLeft size={18} weight="bold" aria-hidden="true" />
        </button>

        <div className="flex flex-1 flex-wrap items-center justify-center gap-1.5">
          {items.map((it, i) => {
            const active = i === index;
            return (
              <button
                key={`${it.ideaId}-${i}`}
                type="button"
                onClick={() => goTo(i)}
                aria-label={`Go to result ${i + 1}`}
                aria-current={active ? "true" : undefined}
                className={[
                  "h-2.5 rounded-full transition-all",
                  TIER_STYLES[it.tier].badgeBg,
                  active ? "w-5 opacity-100" : "w-2.5 opacity-40 hover:opacity-70",
                ].join(" ")}
              />
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => goTo(index + 1)}
          aria-label="Next result"
          className="flex h-10 w-10 flex-none items-center justify-center rounded-lg border border-foreground/15 bg-white/5 text-foreground/80 transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50 active:scale-[0.96] motion-reduce:active:scale-100"
        >
          <CaretRight size={18} weight="bold" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
