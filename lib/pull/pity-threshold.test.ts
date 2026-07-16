import { describe, expect, it } from "vitest";
import fc from "fast-check";

import { drawTier } from "./draw";
import type { DropRateConfig } from "./types";

/**
 * Arbitrary valid Drop_Rate_Config: three non-negative integer percentages
 * that sum to exactly 100.
 */
const validConfigArb: fc.Arbitrary<DropRateConfig> = fc
  .tuple(fc.integer({ min: 0, max: 100 }), fc.integer({ min: 0, max: 100 }))
  .map(([a, b]) => {
    const [lo, hi] = a <= b ? [a, b] : [b, a];
    const common = lo;
    const rare = hi - lo;
    const super_rare = 100 - hi;
    return { common, rare, super_rare };
  });

describe("Feature: gacha-idea-generator, Property 3: Pity threshold guarantees super rare", () => {
  it("forces super_rare and resets pity to zero whenever pityBefore + 1 >= 90", () => {
    fc.assert(
      fc.property(
        validConfigArb,
        // pityBefore values at/near the threshold: 89..120 so pityBefore + 1 >= 90.
        fc.integer({ min: 89, max: 120 }),
        // RNG value is irrelevant once pity forces the outcome; sample across
        // the full [0, 1) range to confirm the roll is ignored.
        fc.double({ min: 0, max: 0.999999, noNaN: true }),
        (config, pityBefore, rollSeed) => {
          const outcome = drawTier({
            config,
            pityBefore,
            rng: () => rollSeed,
          });

          expect(outcome.tier).toBe("super_rare");
          expect(outcome.pityAfter).toBe(0);
        },
      ),
      { numRuns: 100 },
    );
  });
});
