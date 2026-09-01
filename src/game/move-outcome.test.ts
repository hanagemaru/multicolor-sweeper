import { describe, expect, it } from "vitest";
import { createEmptyBoard, recomputeAdjacentCounts, revealCell } from "./game-core";
import { resolveMoveOutcome } from "./move-outcome";

describe("move outcome", () => {
  it("通常開封ではゲームを終了しない", () => {
    const board = createEmptyBoard(3, 1, "playing");
    board.generated = true;
    board.cells[4][4].mineColor = 0;
    recomputeAdjacentCounts(board);
    board.cells[0][0].state = "revealed";

    expect(resolveMoveOutcome(board, false)).toBeNull();
  });

  it("安全マスをすべて開くと勝利にする", () => {
    const board = createEmptyBoard(3, 1, "won");
    board.generated = true;
    board.cells[8][8].mineColor = 0;
    recomputeAdjacentCounts(board);
    revealCell(board, 0, 0);

    expect(resolveMoveOutcome(board, false)).toBe("won");
  });

  it("爆弾を開くと敗北にする", () => {
    const board = createEmptyBoard(3, 1, "lost");

    expect(resolveMoveOutcome(board, true)).toBe("lost");
  });
});
