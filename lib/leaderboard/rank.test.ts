import { describe, it, expect } from "vitest";

import { rankLeaderboard } from "./rank";

describe("rankLeaderboard", () => {
  it("orders by idea count, highest first", () => {
    const result = rankLeaderboard(
      [
        { id: "a", name: "ava" },
        { id: "b", name: "ben" },
        { id: "c", name: "cleo" },
      ],
      { a: 3, b: 9, c: 5 },
    );
    expect(result.map((e) => e.id)).toEqual(["b", "c", "a"]);
    expect(result.map((e) => e.rank)).toEqual([1, 2, 3]);
  });

  it("defaults missing users to a count of 0", () => {
    const result = rankLeaderboard(
      [
        { id: "a", name: "ava" },
        { id: "b", name: "ben" },
      ],
      { a: 4 },
    );
    expect(result.find((e) => e.id === "b")?.count).toBe(0);
    expect(result[0].id).toBe("a");
  });

  it("gives tied counts the same rank (competition ranking) and breaks ties by name", () => {
    const result = rankLeaderboard(
      [
        { id: "a", name: "zoe" },
        { id: "b", name: "amy" },
        { id: "c", name: "bob" },
      ],
      { a: 5, b: 5, c: 1 },
    );
    // amy and zoe tie at 5 -> both rank 1, amy first by name; bob rank 3.
    expect(result.map((e) => e.name)).toEqual(["amy", "zoe", "bob"]);
    expect(result.map((e) => e.rank)).toEqual([1, 1, 3]);
  });

  it("returns an empty list for no users", () => {
    expect(rankLeaderboard([], {})).toEqual([]);
  });
});
