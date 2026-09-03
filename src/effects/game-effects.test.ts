import { describe, expect, it } from "vitest";
import {
  EFFECT_TIMING,
  cascadePulseForReveal,
  cellKey,
  chebyshevDistance,
  clearWaveDelay,
  openingEffectsForCells,
  revealFeedbackForCount,
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

  it("開封数に応じて音の高さ・厚み・終端アクセントを段階的に強める", () => {
    expect(revealFeedbackForCount(1)).toMatchObject({ tier: "single", pitchShiftSemitones: 0, accentNotes: 0 });
    expect(revealFeedbackForCount(5)).toMatchObject({ tier: "small", pitchShiftSemitones: 1, addBody: false });
    expect(revealFeedbackForCount(12)).toMatchObject({ tier: "medium", pitchShiftSemitones: 2, addBody: true });
    expect(revealFeedbackForCount(24)).toMatchObject({ tier: "large", pitchShiftSemitones: 3, accentNotes: 1 });
    expect(revealFeedbackForCount(25)).toMatchObject({ tier: "huge", pitchShiftSemitones: 4, accentNotes: 2 });
  });

  it("13マス以上の連鎖だけ開封完了付近に盤面ポップを加える", () => {
    const cells = Array.from({ length: 13 }, (_, index) => ({ row: Math.floor(index / 9), col: index % 9 }));
    const effects = openingEffectsForCells(cells, { row: 0, col: 0 }, 9);
    expect(cascadePulseForReveal(effects, 12, 9)).toBeNull();
    expect(cascadePulseForReveal(effects, 13, 9)).toEqual({
      id: 9,
      delayMs: Math.max(...Object.values(effects).map((effect) => effect.delayMs)) + EFFECT_TIMING.cellOpenMs - 20,
      scale: revealFeedbackForCount(13).boardPulseScale
    });
  });

  it("reduced motionでは結果表示待ちを短縮する", () => {
    expect(resultDelay("clear", true)).toBe(EFFECT_TIMING.reducedResultDelayMs);
    expect(resultDelay("explosion", false)).toBe(EFFECT_TIMING.explosionResultDelayMs);
  });
});
