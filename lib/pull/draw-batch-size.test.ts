import { describe, expect, it } from "vitest";
import fc from "fast-check";

import { drawBatch } from "./draw";
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

describe("drawBatch - Property 4", () => {
  it(
    "Feature: gacha-idea-generator, Property 4: Batch pull yields exactly ten valid results",
    () => {
      fc.assert(
        fc.property(
          dropRateConfigArb,
          pityBeforeArb,
          rngValueArb,
          (config, pityBefore, rngValue) => {
            const result = drawBatch({
              config,
              pityBefore,
              rng: () => rngValue,
            });

            // A batch pull SHALL produce exactly ten results.
            expect(result.tiers).toHaveLength(10);

            // Each result SHALL have a valid Rarity_Tier.
            for (const tier of result.tiers) {
              expect(VALID_TIERS).toContain(tier);
            }
          },
        ),
        { numRuns: 100 },
      );
    },
  );
});
