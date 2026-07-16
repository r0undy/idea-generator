import { describe, it, expect } from "vitest";

import {
  buildPrdMarkdown,
  slugify,
  toStringArray,
  toTableArray,
  type PrdIdea,
} from "./generate";

const fullIdea: PrdIdea = {
  title: "Bookmark Vault",
  tagline: "Save links, tag them, find them fast.",
  description: "A personal bookmarking app.",
  rarityTier: "common",
  features: ["Add a bookmark with URL", "Tag bookmarks and filter by tag"],
  dataModel: [
    { name: "bookmarks", purpose: "One row per saved link." },
    { name: "tags", purpose: "Reusable tag labels." },
  ],
  stretchGoals: ["Import from a browser export"],
};

describe("slugify", () => {
  it("lowercases, hyphenates, and trims", () => {
    expect(slugify("Bookmark Vault")).toBe("bookmark-vault");
    expect(slugify("  Split-the-Bill!! ")).toBe("split-the-bill");
  });

  it("falls back to 'idea' for empty results", () => {
    expect(slugify("!!!")).toBe("idea");
    expect(slugify("")).toBe("idea");
  });
});

describe("toStringArray", () => {
  it("keeps only non-empty strings", () => {
    expect(toStringArray(["a", "", 3, null, "b"])).toEqual(["a", "b"]);
  });
  it("returns [] for non-arrays", () => {
    expect(toStringArray("nope")).toEqual([]);
    expect(toStringArray(null)).toEqual([]);
    expect(toStringArray(undefined)).toEqual([]);
  });
});

describe("toTableArray", () => {
  it("keeps only well-formed {name, purpose} objects", () => {
    const input = [
      { name: "t1", purpose: "p1" },
      { name: "t2" },
      { purpose: "p3" },
      "junk",
      { name: 5, purpose: "p" },
    ];
    expect(toTableArray(input)).toEqual([{ name: "t1", purpose: "p1" }]);
  });
  it("returns [] for non-arrays", () => {
    expect(toTableArray({})).toEqual([]);
  });
});

describe("buildPrdMarkdown", () => {
  it("includes the title, tagline, and rarity", () => {
    const md = buildPrdMarkdown(fullIdea);
    expect(md).toContain("# Bookmark Vault - Product Spec");
    expect(md).toContain("Save links, tag them, find them fast.");
    expect(md).toContain("Common");
  });

  it("renders the standard Kiro-style sections", () => {
    const md = buildPrdMarkdown(fullIdea);
    for (const heading of [
      "## Overview",
      "## Goals",
      "## Target Users",
      "## Tech Stack",
      "## Requirements",
      "## Data Model (Supabase)",
      "## Implementation Tasks",
      "## Stretch Goals",
    ]) {
      expect(md).toContain(heading);
    }
  });

  it("turns each feature into a requirement and a task", () => {
    const md = buildPrdMarkdown(fullIdea);
    for (const feature of fullIdea.features) {
      expect(md).toContain(feature);
    }
    expect(md).toContain("Requirement 1:");
    expect(md).toContain("Requirement 2:");
    expect(md).toContain("**User story:**");
  });

  it("lists each Supabase table by name", () => {
    const md = buildPrdMarkdown(fullIdea);
    expect(md).toContain("`bookmarks`");
    expect(md).toContain("`tags`");
    expect(md).toContain("Create the `bookmarks` table with RLS policies.");
  });

  it("lists stretch goals", () => {
    const md = buildPrdMarkdown(fullIdea);
    expect(md).toContain("- Import from a browser export");
  });

  it("degrades gracefully when structured fields are empty", () => {
    const empty: PrdIdea = {
      title: "Bare Idea",
      tagline: "",
      description: "Just a description.",
      rarityTier: "rare",
      features: [],
      dataModel: [],
      stretchGoals: [],
    };
    const md = buildPrdMarkdown(empty);
    expect(md).toContain("# Bare Idea - Product Spec");
    expect(md).toContain("Just a description.");
    // Placeholders instead of crashing on empty arrays.
    expect(md).toContain("_Define the core user stories for this app._");
    expect(md).toContain("_Define the tables this app needs._");
  });

  it("contains zero em-dashes (project copy rule)", () => {
    const md = buildPrdMarkdown(fullIdea);
    expect(md).not.toMatch(/[—–]/);
  });
});
