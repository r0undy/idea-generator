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

/**
 * Arbitrary sequence of rng() outputs, one per pull in the batch. A fresh
 * rng function is built per test case, drawing sequentially from this array
 * so each of the ten pulls in a batch can sample a different roll.
 */
const rngRollsArb = fc.array(
  fc.double({ min: 0, max: 1, noNaN: true, maxExcluded: true }),
  { minLength: 10, maxLength: 10 },
);

const RARE_OR_HIGHER: RarityTier[] = ["rare", "super_rare"];

describe("drawBatch - Property 5", () => {
  it(
    "Feature: gacha-idea-generator, Property 5: Batch guarantees at least one rare-or-higher",
    () => {
      fc.assert(
        fc.property(
          dropRateConfigArb,
          pityBeforeArb,
          rngRollsArb,
          (config, pityBefore, rngRolls) => {
            let i = 0;
            const rng = () => rngRolls[i++ % rngRolls.length];

            const { tiers } = drawBatch({ config, pityBefore, rng });

            // Contract: exactly ten results.
            expect(tiers).toHaveLength(10);

            // Property 5: at least one result is rare or super_rare.
            const hasRareOrHigher = tiers.some((tier) =>
              RARE_OR_HIGHER.includes(tier),
            );
            expect(hasRareOrHigher).toBe(true);
          },
        ),
        { numRuns: 100 },
      );
    },
  );
});
