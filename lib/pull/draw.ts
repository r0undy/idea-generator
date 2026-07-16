/**
 * Pure draw algorithm for the Gacha Idea Generator.
 *
 * Contains no I/O: the RNG is injected so outcomes are deterministic and
 * testable. See design.md > "Draw algorithm (pure)" for the authoritative
 * signatures and algorithm description.
 */

import { isPityForced, nextPity } from "./pity";
import type { DrawInput, RarityTier, SinglePullOutcome } from "./types";

/**
 * Maps a uniform random value in [0, 100) into the cumulative bands defined
 * by `config`: `common` first, then `rare`, then `super_rare` covers the
 * remainder.
 *
 * The bands are cumulative rather than independent checks against each
 * tier's raw percentage, so tiny floating point drift in the config still
 * yields exactly one tier per sample.
 */
function sampleTier(config: DrawInput["config"], roll: number): RarityTier {
  const commonBand = config.common;
  const rareBand = config.common + config.rare;

  if (roll < commonBand) {
    return "common";
  }
  if (roll < rareBand) {
    return "rare";
  }
  return "super_rare";
}

/**
 * Chooses a Rarity_Tier for a single pull honoring `config`, overridden to
 * `super_rare` when the incoming pity counter forces it. Returns the
 * awarded tier along with the pity counter after this pull.
 *
 * Requirements: 2.1, 5.1
 */
export function drawTier(input: DrawInput): SinglePullOutcome {
  const { config, pityBefore, rng } = input;

  const tier: RarityTier = isPityForced(pityBefore)
    ? "super_rare"
    : sampleTier(config, rng() * 100);

  return {
    tier,
    pityAfter: nextPity(pityBefore, tier),
  };
}

/**
 * Runs ten sequential single pulls, carrying the pity counter from each
 * pull's `pityAfter` into the next pull's `pityBefore`.
 *
 * After the sequence, if none of the ten results are `rare` or
 * `super_rare`, one `common` slot is upgraded to `rare` to satisfy the
 * Batch_Pull guarantee (Requirement 3.2). This upgrade only changes the
 * displayed/persisted tier for that slot; it does not alter the pity
 * counter progression, because pity accounting is driven solely by whether
 * a pull awarded `super_rare` (see lib/pull/pity.ts), and a common-to-rare
 * upgrade never changes that.
 *
 * Requirements: 3.1, 3.2, 3.4, 4.4
 */
export function drawBatch(input: DrawInput): {
  tiers: RarityTier[];
  pityAfter: number;
} {
  const { config, rng } = input;

  const tiers: RarityTier[] = [];
  let pity = input.pityBefore;

  for (let i = 0; i < 10; i++) {
    const outcome = drawTier({ config, pityBefore: pity, rng });
    tiers.push(outcome.tier);
    pity = outcome.pityAfter;
  }

  const hasRareOrHigher = tiers.some(
    (tier) => tier === "rare" || tier === "super_rare",
  );

  if (!hasRareOrHigher) {
    const commonIndex = tiers.findIndex((tier) => tier === "common");
    // All ten pulls must be a valid RarityTier, and none is rare/super_rare
    // here, so every slot is "common"; commonIndex will always be found.
    if (commonIndex !== -1) {
      tiers[commonIndex] = "rare";
    }
  }

  return { tiers, pityAfter: pity };
}
