/**
 * Property test for Drop_Rate_Config sum validation.
 *
 * Feature: gacha-idea-generator, Property 7: Configuration sum validation
 * Validates: Requirements 5.4
 */

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { ConfigError, validateConfigSum } from "./config";
import type { DropRateConfig } from "./types";

/** Any integer in a range wide enough to explore invalid and edge sums. */
const tierValue = fc.integer({ min: -1000, max: 1000 });

describe("validateConfigSum", () => {
  it(
    "Feature: gacha-idea-generator, Property 7: Configuration sum validation - " +
      "throws ConfigError when tiers do not sum to 100",
    () => {
      fc.assert(
        fc.property(tierValue, tierValue, tierValue, (common, rare, super_rare) => {
          fc.pre(common + rare + super_rare !== 100);

          const config: DropRateConfig = { common, rare, super_rare };

          expect(() => validateConfigSum(config)).toThrow(ConfigError);
        }),
        { numRuns: 100 },
      );
    },
  );

  it(
    "Feature: gacha-idea-generator, Property 7: Configuration sum validation - " +
      "does not throw when tiers sum to exactly 100",
    () => {
      fc.assert(
        fc.property(
          fc.integer({ min: -1000, max: 1000 }),
          fc.integer({ min: -1000, max: 1000 }),
          (common, rare) => {
            const super_rare = 100 - common - rare;
            const config: DropRateConfig = { common, rare, super_rare };

            expect(() => validateConfigSum(config)).not.toThrow();
          },
        ),
        { numRuns: 100 },
      );
    },
  );
});
