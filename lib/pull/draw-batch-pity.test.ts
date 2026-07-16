/**
 * Property test for sequential batch pity evaluation.
 *
 * Feature: gacha-idea-generator, Property 6: Batch pity is evaluated
 * sequentially per pull
 * Validates: Requirements 3.4, 4.4
 */

import { describe, expect, it } from "vitest";
import fc from "fast-check";

import { drawBatch, drawTier } from "./draw";
import { isPityForced, nextPity } from "./pity";
import type { DropRateConfig, RarityTier } from "./types";

/** Arbitrary valid DropRateConfig: three non-negative integers summing to 100. */
const dropRateConfigArb: fc.Arbitrary<DropRateConfig> = fc
  .tuple(fc.integer({ min: 0, max: 100 }), fc.integer({ min: 0, max: 100 }))
  .map(([a, b]) => {
    const lo = Math.min(a, b);
    const hi = Math.max(a, b);
    return {
      common: lo,
      rare: hi - lo,
      super_rare: 100 - hi,
    };
  });

/** Starting pity values, including several close to/at the 90 threshold. */
const pityBeforeArb = fc.integer({ min: 0, max: 200 });

/** A fixed sequence of ten rng() outputs, each in [0, 1). */
const rngValuesArb = fc.array(
  fc.double({ min: 0, max: 1, noNaN: true, maxExcluded: true }),
  { minLength: 10, maxLength: 10 },
);

/** Builds a stateful rng() that replays `values` in order, one per call. */
function makeSequentialRng(values: number[]): () => number {
  let i = 0;
  return () => values[i++];
}

describe("drawBatch - Property 6", () => {
  it(
    "Feature: gacha-idea-generator, Property 6: Batch pity is evaluated sequentially per pull",
    () => {
      fc.assert(
        fc.property(
          dropRateConfigArb,
          pityBeforeArb,
          rngValuesArb,
          (config, pityBefore, rngValues) => {
            // Manually re-simulate ten sequential drawTier calls using the
            // SAME fixed rng sequence, carrying pity from each pull's
            // pityAfter into the next pull's pityBefore. This mirrors what
            // drawBatch is expected to do internally, per pull.
            const manualTiers: RarityTier[] = [];
            const pityBeforeTrace: number[] = [];
            let manualPity = pityBefore;
            const manualRng = makeSequentialRng(rngValues);

            for (let i = 0; i < 10; i++) {
              pityBeforeTrace.push(manualPity);
              const outcome = drawTier({
                config,
                pityBefore: manualPity,
                rng: manualRng,
              });
              manualTiers.push(outcome.tier);
              manualPity = outcome.pityAfter;

              // Cross-check each pull's own sequential transition directly
              // against the pure pity rules in lib/pull/pity.ts: any pull
              // whose incoming counter reaches the threshold within the
              // batch must be forced to super_rare with a reset.
              if (isPityForced(pityBeforeTrace[i])) {
                expect(outcome.tier).toBe("super_rare");
              }
              expect(outcome.pityAfter).toBe(
                nextPity(pityBeforeTrace[i], outcome.tier),
              );
            }

            // Now run the actual drawBatch under test with the same fixed
            // rng sequence and starting pity.
            const batchRng = makeSequentialRng(rngValues);
            const batchResult = drawBatch({
              config,
              pityBefore,
              rng: batchRng,
            });

            // The final pity counter must equal the result of applying the
            // per-pull transition rule sequentially across all ten pulls.
            expect(batchResult.pityAfter).toBe(manualPity);
            expect(batchResult.tiers).toHaveLength(10);

            const manualHasRareOrHigher = manualTiers.some(
              (tier) => tier === "rare" || tier === "super_rare",
            );

            if (manualHasRareOrHigher) {
              // No batch-guarantee upgrade should have been applied; the
              // awarded tiers must match the sequential simulation exactly.
              expect(batchResult.tiers).toEqual(manualTiers);
            } else {
              // The batch guarantee upgrades exactly one "common" slot to
              // "rare" without touching pity accounting. Every other slot
              // must match the sequential simulation.
              let diffCount = 0;
              let diffIndex = -1;
              for (let i = 0; i < 10; i++) {
                if (batchResult.tiers[i] !== manualTiers[i]) {
                  diffCount++;
                  diffIndex = i;
                }
              }
              expect(diffCount).toBe(1);
              expect(manualTiers[diffIndex]).toBe("common");
              expect(batchResult.tiers[diffIndex]).toBe("rare");
            }
          },
        ),
        { numRuns: 100 },
      );
    },
  );

  it(
    "Feature: gacha-idea-generator, Property 6: Batch pity is evaluated sequentially per pull - " +
      "forces super_rare mid-batch when starting pity is near the threshold",
    () => {
      // Starting pity in [85, 89] means the threshold (90) would be reached
      // within the ten-pull batch if no earlier pull naturally awards
      // super_rare first (which would reset the counter before the
      // threshold is hit). Either way, the pity rules (isPityForced /
      // nextPity) must hold at every step, and the batch's final pity must
      // match the sequential simulation.
      const nearThresholdPityArb = fc.integer({ min: 85, max: 89 });

      fc.assert(
        fc.property(
          dropRateConfigArb,
          nearThresholdPityArb,
          rngValuesArb,
          (config, pityBefore, rngValues) => {
            // Re-simulate sequentially with the pure functions, using the
            // same fixed rng sequence as drawBatch, to get the ground-truth
            // per-pull trace (pityBefore, forced?, tier, pityAfter).
            const manualRng = makeSequentialRng(rngValues);
            let pity = pityBefore;
            let crossedThreshold = false;

            for (let i = 0; i < 10; i++) {
              const forced = isPityForced(pity);
              const outcome = drawTier({ config, pityBefore: pity, rng: manualRng });

              if (forced) {
                crossedThreshold = true;
                // A forced pull must be super_rare and reset pity to 0.
                expect(outcome.tier).toBe("super_rare");
                expect(outcome.pityAfter).toBe(0);
              }
              // Every pull's transition must match the pure pity rule,
              // forced or not.
              expect(outcome.pityAfter).toBe(nextPity(pity, outcome.tier));

              if (outcome.tier === "super_rare") {
                crossedThreshold = true;
              }

              pity = outcome.pityAfter;
            }

            // Within a ten-pull batch starting at pity 85-89, the threshold
            // is either crossed by a forced super_rare, or preempted by a
            // natural super_rare that resets the counter first. Either way
            // at least one super_rare (forced or natural) must occur.
            expect(crossedThreshold).toBe(true);

            // drawBatch, run with the identical rng sequence, must produce
            // the same final pity counter as the manual sequential trace.
            const batchRng = makeSequentialRng(rngValues);
            const result = drawBatch({ config, pityBefore, rng: batchRng });
            expect(result.pityAfter).toBe(pity);
          },
        ),
        { numRuns: 100 },
      );
    },
  );
});
