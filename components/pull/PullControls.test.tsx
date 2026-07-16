// @vitest-environment jsdom
/**
 * Unit tests for PullControls: tap-target sizing and the in-progress
 * single-flight lock.
 *
 * The global vitest config runs in the "node" environment (see
 * vitest.config.ts) because most of the suite exercises pure server-side
 * logic. This file needs a DOM to render a "use client" component, so it
 * opts into jsdom via the `@vitest-environment` pragma above rather than
 * changing the global config.
 *
 * Tailwind utility classes (e.g. `min-h-11`) are not compiled/applied in
 * jsdom, so `getComputedStyle` would not reflect real pixel dimensions.
 * Asserting the presence of the exact utility classes in `className` is a
 * simpler, deterministic substitute for verifying the >=44px tap-target
 * requirement (Requirement 7.2) without a full CSS build pipeline in tests.
 */
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import PullControls from "./PullControls";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("PullControls - tap target size", () => {
  it("renders both buttons with >=44px tap-target utility classes", () => {
    render(<PullControls />);

    const singleButton = screen.getByRole<HTMLButtonElement>("button", { name: "Pull x1" });
    const batchButton = screen.getByRole<HTMLButtonElement>("button", { name: "Pull x10" });

    for (const button of [singleButton, batchButton]) {
      expect(button.className).toContain("min-h-11");
      expect(button.className).toContain("min-w-11");
    }
  });
});

// Feature: gacha-idea-generator, Property 13: In-progress single-flight lock
describe("PullControls - single-flight lock (Property 13)", () => {
  let resolveFetch: (value: Response) => void;

  beforeEach(() => {
    const pending = new Promise<Response>((resolve) => {
      resolveFetch = resolve;
    });
    const fetchMock = vi.fn(() => pending);
    vi.stubGlobal("fetch", fetchMock);
  });

  it("ignores additional pull initiations while a request is in flight", async () => {
    render(<PullControls />);

    const singleButton = screen.getByRole<HTMLButtonElement>("button", { name: "Pull x1" });
    const batchButton = screen.getByRole<HTMLButtonElement>("button", { name: "Pull x10" });

    // First tap starts the in-flight request.
    fireEvent.click(singleButton);

    // Wait for the pending state to be committed.
    await screen.findByText("Pulling...");
    expect(singleButton.disabled).toBe(true);
    expect(batchButton.disabled).toBe(true);

    // Additional taps while the first request is still pending must be
    // ignored, not queued.
    fireEvent.click(singleButton);
    fireEvent.click(batchButton);

    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    expect(singleButton.disabled).toBe(true);
    expect(batchButton.disabled).toBe(true);

    // Resolve the in-flight request; the lock should clear and controls
    // become interactive again.
    resolveFetch(
      new Response(JSON.stringify({ items: [], pityAfter: 1 }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await waitFor(() => {
      expect(singleButton.disabled).toBe(false);
    });
    expect(batchButton.disabled).toBe(false);
    expect(screen.queryByText("Pulling...")).toBeNull();
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });
});
