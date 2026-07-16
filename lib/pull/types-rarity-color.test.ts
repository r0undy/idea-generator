import { describe, expect, it } from "vitest";

import { RARITY_COLOR } from "./types";

describe("RARITY_COLOR", () => {
  it("maps common to silver, rare to purple, and super_rare to gold", () => {
    expect(RARITY_COLOR.common).toBe("silver");
    expect(RARITY_COLOR.rare).toBe("purple");
    expect(RARITY_COLOR.super_rare).toBe("gold");
  });
});
