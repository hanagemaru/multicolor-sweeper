import { describe, expect, it } from "vitest";
import { hasRankingGap } from "./ranking";
import {
  buildRankingPreviewResponse,
  readRankingPreviewCase,
  type RankingPreviewCase
} from "./ranking-preview";

function ranksFor(playerRank: RankingPreviewCase): number[] {
  return buildRankingPreviewResponse(playerRank, 20).entries.map((entry) => entry.rank);
}

function gapPairs(playerRank: RankingPreviewCase): Array<[number, number]> {
  const entries = buildRankingPreviewResponse(playerRank, 20).entries;
  return entries.flatMap((entry, index) => {
    const previous = entries[index - 1];
    return hasRankingGap(previous, entry) && previous ? [[previous.rank, entry.rank] as [number, number]] : [];
  });
}

describe("ranking preview cases", () => {
  it("shows ranks 1-10 when the player is rank 1", () => {
    expect(ranksFor(1)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(gapPairs(1)).toEqual([]);
  });

  it("joins the nearby range when the player is rank 11", () => {
    expect(ranksFor(11)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]);
    expect(gapPairs(11)).toEqual([]);
  });

  it("joins the nearby range when the player is rank 12", () => {
    expect(ranksFor(12)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]);
    expect(gapPairs(12)).toEqual([]);
  });

  it("keeps one real gap when the player is rank 127", () => {
    expect(ranksFor(127)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 124, 125, 126, 127, 128, 129, 130]);
    expect(gapPairs(127)).toEqual([[10, 124]]);
  });

  it("marks exactly one row as the player", () => {
    for (const playerRank of [1, 11, 12, 127] as const) {
      const response = buildRankingPreviewResponse(playerRank, 20);
      expect(response.yourRank).toBe(playerRank);
      expect(response.entries.filter((entry) => entry.isPlayer).map((entry) => entry.rank)).toEqual([playerRank]);
    }
  });

  it("enables the query only on PR preview hosts", () => {
    expect(readRankingPreviewCase({
      hostname: "pr-41-multicolor-sweeper.jibunnha.workers.dev",
      search: "?ranking-test=127"
    })).toBe(127);
    expect(readRankingPreviewCase({
      hostname: "mcsweeper.hanage.app",
      search: "?ranking-test=127"
    })).toBeNull();
    expect(readRankingPreviewCase({
      hostname: "multicolor-sweeper.jibunnha.workers.dev",
      search: "?ranking-test=127"
    })).toBeNull();
  });
});
