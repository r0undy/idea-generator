/**
 * Pure pity transition and threshold logic for the Gacha Idea Generator.
 *
 * These functions contain no I/O; they operate solely on the pity counter and
 * awarded tier so they can be unit- and property-tested in isolation.
 *
 * See design.md > "Pity logic (pure)" for the authoritative signatures.
 */

import { PITY_THRESHOLD, type RarityTier } from "./types";

/**
 * Given the pity counter BEFORE a pull, returns whether this pull is forced to
 * super_rare by the pity threshold.
 *
 * Requirements: 4.2
 */
export function isPityForced(pityBefore: number): boolean {
  return pityBefore + 1 >= PITY_THRESHOLD;
}

/**
 * Given the counter before a pull and the awarded tier, returns the counter
 * after the pull: reset to zero when the awarded tier is super_rare,
 * otherwise incremented by one.
 *
 * Requirements: 4.1, 4.3, 2.4
 */
export function nextPity(pityBefore: number, awarded: RarityTier): number {
  return awarded === "super_rare" ? 0 : pityBefore + 1;
}
