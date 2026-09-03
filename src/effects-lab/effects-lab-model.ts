export const OPEN_COUNTS = [1, 2, 3, 5, 10, 25] as const;

export type OpenCount = (typeof OPEN_COUNTS)[number];
export type LightVariant = "current" | "frame" | "scan" | "cross" | "double";
export type ExplosionVariant = "pixel" | "cinematic" | "shockwave";
export type ClearVariant = "wave" | "victory" | "super";

export const LIGHT_VARIANTS: readonly LightVariant[] = ["current", "frame", "scan", "cross", "double"];
export const EXPLOSION_VARIANTS: readonly ExplosionVariant[] = ["pixel", "cinematic", "shockwave"];
export const CLEAR_VARIANTS: readonly ClearVariant[] = ["wave", "victory", "super"];

export { countedRevealPlan } from "../effects/game-effects";
export type { CountedRevealPlan } from "../effects/game-effects";

export interface LabCellTiming {
  index: number;
  row: number;
  col: number;
  distance: number;
  openDelayMs: number;
  diagonalDelayMs: number;
  opposingDelayMs: number;
}

export function labCellTimings(size: number = 9): LabCellTiming[] {
  const center = Math.floor(size / 2);
  return Array.from({ length: size * size }, (_, index) => {
    const row = Math.floor(index / size);
    const col = index % size;
    const distance = Math.max(Math.abs(row - center), Math.abs(col - center));
    return {
      index,
      row,
      col,
      distance,
      openDelayMs: distance * 21,
      diagonalDelayMs: (row + col) * 18,
      opposingDelayMs: Math.min(row + col, (size - 1 - row) + (size - 1 - col)) * 22
    };
  });
}

export function openingCellOrder(size: number = 9): number[] {
  const center = Math.floor(size / 2);
  return labCellTimings(size)
    .sort((left, right) => (
      left.distance - right.distance
      || Math.atan2(left.row - center, left.col - center) - Math.atan2(right.row - center, right.col - center)
      || left.index - right.index
    ))
    .map((cell) => cell.index);
}

export function randomLabDemo(random: () => number = Math.random):
  | { kind: "opening"; count: OpenCount; variant: LightVariant }
  | { kind: "explosion"; variant: ExplosionVariant }
  | { kind: "clear"; variant: ClearVariant } {
  const kindIndex = Math.min(2, Math.floor(random() * 3));
  if (kindIndex === 0) {
    const countIndex = Math.min(OPEN_COUNTS.length - 1, Math.floor(random() * OPEN_COUNTS.length));
    const variantIndex = Math.min(LIGHT_VARIANTS.length - 1, Math.floor(random() * LIGHT_VARIANTS.length));
    return { kind: "opening", count: OPEN_COUNTS[countIndex], variant: LIGHT_VARIANTS[variantIndex] };
  }
  if (kindIndex === 1) {
    const variantIndex = Math.min(EXPLOSION_VARIANTS.length - 1, Math.floor(random() * EXPLOSION_VARIANTS.length));
    return { kind: "explosion", variant: EXPLOSION_VARIANTS[variantIndex] };
  }
  const variantIndex = Math.min(CLEAR_VARIANTS.length - 1, Math.floor(random() * CLEAR_VARIANTS.length));
  return { kind: "clear", variant: CLEAR_VARIANTS[variantIndex] };
}
