import { describe, expect, it, vi } from "vitest";
import fc from "fast-check";

const { createClientMock, createServiceRoleClientMock } = vi.hoisted(() => ({
  createClientMock: vi.fn(),
  createServiceRoleClientMock: vi.fn(),
}));

vi.mock("../supabase/server", () => ({
  createClient: createClientMock,
  createServiceRoleClient: createServiceRoleClientMock,
}));

import { buildPullHistoryRecords } from "./service";
import type { PullResultItem, RarityTier } from "./types";

const rarityTierArb: fc.Arbitrary<RarityTier> = fc.constantFrom(
  "common",
  "rare",
  "super_rare",
);

const pullResultItemArb: fc.Arbitrary<PullResultItem> = fc.record({
  ideaId: fc.string(),
  title: fc.string(),
  description: fc.string(),
  tier: rarityTierArb,
});

const pullResultItemsArb = fc.array(pullResultItemArb, {
  minLength: 1,
  maxLength: 10,
});

describe("buildPullHistoryRecords - Property 10", () => {
  it(
    "Feature: gacha-idea-generator, Property 10: History records preserve awarded results",
    () => {
      fc.assert(
        fc.property(pullResultItemsArb, (items) => {
          const records = buildPullHistoryRecords(items);

          // One entry per awarded idea.
          expect(records).toHaveLength(items.length);

          // Each record preserves the corresponding item's idea id and
          // rarity tier, in the same order.
          items.forEach((item, index) => {
            expect(records[index].idea_id).toBe(item.ideaId);
            expect(records[index].rarity_tier).toBe(item.tier);
          });
        }),
        { numRuns: 100 },
      );
    },
  );
});
