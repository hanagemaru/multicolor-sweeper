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

// 盤面の色はここが唯一の定義。旗の布も矢印もこの値を参照する。
//
// 明度を離す方向で調整してある。数字は細く小さいため、色相だけで分けると
// 小視野トリタノピア（細かい対象では誰でも青系の弁別が落ちる）で青と緑が
// 潰れる。緑を明るくしてL*差を稼ぐことで、その条件下でも分離を保つ。
// あわせて4色とも開いたマス（#20243c）に対するコントラストを4.5以上にした。
export const COLORS: ReadonlyArray<{
  id: "red" | "blue" | "green" | "yellow";
  label: "赤" | "青" | "緑" | "黄";
  hex: string;
}> = [
  { id: "red", label: "赤", hex: "#ef5f6d" },
  { id: "blue", label: "青", hex: "#4d88ff" },
  { id: "green", label: "緑", hex: "#57e0a2" },
  { id: "yellow", label: "黄", hex: "#e9b53a" }
];

export const NEUTRAL_FLAG_HEX = "#e9eef4";

export interface FlagGesture {
  label: string;
  angle: number;
  flag: FlagColor;
}

// angleは上向きを0度とした時計回りの角度。
// GestureArrow側で各方向を整数座標の矩形だけで描き、斜め方向は階段状の
// ピクセルアートにする。文字フォントや回転SVGのアンチエイリアスには依存しない。
export const FLAG_GESTURES: Readonly<Record<ColorCount, readonly FlagGesture[]>> = {
  3: [
    { label: "赤旗", angle: -45, flag: 0 },
    { label: "青旗", angle: 45, flag: 1 },
    { label: "緑旗", angle: 180, flag: 2 },
    { label: "無色旗", angle: 0, flag: "neutral" }
  ],
  4: [
    { label: "赤旗", angle: -45, flag: 0 },
    { label: "青旗", angle: 45, flag: 1 },
    { label: "緑旗", angle: -135, flag: 2 },
    { label: "黄旗", angle: 135, flag: 3 },
    { label: "無色旗", angle: 0, flag: "neutral" }
  ]
};

export function classifyFlagSwipe(dx: number, dy: number, colorCount: ColorCount): FlagColor {
  const horizontal = Math.abs(dx);
  const vertical = Math.abs(dy);

  // 既存どおり、上方向の中央寄りは無色旗にする。
  if (dy < 0 && horizontal < vertical * 0.5) return "neutral";

  if (colorCount === 3) {
    // 3色では下方向を緑専用にする。完全な真下だけでなく±45°まで許容し、
    // 指の横ぶれで赤/青へ化けにくくする。ほぼ水平なら左右で赤/青を維持する。
    if (dy > 0 && horizontal <= vertical) return 2;
    return dx < 0 ? 0 : 1;
  }

  // 4色は従来の4象限＋上中央の無色判定を維持する。
  if (dy <= 0) return dx < 0 ? 0 : 1;
  return dx < 0 ? 2 : 3;
}

export function isColorCount(value: number): value is ColorCount {
  return PRODUCT_COLOR_COUNTS.includes(value as ColorCount);
}

export function isMineCount(value: number): value is MineCount {
  return PRODUCT_MINE_COUNTS.includes(value as MineCount);
}

export function activeMineColors(colorCount: ColorCount): MineColor[] {
  return Array.from({ length: colorCount }, (_, index) => index as MineColor);
}
