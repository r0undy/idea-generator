import { describe, expect, it } from "vitest";
import fc from "fast-check";

import { drawTier } from "./draw";
import type { DropRateConfig, RarityTier } from "./types";

/**
 * Arbitrary valid DropRateConfig: three non-negative integers summing to 100.
 */
const dropRateConfigArb: fc.Arbitrary<DropRateConfig> = fc
  .tuple(fc.integer({ min: 0, max: 100 }), fc.integer({ min: 0, max: 100 }))
  .map(([a, b]) => {
    const lo = Math.min(a, b);
    const hi = Math.max(a, b);
    // Cut [0,100] at lo and hi into three non-negative pieces summing to 100.
    return {
      common: lo,
      rare: hi - lo,
      super_rare: 100 - hi,
    };
  });

const pityBeforeArb = fc.integer({ min: 0, max: 500 });

/** Arbitrary rng() returning a value in [0, 1). */
const rngValueArb = fc.double({
  min: 0,
  max: 1,
  noNaN: true,
  maxExcluded: true,
});

const VALID_TIERS: RarityTier[] = ["common", "rare", "super_rare"];

describe("drawTier - Property 1", () => {
  it(
    "Feature: gacha-idea-generator, Property 1: Single pull produces exactly one valid, tier-consistent result",
    () => {
      fc.assert(
        fc.property(
          dropRateConfigArb,
          pityBeforeArb,
          rngValueArb,
          (config, pityBefore, rngValue) => {
            const outcome = drawTier({
              config,
              pityBefore,
              rng: () => rngValue,
            });

            // Result is exactly one valid Rarity_Tier.
            expect(VALID_TIERS).toContain(outcome.tier);

            // pityAfter is a non-negative integer.
            expect(Number.isInteger(outcome.pityAfter)).toBe(true);
            expect(outcome.pityAfter).toBeGreaterThanOrEqual(0);

            // pityAfter is consistent with the pity rules: 0 if super_rare,
            // pityBefore + 1 otherwise.
            if (outcome.tier === "super_rare") {
              expect(outcome.pityAfter).toBe(0);
            } else {
              expect(outcome.pityAfter).toBe(pityBefore + 1);
            }

            // When the incoming pity counter would reach the threshold, the
            // pull is forced to super_rare (Property 3 territory, but
            // relevant to tier-consistency here too).
            if (pityBefore + 1 >= 90) {
              expect(outcome.tier).toBe("super_rare");
            }
          },
        ),
        { numRuns: 100 },
      );
    },
  );
});
