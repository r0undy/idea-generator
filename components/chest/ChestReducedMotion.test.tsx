// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import ChestReducedMotion from "./ChestReducedMotion";
import type { RarityTier } from "@/lib/pull/types";

afterEach(() => {
  cleanup();
});

describe("ChestReducedMotion", () => {
  it('renders "Chest" and does not call onOpenComplete when tier is null (idle)', () => {
    const onOpenComplete = vi.fn();
    render(<ChestReducedMotion tier={null} onOpenComplete={onOpenComplete} />);

    expect(screen.getByText("Chest ready")).toBeInTheDocument();
    expect(onOpenComplete).not.toHaveBeenCalled();
  });

  const cases: Array<{ tier: RarityTier; label: string }> = [
    { tier: "common", label: "Common" },
    { tier: "rare", label: "Rare" },
    { tier: "super_rare", label: "Super Rare" },
  ];

  it.each(cases)(
    'renders "$label" and calls onOpenComplete once when tier is "$tier"',
    ({ tier, label }) => {
      const onOpenComplete = vi.fn();
      render(<ChestReducedMotion tier={tier} onOpenComplete={onOpenComplete} />);

      expect(screen.getByText(label)).toBeInTheDocument();
      expect(onOpenComplete).toHaveBeenCalledTimes(1);
    },
  );
});
