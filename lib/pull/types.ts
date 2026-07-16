/**
 * Shared rarity and pull-service types for the Gacha Idea Generator.
 *
 * These types are consumed by the pure draw/pity logic (lib/pull/*), the
 * Pull_Service orchestration (lib/pull/service.ts), and the Route Handler
 * (app/api/pull/route.ts). Keeping them in one place avoids drift between
 * server logic and the client-facing result shapes.
 *
 * See design.md > "Components and Interfaces" for the authoritative shapes.
 */

/** The three award tiers a Project_Idea can be assigned. */
export type RarityTier = "common" | "rare" | "super_rare";

/**
 * Maps each Rarity_Tier to the color the chest emits before revealing the
 * result: silver for common, purple for rare, gold for super_rare.
 * Mirrors the `rarity-common` / `rarity-rare` / `rarity-super-rare` Tailwind
 * theme tokens defined in globals.css.
 */
export const RARITY_COLOR: Record<RarityTier, string> = {
  common: "silver",
  rare: "purple",
  super_rare: "gold",
};

/** Pull count at which a super_rare result is guaranteed. */
export const PITY_THRESHOLD = 90;

/** Server-side drop rate configuration, expressed as whole percentages. */
export interface DropRateConfig {
  common: number; // percent, e.g. 79
  rare: number; // percent, e.g. 18
  super_rare: number; // percent, e.g. 3
}

/** Input to the pure draw algorithm (lib/pull/draw.ts). */
export interface DrawInput {
  config: DropRateConfig;
  pityBefore: number;
  rng: () => number; // injectable for deterministic tests
}

/** Result of drawing a single tier. */
export interface SinglePullOutcome {
  tier: RarityTier;
  pityAfter: number;
}

/** Whether the client requested a single (1x) or batch (10x) pull. */
export type PullMode = "single" | "batch";

/** A single awarded Project_Idea returned to the client. */
export interface PullResultItem {
  ideaId: string;
  title: string;
  description: string;
  tier: RarityTier;
}

/** Outcome of Pull_Service.performPull(); discriminated on `ok`. */
export type PullServiceResult =
  | { ok: true; items: PullResultItem[]; pityAfter: number }
  | {
      ok: false;
      error: "unauthenticated" | "config-error" | "catalog-error" | "internal";
    };
