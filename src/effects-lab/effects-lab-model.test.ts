import { describe, expect, it } from "vitest";
import {
  countedRevealPlan,
  labCellTimings,
  openingCellOrder,
  randomLabDemo
} from "./effects-lab-model";

describe("countedRevealPlan", () => {
  it("plays one audible pulse for every opened cell up to four", () => {
    for (let count = 1; count <= 4; count += 1) {
      const plan = countedRevealPlan(count);
      expect(plan.pulseCount).toBe(count);
      expect(plan.finalLayers).toBe(0);
    }
  });

  it("compresses larger openings into a short rising run and layered finish", () => {
    expect(countedRevealPlan(5)).toMatchObject({ pulseCount: 4, finalLayers: 2 });
    expect(countedRevealPlan(10)).toMatchObject({ pulseCount: 5, finalLayers: 3 });
    expect(countedRevealPlan(25)).toMatchObject({ pulseCount: 6, finalLayers: 3 });
    expect(countedRevealPlan(25).durationMs).toBeLessThanOrEqual(250);
    expect(countedRevealPlan(25).pitchShiftSemitones).toBeGreaterThan(countedRevealPlan(5).pitchShiftSemitones);
  });

  it("defensively treats zero as one cell", () => {
    expect(countedRevealPlan(0)).toEqual(countedRevealPlan(1));
  });
});

describe("lab board timing", () => {
  it("starts opening waves at the center and keeps the last ring under 100ms", () => {
    const cells = labCellTimings(9);
    expect(cells[40]).toMatchObject({ row: 4, col: 4, distance: 0, openDelayMs: 0 });
    expect(Math.max(...cells.map((cell) => cell.openDelayMs))).toBe(84);
    expect(openingCellOrder(9)[0]).toBe(40);
  });

  it("runs clear timing diagonally across the board", () => {
    const cells = labCellTimings(9);
    expect(cells[0].diagonalDelayMs).toBe(0);
    expect(cells[80].diagonalDelayMs).toBe(288);
  });
});

describe("randomLabDemo", () => {
  it("can select each category deterministically", () => {
    expect(randomLabDemo(() => 0)).toEqual({ kind: "opening", count: 1, variant: "current" });
    expect(randomLabDemo(() => 0.4)).toEqual({ kind: "explosion", variant: "cinematic" });
    expect(randomLabDemo(() => 0.99)).toEqual({ kind: "clear", variant: "super" });
  });
});
