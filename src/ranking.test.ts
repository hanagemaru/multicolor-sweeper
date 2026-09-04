import { describe, expect, it } from "vitest";
import {
  bestRecordStorageKey,
  canSubmitResult,
  destinationAfterSuccessfulSubmit,
  playerRank,
  rankedEntries,
  resetLegacyTestRecordsOnce,
  submittedRecordStorageKey
} from "./ranking";

describe("ranking", () => {
  it("sorts faster times first while keeping 3-color and 4-color records together", () => {
    const ranked = rankedEntries([
      { name: "B", colorCount: 4, timeMs: 2000, mineCount: 15 },
      { name: "A", colorCount: 3, timeMs: 1000, mineCount: 15 }
    ]);
    expect(ranked.map((entry) => entry.name)).toEqual(["A", "B"]);
    expect(ranked.map((entry) => entry.colorCount)).toEqual([3, 4]);
    expect(ranked.map((entry) => entry.rank)).toEqual([1, 2]);
  });

  it("exposes the player rank from online entries", () => {
    const ranked = rankedEntries([
      { name: "FAST", colorCount: 4, timeMs: 1000, mineCount: 20 },
      { name: "YOU", colorCount: 3, timeMs: 2000, mineCount: 20, isPlayer: true }
    ]);
    expect(playerRank(ranked)).toBe(2);
  });

  it("opens the ranking automatically only after a new best", () => {
    expect(destinationAfterSuccessfulSubmit(true)).toBe("ranking");
    expect(destinationAfterSuccessfulSubmit(false)).toBe("result");
  });

  it("allows submission only for a new best", () => {
    expect(canSubmitResult(true)).toBe(true);
    expect(canSubmitResult(false)).toBe(false);
  });

  it("clears legacy test records once while keeping profile data", () => {
    const values = new Map<string, string>([
      [bestRecordStorageKey(15), '{"timeMs":7910,"colorCount":3}'],
      [submittedRecordStorageKey(15), '{"timeMs":234930,"colorCount":3}'],
      ["multicolor-sweeper-player-name", "PLAYER"],
      ["multicolor-sweeper-language", "ja"]
    ]);
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      removeItem: (key: string) => { values.delete(key); },
      setItem: (key: string, value: string) => { values.set(key, value); }
    };

    expect(resetLegacyTestRecordsOnce(storage)).toBe(true);
    expect(values.has(bestRecordStorageKey(15))).toBe(false);
    expect(values.has(submittedRecordStorageKey(15))).toBe(false);
    expect(values.get("multicolor-sweeper-player-name")).toBe("PLAYER");
    expect(values.get("multicolor-sweeper-language")).toBe("ja");

    values.set(bestRecordStorageKey(15), '{"timeMs":120000,"colorCount":3}');
    expect(resetLegacyTestRecordsOnce(storage)).toBe(false);
    expect(values.has(bestRecordStorageKey(15))).toBe(true);
  });
});
