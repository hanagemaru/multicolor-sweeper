import type { Coordinate } from "../game/types";

export const EFFECT_TIMING = {
  cellOpenMs: 140,
  cascadeStepMs: 21,
  cascadeMaxDelayMs: 168,
  cascadeBoardPulseMs: 145,
  explosionResultDelayMs: 500,
  clearBoardHoldMs: 170,
  clearWaveStepMs: 18,
  clearCellMs: 170,
  clearJingleDelayMs: 470,
  clearBoardPulseDelayMs: 625,
  clearBoardPulseMs: 120,
  clearResultDelayMs: 790,
  reducedResultDelayMs: 80
} as const;

export type RevealFeedbackTier = "single" | "small" | "medium" | "large" | "huge";

export interface RevealFeedback {
  tier: RevealFeedbackTier;
  pitchShiftSemitones: number;
  addBody: boolean;
  accentNotes: 0 | 1 | 2;
  boardPulseScale: number;
}

export interface CellOpeningEffect {
  id: number;
  delayMs: number;
}

export type CellOpeningEffects = Record<string, CellOpeningEffect>;

export interface CascadePulseEffect {
  id: number;
  delayMs: number;
  scale: number;
}

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

export function revealFeedbackForCount(revealedCount: number): RevealFeedback {
  if (revealedCount >= 25) {
    return {
      tier: "huge",
      pitchShiftSemitones: 4,
      addBody: true,
      accentNotes: 2,
      boardPulseScale: 1.022
    };
  }
  if (revealedCount >= 13) {
    return {
      tier: "large",
      pitchShiftSemitones: 3,
      addBody: true,
      accentNotes: 1,
      boardPulseScale: 1.014
    };
  }
  if (revealedCount >= 6) {
    return {
      tier: "medium",
      pitchShiftSemitones: 2,
      addBody: true,
      accentNotes: 0,
      boardPulseScale: 1
    };
  }
  if (revealedCount >= 2) {
    return {
      tier: "small",
      pitchShiftSemitones: 1,
      addBody: false,
      accentNotes: 0,
      boardPulseScale: 1
    };
  }
  return {
    tier: "single",
    pitchShiftSemitones: 0,
    addBody: false,
    accentNotes: 0,
    boardPulseScale: 1
  };
}

export function cascadePulseForReveal(
  effects: CellOpeningEffects,
  revealedCount: number,
  id: number
): CascadePulseEffect | null {
  const feedback = revealFeedbackForCount(revealedCount);
  if (feedback.boardPulseScale === 1) return null;
  const lastOpeningDelay = Math.max(0, ...Object.values(effects).map((effect) => effect.delayMs));
  return {
    id,
    delayMs: lastOpeningDelay + EFFECT_TIMING.cellOpenMs - 20,
    scale: feedback.boardPulseScale
  };
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
