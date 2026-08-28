import { describe, expect, it } from "vitest";
import { generateBoard, minePositions } from "./game-core";
import { createVisibleState, reasonFromVisible, solveBoard } from "./solver";

describe("standard solver", () => {
  it("直接推論は見えているClueだけからsafeを確定する", () => {
    const visible = createVisibleState({ colorCount: 3, mineCount: 20 });
    visible.clues[40] = [0, 0, 0];
    visible.domains[40] = 1;
    const result = reasonFromVisible(visible);
    const neighborIndices = [30, 31, 32, 39, 41, 48, 49, 50];
    expect(neighborIndices.every((index) => visible.domains[index] === 1)).toBe(true);
    expect(result.changes.length).toBeGreaterThan(0);
  });

  it("既存の比較Seedを3色・4色ともNo-Guessで解ける", () => {
    for (const seed of ["set2-000050", "set2-000179", "set2-000302"]) {
      for (const colorCount of [3, 4] as const) {
        const board = generateBoard({ seed, mineCount: 20, colorCount, firstRow: 4, firstCol: 4 });
        const result = solveBoard(board);
        expect(result.noGuess, `${seed}/${colorCount} colors stalled`).toBe(true);
        expect(result.trace?.[0].type).toBe("initial-reveal");
        expect(result.trace?.some((step) => step.type === "reasoning-round")).toBe(true);
      }
    }
  });

  it("多色で解けても単色化すると詰まるcolor-essential盤面を識別する", () => {
    const board = generateBoard({ seed: "set2-000050", mineCount: 20, colorCount: 3, firstRow: 4, firstCol: 4 });
    expect(solveBoard(board, { mode: "color" }).noGuess).toBe(true);
    expect(solveBoard(board, { mode: "mono" }).noGuess).toBe(false);
  });

  it("Solverは爆弾配置を変更せず、多数Seedでsoundnessを維持する", () => {
    for (let sample = 0; sample < 100; sample += 1) {
      const colorCount = sample % 2 === 0 ? 3 : 4;
      const board = generateBoard({
        seed: `soundness-${sample}`,
        mineCount: 20,
        colorCount,
        firstRow: sample % 9,
        firstCol: Math.floor(sample / 9) % 9
      });
      const before = minePositions(board);
      expect(() => solveBoard(board, { includeTrace: false })).not.toThrow();
      expect(minePositions(board)).toEqual(before);
    }
  });
});
