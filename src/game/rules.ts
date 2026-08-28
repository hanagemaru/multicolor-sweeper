import type { ColorCount, FlagColor, MineColor, MineCount } from "./types";

export const GRID_SIZE = 9;
export const PRODUCT_MINE_COUNTS = [15, 20, 25] as const satisfies readonly MineCount[];
export const PRODUCT_COLOR_COUNTS = [3, 4] as const satisfies readonly ColorCount[];
export const PRODUCT_FILTER = "C" as const;
export const MAX_GENERATION_ATTEMPTS = 10_000;
export const GENERATING_INDICATOR_DELAY_MS = 120;
export const SWIPE_LOCK_DISTANCE_PX = 20;

export const DIFFICULTIES: ReadonlyArray<{
  id: "easy" | "normal" | "hard";
  label: "EASY" | "NORMAL" | "HARD";
  mineCount: MineCount;
}> = [
  { id: "easy", label: "EASY", mineCount: 15 },
  { id: "normal", label: "NORMAL", mineCount: 20 },
  { id: "hard", label: "HARD", mineCount: 25 }
];

export const COLORS: ReadonlyArray<{
  id: "red" | "blue" | "green" | "yellow";
  label: "赤" | "青" | "緑" | "黄";
  hex: string;
}> = [
  { id: "red", label: "赤", hex: "#e45462" },
  { id: "blue", label: "青", hex: "#4d7de8" },
  { id: "green", label: "緑", hex: "#31a873" },
  { id: "yellow", label: "黄", hex: "#e3a72f" }
];

export const FLAG_GESTURES: ReadonlyArray<{
  label: string;
  arrow: string;
  flag: FlagColor;
}> = [
  { label: "赤旗", arrow: "↖", flag: 0 },
  { label: "青旗", arrow: "↗", flag: 1 },
  { label: "緑旗", arrow: "↙", flag: 2 },
  { label: "黄旗", arrow: "↘", flag: 3 },
  { label: "無色旗", arrow: "↑", flag: "neutral" }
];

export function isColorCount(value: number): value is ColorCount {
  return PRODUCT_COLOR_COUNTS.includes(value as ColorCount);
}

export function isMineCount(value: number): value is MineCount {
  return PRODUCT_MINE_COUNTS.includes(value as MineCount);
}

export function activeMineColors(colorCount: ColorCount): MineColor[] {
  return Array.from({ length: colorCount }, (_, index) => index as MineColor);
}
