import { describe, expect, it } from "vitest";
import fc from "fast-check";

import { nextPity } from "./pity";
import type { RarityTier } from "./types";

const rarityTierArb: fc.Arbitrary<RarityTier> = fc.constantFrom(
  "common",
  "rare",
  "super_rare",
);

describe("nextPity", () => {
  // Feature: gacha-idea-generator, Property 2: Pity counter transition rule
  it("resets to zero on super_rare and increments by one otherwise, for any pity value and awarded tier", () => {
    fc.assert(
      fc.property(
        fc.nat(),
        rarityTierArb,
        (pityBefore, awarded) => {
          const result = nextPity(pityBefore, awarded);

          if (awarded === "super_rare") {
            expect(result).toBe(0);
          } else {
            expect(result).toBe(pityBefore + 1);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
