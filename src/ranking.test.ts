import { describe, expect, it } from "vitest";
import {
  destinationAfterSuccessfulSubmit,
  mockRanking,
  playerRank,
  rankedEntries,
  rankingWithPlayer
} from "./ranking";

describe("ranking", () => {
  it("mixes 3-color and 4-color records in the same mine-count category", () => {
    const entries = mockRanking(20);
    expect(new Set(entries.map((entry) => entry.colorCount))).toEqual(new Set([3, 4]));
  });

  it("sorts faster times first", () => {
    const ranked = rankedEntries([
      { name: "B", colorCount: 4, timeMs: 2000, mineCount: 15 },
      { name: "A", colorCount: 3, timeMs: 1000, mineCount: 15 }
    ]);
    expect(ranked.map((entry) => entry.name)).toEqual(["A", "B"]);
    expect(ranked.map((entry) => entry.rank)).toEqual([1, 2]);
  });

  it("inserts a player record and exposes the resulting rank", () => {
    const entries = rankingWithPlayer(15, "YOU", 3, 19000);
    expect(playerRank(entries)).toBe(2);
    expect(entries[1]).toMatchObject({ name: "YOU", colorCount: 3, isPlayer: true });
  });

  it("does not insert an unnamed player", () => {
    expect(rankingWithPlayer(25, "   ", 4, 1000).some((entry) => entry.isPlayer)).toBe(false);
  });

  it("opens the ranking automatically only after a new best", () => {
    expect(destinationAfterSuccessfulSubmit(true)).toBe("ranking");
    expect(destinationAfterSuccessfulSubmit(false)).toBe("result");
  });
});
