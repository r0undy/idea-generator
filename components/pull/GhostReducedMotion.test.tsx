// @vitest-environment jsdom
/**
 * Tests for GhostReducedMotion, the static (reduced-motion) pull vessel.
 *
 * The animated GhostVessel is not mounted for reduced-motion users; this
 * component stands in for it and must still honor the reveal contract: fire
 * `onOpenComplete` exactly once after a tier is awarded, and never fire while
 * idle (tier === null).
 */

import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";

import GhostReducedMotion from "./GhostReducedMotion";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
  cleanup();
});

describe("GhostReducedMotion", () => {
  it("does not call onOpenComplete while idle (tier === null)", () => {
    const onOpenComplete = vi.fn();
    render(<GhostReducedMotion tier={null} onOpenComplete={onOpenComplete} />);
    vi.advanceTimersByTime(2000);
    expect(onOpenComplete).not.toHaveBeenCalled();
  });

  it("calls onOpenComplete once after a tier is awarded", () => {
    const onOpenComplete = vi.fn();
    const { rerender } = render(
      <GhostReducedMotion tier={null} onOpenComplete={onOpenComplete} />,
    );

    rerender(
      <GhostReducedMotion tier="super_rare" onOpenComplete={onOpenComplete} />,
    );

    expect(onOpenComplete).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1000);
    expect(onOpenComplete).toHaveBeenCalledTimes(1);
  });
});
