// @vitest-environment jsdom
/**
 * Property test for HistoryList rendering completeness.
 *
 * The global vitest config runs in the "node" environment (see
 * vitest.config.ts) because most of the suite exercises pure server-side
 * logic. This file needs a DOM to render a component, so it opts into
 * jsdom via the `@vitest-environment` pragma, matching the pattern used in
 * components/pull/PullControls.test.tsx.
 *
 * Feature: gacha-idea-generator, Property 12: History rendering completeness
 * Validates: Requirements 6.1, 6.3
 */
import { cleanup, render } from "@testing-library/react";
import fc from "fast-check";
import { afterEach, describe, expect, it } from "vitest";

import HistoryList, { type HistoryEntry } from "./HistoryList";
import type { RarityTier } from "@/lib/pull/types";

afterEach(() => {
  cleanup();
});

const TIER_LABEL: Record<RarityTier, string> = {
  common: "Common",
  rare: "Rare",
  super_rare: "Super Rare",
};

const tierArbitrary: fc.Arbitrary<RarityTier> = fc.constantFrom(
  "common",
  "rare",
  "super_rare",
);

const historyEntryArbitrary: fc.Arbitrary<HistoryEntry> = fc.record({
  id: fc.uuid(),
  ideaId: fc.uuid(),
  tier: tierArbitrary,
  // Arbitrary ISO timestamps within a wide, realistic range.
  pulledAt: fc
    .date({
      min: new Date("2000-01-01T00:00:00.000Z"),
      max: new Date("2100-01-01T00:00:00.000Z"),
    })
    .map((d) => d.toISOString()),
  title: fc.string({ minLength: 1, maxLength: 40 }),
  description: fc.string({ minLength: 1, maxLength: 120 }),
});

const historyEntriesArbitrary = fc.array(historyEntryArbitrary, {
  minLength: 1,
  maxLength: 8,
});

const timestampFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});

function formatPulledAt(pulledAt: string): string {
  const date = new Date(pulledAt);
  if (Number.isNaN(date.getTime())) {
    return pulledAt;
  }
  return timestampFormatter.format(date);
}

describe("HistoryList - rendering completeness (Property 12)", () => {
  it("renders every entry's title, tier label, and formatted timestamp", () => {
    fc.assert(
      fc.property(historyEntriesArbitrary, (entries) => {
        const { container, unmount } = render(<HistoryList entries={entries} />);

        try {
          const text = container.textContent ?? "";

          for (const entry of entries) {
            expect(text).toContain(entry.title);
            expect(text).toContain(TIER_LABEL[entry.tier]);

            // The timestamp must be present either via the <time> element's
            // dateTime attribute or its formatted, human-readable text.
            const timeEl = container.querySelector(
              `time[datetime="${entry.pulledAt}"]`,
            );
            expect(timeEl).not.toBeNull();
            expect(text).toContain(formatPulledAt(entry.pulledAt));
          }
        } finally {
          unmount();
        }
      }),
      { numRuns: 100 },
    );
  }, 20000);
});
