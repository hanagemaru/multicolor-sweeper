import { describe, expect, it } from "vitest";
import {
  EFFECT_TIMING,
  cellKey,
  chebyshevDistance,
  clearWaveDelay,
  openingEffectsForCells,
  resultDelay
} from "./game-effects";

describe("game effect timing", () => {
  it("通常開封は遅延なしにする", () => {
    const effects = openingEffectsForCells([{ row: 2, col: 3 }], { row: 2, col: 3 }, 1);
    expect(effects[cellKey(2, 3)]).toEqual({ id: 1, delayMs: 0 });
  });

  it("連鎖は起点からの距離に応じて遅延し、上限を超えない", () => {
    const origin = { row: 0, col: 0 };
    const cells = [origin, { row: 1, col: 1 }, { row: 8, col: 8 }];
    const effects = openingEffectsForCells(cells, origin, 7);

    expect(chebyshevDistance(origin, cells[1])).toBe(1);
    expect(effects[cellKey(0, 0)].delayMs).toBe(0);
    expect(effects[cellKey(1, 1)].delayMs).toBe(EFFECT_TIMING.cascadeStepMs);
    expect(effects[cellKey(8, 8)].delayMs).toBeLessThanOrEqual(EFFECT_TIMING.cascadeMaxDelayMs);
  });

  it("CLEAR波は左上から右下へ進む", () => {
    expect(clearWaveDelay(0, 0)).toBe(EFFECT_TIMING.clearBoardHoldMs);
    expect(clearWaveDelay(8, 8)).toBeGreaterThan(clearWaveDelay(0, 0));
  });

  it("reduced motionでは結果表示待ちを短縮する", () => {
    expect(resultDelay("clear", true)).toBe(EFFECT_TIMING.reducedResultDelayMs);
    expect(resultDelay("explosion", false)).toBe(EFFECT_TIMING.explosionResultDelayMs);
  });
});
