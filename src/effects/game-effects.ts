import type { Coordinate } from "../game/types";

export const EFFECT_TIMING = {
  cellOpenMs: 130,
  cascadeStepMs: 24,
  cascadeMaxDelayMs: 288,
  explosionResultDelayMs: 460,
  clearBoardHoldMs: 170,
  clearWaveStepMs: 18,
  clearCellMs: 170,
  clearJingleDelayMs: 470,
  clearResultDelayMs: 760,
  reducedResultDelayMs: 80
} as const;

export interface CellOpeningEffect {
  id: number;
  delayMs: number;
}

export type CellOpeningEffects = Record<string, CellOpeningEffect>;

export type BoardOutcomeEffect =
  | { id: number; type: "clear" }
  | { id: number; type: "explosion"; origin: Coordinate };

export function cellKey(row: number, col: number): string {
  return `${row}-${col}`;
}

export function chebyshevDistance(left: Coordinate, right: Coordinate): number {
  return Math.max(Math.abs(left.row - right.row), Math.abs(left.col - right.col));
}

export function openingEffectsForCells(
  cells: readonly Coordinate[],
  origin: Coordinate,
  id: number
): CellOpeningEffects {
  const cascade = cells.length > 1;
  return Object.fromEntries(cells.map((cell) => {
    const delayMs = cascade
      ? Math.min(chebyshevDistance(origin, cell) * EFFECT_TIMING.cascadeStepMs, EFFECT_TIMING.cascadeMaxDelayMs)
      : 0;
    return [cellKey(cell.row, cell.col), { id, delayMs }];
  }));
}

export function clearWaveDelay(row: number, col: number): number {
  return EFFECT_TIMING.clearBoardHoldMs + (row + col) * EFFECT_TIMING.clearWaveStepMs;
}

export function resultDelay(type: BoardOutcomeEffect["type"], reducedMotion: boolean): number {
  if (reducedMotion) return EFFECT_TIMING.reducedResultDelayMs;
  return type === "clear" ? EFFECT_TIMING.clearResultDelayMs : EFFECT_TIMING.explosionResultDelayMs;
}

export function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
}
