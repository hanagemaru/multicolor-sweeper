import { describe, expect, it } from "vitest";
import { countFlags, createEmptyBoard, remainingFlagCount, setFlag } from "./game-core";

describe("FLAGS counter", () => {
  it.each([15, 20, 25] as const)("%i爆弾では残り旗数が爆弾数から始まる", (mineCount) => {
    const board = createEmptyBoard(3, mineCount);
    expect(countFlags(board)).toBe(0);
    expect(remainingFlagCount(board)).toBe(mineCount);
  });

  it("旗の設置・色変更・取り外しで残り旗数が正しく変化する", () => {
    const board = createEmptyBoard(4, 15);

    setFlag(board, 0, 0, 0);
    expect(remainingFlagCount(board)).toBe(14);

    setFlag(board, 0, 0, 1);
    expect(countFlags(board)).toBe(1);
    expect(remainingFlagCount(board)).toBe(14);

    setFlag(board, 0, 0, 1);
    expect(countFlags(board)).toBe(0);
    expect(remainingFlagCount(board)).toBe(15);
  });

  it.each([3, 4] as const)("%i色モードで爆弾数を超えて旗を置け、FLAGSが負数になる", (colorCount) => {
    const board = createEmptyBoard(colorCount, 15);

    for (let index = 0; index < 16; index += 1) {
      setFlag(board, Math.floor(index / 9), index % 9, "neutral");
    }

    expect(countFlags(board)).toBe(16);
    expect(remainingFlagCount(board)).toBe(-1);
  });
});
