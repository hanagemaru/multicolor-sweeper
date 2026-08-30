import { describe, expect, it } from "vitest";
import { classifyFlagSwipe, FLAG_GESTURES } from "./rules";

describe("flag swipe directions", () => {
  it("3色は左上=赤、右上=青、下=緑、上=無色になる", () => {
    expect(classifyFlagSwipe(-14, -14, 3)).toBe(0);
    expect(classifyFlagSwipe(14, -14, 3)).toBe(1);
    expect(classifyFlagSwipe(0, 20, 3)).toBe(2);
    expect(classifyFlagSwipe(0, -20, 3)).toBe("neutral");
  });

  it("3色の下スワイプは左右にずれても緑になる", () => {
    expect(classifyFlagSwipe(-12, 20, 3)).toBe(2);
    expect(classifyFlagSwipe(12, 20, 3)).toBe(2);
    expect(classifyFlagSwipe(-20, 10, 3)).toBe(0);
    expect(classifyFlagSwipe(20, 10, 3)).toBe(1);
  });

  it("4色は従来の4象限＋上中央の無色判定を維持する", () => {
    expect(classifyFlagSwipe(-14, -14, 4)).toBe(0);
    expect(classifyFlagSwipe(14, -14, 4)).toBe(1);
    expect(classifyFlagSwipe(-14, 14, 4)).toBe(2);
    expect(classifyFlagSwipe(14, 14, 4)).toBe(3);
    expect(classifyFlagSwipe(0, -20, 4)).toBe("neutral");
  });

  it("3色ガイドは黄旗を含まず緑を下向きにする", () => {
    expect(FLAG_GESTURES[3].map(({ flag }) => flag)).toEqual([0, 1, 2, "neutral"]);
    expect(FLAG_GESTURES[3].find(({ flag }) => flag === 2)?.angle).toBe(180);
  });

  it("4色ガイドは既存5方向を維持する", () => {
    expect(FLAG_GESTURES[4].map(({ flag, angle }) => [flag, angle])).toEqual([
      [0, -45],
      [1, 45],
      [2, -135],
      [3, 135],
      ["neutral", 0]
    ]);
  });
});
