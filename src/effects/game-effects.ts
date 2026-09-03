import type { Coordinate } from "../game/types";

export const EFFECT_TIMING = {
  cellOpenMs: 140,
  cellScanMs: 275,
  cascadeStepMs: 21,
  cascadeMaxDelayMs: 168,
  cascadeBoardPulseMs: 145,
  explosionResultDelayMs: 500,
  cinematicExplosionBeatMs: 220,
  cinematicExplosionResultDelayMs: 1050,
  clearBoardHoldMs: 170,
  clearWaveStepMs: 18,
  clearCellMs: 170,
  clearJingleDelayMs: 470,
  clearBoardPulseDelayMs: 625,
  clearBoardPulseMs: 120,
  clearResultDelayMs: 790,
  superClearResultDelayMs: 1180,
  reducedResultDelayMs: 80
} as const;

export type OpeningLightVariant = "current" | "frame" | "scan" | "cross" | "double";
export type ExplosionEffectVariant = "pixel" | "cinematic" | "shockwave";
export type ClearEffectVariant = "wave" | "victory" | "super";

/** Product choices live in one place; every alternative remains available in EFFECT LAB. */
export const PRODUCT_EFFECT_SELECTION = {
  openingLight: "scan",
  explosion: "cinematic",
  regularClear: "wave",
  newBestClear: "super"
} as const satisfies {
  openingLight: OpeningLightVariant;
  explosion: ExplosionEffectVariant;
  regularClear: ClearEffectVariant;
  newBestClear: ClearEffectVariant;
};

export type RevealFeedbackTier = "single" | "small" | "medium" | "large" | "huge";

export interface RevealFeedback {
  tier: RevealFeedbackTier;
  pitchShiftSemitones: number;
  addBody: boolean;
  accentNotes: 0 | 1 | 2;
  boardPulseScale: number;
}

export interface CountedRevealPlan {
  pulseCount: number;
  intervalMs: number;
  finalLayers: 0 | 2 | 3;
  pitchShiftSemitones: number;
  durationMs: number;
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
  | { id: number; type: "clear"; variant: ClearEffectVariant }
  | { id: number; type: "explosion"; origin: Coordinate; variant: ExplosionEffectVariant };

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

export function countedRevealPlan(revealedCount: number): CountedRevealPlan {
  const count = Math.max(1, Math.floor(revealedCount));
  if (count <= 4) {
    const intervalMs = count === 1 ? 0 : count === 2 ? 35 : count === 3 ? 30 : 25;
    return {
      pulseCount: count,
      intervalMs,
      finalLayers: 0,
      pitchShiftSemitones: 0,
      durationMs: (count - 1) * intervalMs + 55
    };
  }
  if (count <= 8) {
    return {
      pulseCount: 4,
      intervalMs: 23,
      finalLayers: 2,
      pitchShiftSemitones: 1 + (count - 5) * 0.35,
      durationMs: 155
    };
  }
  if (count <= 16) {
    return {
      pulseCount: 5,
      intervalMs: 20,
      finalLayers: 3,
      pitchShiftSemitones: 2.2 + (count - 9) * 0.22,
      durationMs: 195
    };
  }
  return {
    pulseCount: 6,
    intervalMs: 18,
    finalLayers: 3,
    pitchShiftSemitones: Math.min(4.2 + (count - 17) * 0.12, 7),
    durationMs: 245
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

export function clearEffectForResult(isNewBest: boolean): ClearEffectVariant {
  return isNewBest ? PRODUCT_EFFECT_SELECTION.newBestClear : PRODUCT_EFFECT_SELECTION.regularClear;
}

export function resultDelay(effect: BoardOutcomeEffect, reducedMotion: boolean): number {
  if (reducedMotion) return EFFECT_TIMING.reducedResultDelayMs;
  if (effect.type === "explosion") {
    return effect.variant === "cinematic"
      ? EFFECT_TIMING.cinematicExplosionResultDelayMs
      : EFFECT_TIMING.explosionResultDelayMs;
  }
  return effect.variant === "super" ? EFFECT_TIMING.superClearResultDelayMs : EFFECT_TIMING.clearResultDelayMs;
}

export function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
}
