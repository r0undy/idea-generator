// @vitest-environment jsdom
/**
 * Property test for history ordering (rendering side).
 *
 * Feature: gacha-idea-generator, Property 11: History ordering is
 * most-recent-first
 * Validates: Requirements 6.2
 *
 * Honesty note: the actual most-recent-first ordering guarantee is enforced
 * by the Supabase query in app/history/page.tsx via
 * `.order("pulled_at", { ascending: false })`. That ORDER BY clause runs in
 * Postgres and isn't exercisable here without a live database (consistent
 * with how the integration-only concerns in prior tasks, e.g. Property 9's
 * RPC transaction and the auth/RLS tests in task 7.2, were handled outside
 * of pure unit/property tests).
 *
 * What IS testable at this level is the contract `HistoryList` relies on:
 * given entries that already satisfy the most-recent-first invariant (as
 * the real query would produce), the component must render them in that
 * exact order and must not silently re-sort, reverse, or shuffle them. This
 * test generates arbitrary `HistoryEntry` arrays, sorts them non-increasing
 * by `pulledAt` (simulating the correctly-ordered query result), renders
 * via `@testing-library/react`, and asserts the DOM order of entries
 * matches the input order exactly.
 */
import { cleanup, render, screen } from "@testing-library/react";
import fc from "fast-check";
import { afterEach, describe, expect, it } from "vitest";

import type { RarityTier } from "@/lib/pull/types";

import HistoryList, { type HistoryEntry } from "./HistoryList";

afterEach(() => {
  cleanup();
});

const rarityTierArb: fc.Arbitrary<RarityTier> = fc.constantFrom(
  "common",
  "rare",
  "super_rare",
);

/**
 * Arbitrary HistoryEntry with a unique id (via index-free UUID-ish string)
 * and a pulledAt timestamp drawn from a bounded range so sorting has
 * meaningful (and sometimes colliding) values to exercise.
 */
const historyEntryArb: fc.Arbitrary<HistoryEntry> = fc.record({
  id: fc.uuid(),
  ideaId: fc.uuid(),
  tier: rarityTierArb,
  title: fc.string({ minLength: 1, maxLength: 20 }),
  description: fc.string({ minLength: 1, maxLength: 40 }),
  pulledAtMs: fc.integer({ min: 0, max: 1_000_000_000 }),
}).map(({ id, ideaId, tier, title, description, pulledAtMs }) => ({
  id,
  ideaId,
  tier,
  title,
  description,
  pulledAt: new Date(pulledAtMs).toISOString(),
}));

describe("HistoryList - rendering preserves most-recent-first order (Property 11)", () => {
  it(
    "Feature: gacha-idea-generator, Property 11: History ordering is most-recent-first - " +
      "renders entries in the same order they are given when the input is already " +
      "sorted non-increasing by pulledAt",
    () => {
      fc.assert(
        fc.property(
          fc.uniqueArray(historyEntryArb, {
            minLength: 1,
            maxLength: 8,
            selector: (entry) => entry.id,
          }),
          (rawEntries) => {
            // Simulate the correctly-ordered Supabase query result: sort
            // non-increasing (descending) by pulledAt, as
            // `.order("pulled_at", { ascending: false })` would.
            const sortedEntries = [...rawEntries].sort(
              (a, b) =>
                new Date(b.pulledAt).getTime() - new Date(a.pulledAt).getTime(),
            );

            const { unmount } = render(<HistoryList entries={sortedEntries} />);

            const listItems = screen.getAllByRole("listitem");
            expect(listItems).toHaveLength(sortedEntries.length);

            const renderedTitles = listItems.map(
              (item) => item.querySelector("h3")?.textContent,
            );
            const expectedTitles = sortedEntries.map((entry) => entry.title);

            expect(renderedTitles).toEqual(expectedTitles);

            // Also verify timestamps render in the same (non-increasing)
            // order via the `<time datetime>` attribute, independent of
            // title collisions from the string generator.
            const renderedTimestamps = listItems.map(
              (item) => item.querySelector("time")?.getAttribute("dateTime"),
            );
            const expectedTimestamps = sortedEntries.map(
              (entry) => entry.pulledAt,
            );
            expect(renderedTimestamps).toEqual(expectedTimestamps);

            unmount();
          },
        ),
        { numRuns: 100 },
      );
    },
    20000,
  );
});
