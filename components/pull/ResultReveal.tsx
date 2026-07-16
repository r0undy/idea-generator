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

import { motion, useReducedMotion, type Variants } from "motion/react";
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

/** Container-level stagger: each card in a batch enters in pull order. */
const containerVariants: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.14, delayChildren: 0.05 },
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
  compact: boolean;
}

function RevealCard({ item, reducedMotion, compact }: RevealCardProps) {
  const style = TIER_STYLES[item.tier];
  const isSuperRare = item.tier === "super_rare";

  const orbSizeClass = compact ? "h-8 w-8" : "h-16 w-16";
  const cardPaddingClass = compact ? "p-3" : "p-5";
  const borderWidthClass = isSuperRare
    ? "border-[3px]"
    : item.tier === "rare"
      ? "border-2"
      : "border";

  return (
    <div
      className={[
        "flex flex-col gap-3 rounded-xl bg-[#15121e]",
        borderWidthClass,
        style.border,
        style.glow,
        cardPaddingClass,
        compact ? "flex-row items-center gap-3" : "items-center text-center",
      ].join(" ")}
    >
      {reducedMotion ? (
        <div
          className={`flex-none rounded-full ${style.badgeBg} ${orbSizeClass}`}
          aria-hidden="true"
        />
      ) : (
        <motion.div
          variants={colorVariants}
          className={`flex-none rounded-full ${style.badgeBg} ${orbSizeClass}`}
          aria-hidden="true"
        />
      )}

      {reducedMotion ? (
        <div className={compact ? "min-w-0 flex-1" : "flex flex-col gap-1"}>
          <p className={`text-xs font-semibold tracking-wide uppercase ${style.text}`}>
            {style.label}
          </p>
          <h3 className={compact ? "truncate text-sm font-medium text-foreground" : "text-lg font-semibold text-foreground"}>
            {item.title}
          </h3>
          {!compact && (
            <p className="text-sm text-foreground/80">{item.description}</p>
          )}
        </div>
      ) : (
        <motion.div
          variants={contentVariants}
          className={compact ? "min-w-0 flex-1" : "flex flex-col gap-1"}
        >
          <p className={`text-xs font-semibold tracking-wide uppercase ${style.text}`}>
            {style.label}
          </p>
          <h3
            className={
              compact
                ? "truncate text-sm font-medium text-foreground"
                : "text-lg font-semibold text-foreground"
            }
          >
            {item.title}
          </h3>
          {!compact && (
            <p className="text-sm text-foreground/80">{item.description}</p>
          )}
          {compact && (
            <p className="line-clamp-2 text-xs text-foreground/70">
              {item.description}
            </p>
          )}
        </motion.div>
      )}

      <DownloadPrdButton
        ideaId={item.ideaId}
        variant={compact ? "compact" : "full"}
        className={compact ? "flex-none self-center" : "mt-1"}
      />
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
          <RevealCard item={item} reducedMotion compact={false} />
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
        <RevealCard item={item} reducedMotion={false} compact={false} />
      </motion.div>
    );
  }

  if (reducedMotion) {
    return (
      <ul
        role="list"
        className="grid grid-cols-1 gap-3 sm:grid-cols-2"
      >
        {items.map((item, index) => (
          <li key={`${item.ideaId}-${index}`}>
            <RevealCard item={item} reducedMotion compact />
          </li>
        ))}
      </ul>
    );
  }

  return (
    <motion.ul
      role="list"
      className="grid grid-cols-1 gap-3 sm:grid-cols-2"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      {items.map((item, index) => (
        <motion.li key={`${item.ideaId}-${index}`} variants={cardVariants}>
          <RevealCard item={item} reducedMotion={false} compact />
        </motion.li>
      ))}
    </motion.ul>
  );
}
