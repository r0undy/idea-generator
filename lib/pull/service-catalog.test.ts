/**
 * Property test for catalog completeness enforcement.
 *
 * Feature: gacha-idea-generator, Property 8: Catalog completeness enforcement
 * Validates: Requirements 8.3
 */

import { describe, it, expect, vi } from "vitest";
import fc from "fast-check";

const { createClientMock, createServiceRoleClientMock } = vi.hoisted(() => ({
  createClientMock: vi.fn(),
  createServiceRoleClientMock: vi.fn(),
}));

vi.mock("../supabase/server", () => ({
  createClient: createClientMock,
  createServiceRoleClient: createServiceRoleClientMock,
}));

import {
  CatalogError,
  selectIdeaForTier,
  selectIdeasForTiers,
  type ProjectIdeaRow,
  type SupabaseIdeaSelectClient,
} from "./service";
import type { RarityTier } from "./types";

const tierArb: fc.Arbitrary<RarityTier> = fc.constantFrom(
  "common",
  "rare",
  "super_rare",
);

const projectIdeaRowArb = (tier: RarityTier): fc.Arbitrary<ProjectIdeaRow> =>
  fc.record({
    id: fc.uuid(),
    title: fc.string({ minLength: 1, maxLength: 20 }),
    description: fc.string({ minLength: 1, maxLength: 40 }),
    rarity_tier: fc.constant(tier),
  });

/**
 * Builds a fake Supabase client whose `.eq("rarity_tier", tier)` resolves
 * with the rows supplied for that tier (or an empty array when the tier is
 * not present in `rowsByTier`), mirroring the
 * `supabase.from(table).select(columns).eq(column, value)` shape required
 * by `SupabaseIdeaSelectClient`.
 */
function makeFakeClient(
  rowsByTier: Map<RarityTier, ProjectIdeaRow[]>,
): SupabaseIdeaSelectClient {
  return {
    from(_table: string) {
      return {
        select(_columns: string) {
          return {
            eq(_column: string, value: string) {
              const data = rowsByTier.get(value as RarityTier) ?? [];
              return Promise.resolve({ data, error: null });
            },
          };
        },
      };
    },
  };
}

describe("selectIdeaForTier - catalog completeness enforcement", () => {
  it(
    "Feature: gacha-idea-generator, Property 8: Catalog completeness enforcement - " +
      "rejects with CatalogError when the required tier has no rows",
    async () => {
      await fc.assert(
        fc.asyncProperty(tierArb, async (tier) => {
          const client = makeFakeClient(new Map([[tier, []]]));

          await expect(selectIdeaForTier(client, tier)).rejects.toThrow(
            CatalogError,
          );
        }),
        { numRuns: 100 },
      );
    },
  );

  it(
    "Feature: gacha-idea-generator, Property 8: Catalog completeness enforcement - " +
      "resolves with an idea from that tier's rows when at least one row exists",
    async () => {
      await fc.assert(
        fc.asyncProperty(
          tierArb.chain((tier) =>
            fc.tuple(
              fc.constant(tier),
              fc.array(projectIdeaRowArb(tier), { minLength: 1, maxLength: 10 }),
            ),
          ),
          async ([tier, rows]) => {
            const client = makeFakeClient(new Map([[tier, rows]]));

            const result = await selectIdeaForTier(client, tier);

            expect(result.tier).toBe(tier);
            expect(rows.map((r) => r.id)).toContain(result.ideaId);
          },
        ),
        { numRuns: 100 },
      );
    },
  );
});

describe("selectIdeasForTiers - catalog completeness enforcement", () => {
  it(
    "Feature: gacha-idea-generator, Property 8: Catalog completeness enforcement - " +
      "rejects with CatalogError when any required tier in the batch has no rows",
    async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(tierArb, { minLength: 1, maxLength: 10 }),
          tierArb,
          async (tiers, emptyTier) => {
            const allTiers = [...tiers, emptyTier];
            const rowsByTier = new Map<RarityTier, ProjectIdeaRow[]>();
            for (const tier of allTiers) {
              if (tier !== emptyTier) {
                rowsByTier.set(tier, [
                  {
                    id: "fixed-id",
                    title: "t",
                    description: "d",
                    rarity_tier: tier,
                  },
                ]);
              }
            }
            // Ensure the designated empty tier truly has no rows.
            rowsByTier.set(emptyTier, []);

            const client = makeFakeClient(rowsByTier);

            await expect(
              selectIdeasForTiers(client, allTiers),
            ).rejects.toThrow(CatalogError);
          },
        ),
        { numRuns: 100 },
      );
    },
  );

  it(
    "Feature: gacha-idea-generator, Property 8: Catalog completeness enforcement - " +
      "resolves with one idea per tier drawn from that tier's rows when every " +
      "required tier has at least one row",
    async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(tierArb, { minLength: 1, maxLength: 10 }),
          async (tiers) => {
            const uniqueTiers = Array.from(new Set(tiers));
            const rowsByTier = new Map<RarityTier, ProjectIdeaRow[]>();
            for (const tier of uniqueTiers) {
              rowsByTier.set(tier, [
                { id: `${tier}-a`, title: "t", description: "d", rarity_tier: tier },
                { id: `${tier}-b`, title: "t", description: "d", rarity_tier: tier },
              ]);
            }

            const client = makeFakeClient(rowsByTier);

            const results = await selectIdeasForTiers(client, tiers);

            expect(results).toHaveLength(tiers.length);
            results.forEach((result, i) => {
              const expectedTier = tiers[i];
              expect(result.tier).toBe(expectedTier);
              expect(
                rowsByTier.get(expectedTier)!.map((r) => r.id),
              ).toContain(result.ideaId);
            });
          },
        ),
        { numRuns: 100 },
      );
    },
  );
});
