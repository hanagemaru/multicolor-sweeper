import { describe, expect, it } from "vitest";
import { minePositions } from "./game-core";
import { attemptSeed, evaluateCandidate, generateNoGuess } from "./no-guess-generator";
import type { MineCount } from "./types";

describe("condition C generator", () => {
  it("attempt indexを含むSeedは決定論的", () => {
    expect(attemptSeed("daily", 12)).toBe("daily|attempt:12");
    expect(attemptSeed("daily", 12)).not.toBe(attemptSeed("daily", 11));
  });

  it("同一候補の3色・4色は爆弾位置が共通", () => {
    const result = evaluateCandidate({ baseSeed: "positions", attempt: 3, firstRow: 4, firstCol: 4 });
    expect(result.board4).not.toBeNull();
    expect(minePositions(result.board3)).toEqual(minePositions(result.board4!));
  });

  it("同一条件の生成結果は毎回同じ", () => {
    const options = {
      baseSeed: "reproducible-generation",
      filter: "C" as const,
      maxAttempts: 2_000,
      mineCount: 20 as const,
      firstRow: 0,
      firstCol: 4,
      includeTrace: false
    };
    const first = generateNoGuess(options);
    const second = generateNoGuess(options);
    expect("failed" in first).toBe(false);
    expect("failed" in second).toBe(false);
    if ("failed" in first || "failed" in second) return;
    expect(first.seed).toBe(second.seed);
    expect(first.attempt).toBe(second.attempt);
    expect(first.attempts).toBe(second.attempts);
    expect(first.flags).toEqual(second.flags);
    expect(minePositions(first.board3)).toEqual(minePositions(second.board3));
  });

  it.each([15, 20, 25] as MineCount[])("%i爆弾を条件Cで生成できる", (mineCount) => {
    const result = generateNoGuess({
      baseSeed: "difficulty-test-1",
      filter: "C",
      maxAttempts: 2_000,
      mineCount,
      firstRow: 4,
      firstCol: 4,
      includeTrace: false
    });
    expect("failed" in result).toBe(false);
    if ("failed" in result) return;
    expect(result.flags.C).toBe(true);
    expect(result.results.three.noGuess).toBe(true);
    expect(result.results.four?.noGuess).toBe(true);
    expect(result.results.mono?.noGuess).toBe(false);
    expect(result.results.four!.stats.reasoningRounds)
      .toBeLessThanOrEqual(result.results.three.stats.reasoningRounds);
    expect(result.board4).not.toBeNull();
    expect(minePositions(result.board3)).toEqual(minePositions(result.board4!));
  }, 20_000);
});
