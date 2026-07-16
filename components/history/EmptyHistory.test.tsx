// @vitest-environment jsdom
/**
 * Unit test for EmptyHistory: the empty-history state shown when the
 * authenticated User has zero `pull_history` rows.
 *
 * This is a simple example-based test (no input data space to vary), unlike
 * the property test in HistoryList-completeness.test.tsx.
 *
 * Validates: Requirements 6.3
 */
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import EmptyHistory from "./EmptyHistory";

afterEach(() => {
  cleanup();
});

describe("EmptyHistory - empty-history state (Requirement 6.3)", () => {
  it("shows a no-history message and a link back to the pull screen", () => {
    render(<EmptyHistory />);

    expect(
      screen.getByText(/no pulls yet/i),
    ).toBeInTheDocument();

    const link = screen.getByRole("link", { name: /go pull/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/");
  });
});
