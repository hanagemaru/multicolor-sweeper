import { describe, expect, it } from "vitest";
import {
  canChord,
  checkWin,
  chordCell,
  countFlags,
  createEmptyBoard,
  generateBoard,
  getFirstClickExclusions,
  mineColorCounts,
  minePositions,
  recomputeAdjacentCounts,
  reviewMark,
  revealCell,
  setFlag
} from "./game-core";
import { GRID_SIZE } from "./rules";
import type { Cell } from "./types";

describe("game core", () => {
  it("同じSeed・初手なら同じ盤面になる", () => {
    const options = { seed: "SAME-SEED", mineCount: 25, colorCount: 4 as const, firstRow: 4, firstCol: 4 };
    expect(generateBoard(options)).toEqual(generateBoard(options));
  });

  it("3色と4色で爆弾の位置は共通になる", () => {
    const common = { seed: "COMPARE", mineCount: 25, firstRow: 2, firstCol: 6 };
    const threeColors = generateBoard({ ...common, colorCount: 3 });
    const fourColors = generateBoard({ ...common, colorCount: 4 });
    expect(minePositions(threeColors)).toEqual(minePositions(fourColors));
  });

  it("爆弾数を増やすと同じSeedの配置に追加される", () => {
    const common = { seed: "DENSITY", colorCount: 4 as const, firstRow: 4, firstCol: 4 };
    const low = new Set(minePositions(generateBoard({ ...common, mineCount: 15 })));
    const high = new Set(minePositions(generateBoard({ ...common, mineCount: 40 })));
    expect([...low].every((position) => high.has(position))).toBe(true);
  });

  it("初手と周囲8マスには爆弾がない", () => {
    const board = generateBoard({ seed: "SAFE", mineCount: 40, colorCount: 4, firstRow: 4, firstCol: 4 });
    for (const position of getFirstClickExclusions(4, 4)) {
      const row = Math.floor(position / GRID_SIZE);
      const col = position % GRID_SIZE;
      expect(board.cells[row][col].mineColor).toBeNull();
    }
  });

  it("各色の爆弾数は最大1個差で均等になる", () => {
    for (const colorCount of [3, 4] as const) {
      const board = generateBoard({ seed: "BALANCED", mineCount: 25, colorCount, firstRow: 0, firstCol: 0 });
      const counts = mineColorCounts(board);
      expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(1);
    }
  });

  it("0マスの連鎖開放は旗を開かない", () => {
    const board = createEmptyBoard(3, 1, "chain");
    board.generated = true;
    board.cells[8][8].mineColor = 0;
    recomputeAdjacentCounts(board);
    setFlag(board, 4, 4, "neutral");
    const result = revealCell(board, 0, 0);
    expect(result.type).toBe("reveal");
    expect(board.cells[4][4].flag).toBe("neutral");
    expect(countFlags(board)).toBe(1);
  });

  it("安全マスをすべて開くと勝利になる", () => {
    const board = createEmptyBoard(3, 1, "win");
    board.generated = true;
    board.cells[8][8].mineColor = 0;
    recomputeAdjacentCounts(board);
    revealCell(board, 0, 0);
    expect(checkWin(board)).toBe(true);
  });

  it("混合Chordは色旗の上限と旗総数を満たすと動作する", () => {
    const board = createEmptyBoard(3, 2, "chord");
    board.generated = true;
    board.firstClick = { row: 4, col: 4 };
    board.cells[3][3].mineColor = 0;
    board.cells[3][4].mineColor = 1;
    recomputeAdjacentCounts(board);
    board.cells[4][4].state = "revealed";
    setFlag(board, 3, 3, 0);
    setFlag(board, 3, 4, "neutral");
    expect(canChord(board, 4, 4)).toBe(true);
    expect(chordCell(board, 4, 4).type).toBe("reveal");
  });

  it("色旗がClueを超える混合Chordは拒否する", () => {
    const board = createEmptyBoard(3, 2, "chord-invalid");
    board.generated = true;
    board.cells[3][3].mineColor = 0;
    board.cells[3][4].mineColor = 1;
    recomputeAdjacentCounts(board);
    board.cells[4][4].state = "revealed";
    setFlag(board, 3, 3, 0);
    setFlag(board, 3, 4, 0);
    expect(canChord(board, 4, 4)).toBe(false);
  });

  it("3色盤面は黄旗を拒否しChord用の旗数へ混入させない", () => {
    const board = createEmptyBoard(3, 1, "invalid-yellow");
    board.generated = true;
    board.cells[3][3].mineColor = 0;
    recomputeAdjacentCounts(board);
    board.cells[4][4].state = "revealed";

    setFlag(board, 3, 3, 3);
    expect(board.cells[3][3].flag).toBeNull();
    expect(countFlags(board)).toBe(0);

    setFlag(board, 3, 3, "neutral");
    expect(canChord(board, 4, 4)).toBe(true);
  });

  it("4色盤面では黄旗を受け付ける", () => {
    const board = createEmptyBoard(4, 1, "yellow-valid");
    setFlag(board, 0, 0, 3);
    expect(board.cells[0][0].flag).toBe(3);
  });
});

describe("答え合わせの判定", () => {
  const cell = (over: Partial<Cell>): Cell => ({
    row: 0,
    col: 0,
    state: "hidden",
    flag: null,
    mineColor: null,
    adjacentCounts: [0, 0, 0, 0],
    ...over
  });

  it("色まで当てた旗だけを正解とする", () => {
    expect(reviewMark(cell({ mineColor: 2, flag: 2 }))).toBe("correct-flag");
    expect(reviewMark(cell({ mineColor: 2, flag: 1 }))).toBe("mine-wrong-color");
    expect(reviewMark(cell({ mineColor: 2, flag: "neutral" }))).toBe("mine-wrong-color");
    expect(reviewMark(cell({ mineColor: 2, flag: null }))).toBe("mine");
  });

  it("爆弾でないマスの旗を誤りとする", () => {
    expect(reviewMark(cell({ mineColor: null, flag: 0 }))).toBe("wrong-flag");
    expect(reviewMark(cell({ mineColor: null, flag: "neutral" }))).toBe("wrong-flag");
    expect(reviewMark(cell({ mineColor: null, flag: null }))).toBeNull();
  });

  it("既に開いているマスには何も描かない", () => {
    expect(reviewMark(cell({ state: "revealed" }))).toBeNull();
    expect(reviewMark(cell({ state: "exploded", mineColor: 0 }))).toBeNull();
  });
});
