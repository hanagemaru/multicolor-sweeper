import { COLORS } from "../game/rules";
import type { MineColor } from "../game/types";

// 15x21のドット絵。1文字が1ドット。元絵(docs/art/bomb.png)のピクセルをそのまま写している。
//   . 透明 / o 輪郭 / b 本体 / h 強ハイライト / m 弱ハイライト / c 口金
//   f 導火線(明) / g 導火線(暗) / s 炎 / S 炎(黄) / W 炎の芯
// 本体まわりの3階調は爆弾の色から算出するので、4色ぶんの図案は要らない。
// 元絵が15x21なので枠もそれに合わせる。幅が奇数だと中央の列(x=7)が実在するため、
// 丸い本体の輪郭が左右対称にきれいに閉じる。
const SPRITE = [
  "...........s...",
  "..........sSs..",
  ".........sSWSs.",
  ".........fsSs..",
  "........fg.s...",
  ".......fg......",
  ".....oogoo.....",
  "...ooocccooo...",
  "..obbboooobbo..",
  ".obbhbbbbbbbbo.",
  ".obhhmbbbbbbbo.",
  "obbhmbbbbbbbbbo",
  "obbbbbbbbbbbbbo",
  "obbbbbbbbbbbbbo",
  "obbbbbbbbbbbbbo",
  "obbbbbbbbbbbbbo",
  ".obbbbbbbbbbbo.",
  ".obbbbbbbbbbbo.",
  "..obbbbbbbbbo..",
  "...oobbbbboo...",
  ".....ooooo....."
];

const SPRITE_WIDTH = 15;
const SPRITE_HEIGHT = 21;

const OUTLINE = "#0b0d18";
const CAP = "#41404a";
const FUSE_LIGHT = "#c8a16b";
const FUSE_DARK = "#8d6c4b";
const FLAME = "#f96b04";
const FLAME_MID = "#fed406";
const FLAME_CORE = "#fefc0c";

function mix(hex: string, target: number, ratio: number): string {
  const value = Number.parseInt(hex.slice(1), 16);
  const channel = (shift: number): string => {
    const from = (value >> shift) & 0xff;
    return Math.round(from + (target - from) * ratio).toString(16).padStart(2, "0");
  };
  return `#${channel(16)}${channel(8)}${channel(0)}`;
}

function paletteFor(hex: string): Record<string, string> {
  return {
    o: OUTLINE,
    b: hex,
    h: mix(hex, 255, 0.55),
    m: mix(hex, 255, 0.26),
    c: CAP,
    f: FUSE_LIGHT,
    g: FUSE_DARK,
    s: FLAME,
    S: FLAME_MID,
    W: FLAME_CORE
  };
}

// 同じ色が横に続くぶんは1つの矩形にまとめる。
function rects(palette: Record<string, string>): React.JSX.Element[] {
  const out: React.JSX.Element[] = [];
  SPRITE.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const slot = row[x];
      let width = 1;
      while (x + width < row.length && row[x + width] === slot) width += 1;
      if (slot !== ".") {
        out.push(
          <rect key={`${x}-${y}`} x={x} y={y} width={width} height={1} fill={palette[slot]} />
        );
      }
      x += width;
    }
  });
  return out;
}

export function BombIcon({ color }: { color: MineColor }): React.JSX.Element {
  const hex = COLORS[color].hex;
  return (
    <svg
      className="bomb"
      viewBox={`0 0 ${SPRITE_WIDTH} ${SPRITE_HEIGHT}`}
      shapeRendering="crispEdges"
      aria-label={`${COLORS[color].label}の爆弾`}
      role="img"
    >
      {rects(paletteFor(hex))}
    </svg>
  );
}

// 間違った旗に重ねる×印。文字だとフォントに依存するのでSVGで描く。
export function WrongMark(): React.JSX.Element {
  return (
    <svg className="wrong-mark" viewBox="0 0 16 16" aria-label="誤った旗" role="img">
      {/* 下に暗い線を敷いて、旗の色の上でも×が沈まないようにする。 */}
      <g strokeLinecap="round" fill="none">
        <g stroke="#12060a" strokeWidth="4.5">
          <line x1="3.5" y1="3.5" x2="12.5" y2="12.5" />
          <line x1="12.5" y1="3.5" x2="3.5" y2="12.5" />
        </g>
        <g stroke="#ff5566" strokeWidth="2.4">
          <line x1="3.5" y1="3.5" x2="12.5" y2="12.5" />
          <line x1="12.5" y1="3.5" x2="3.5" y2="12.5" />
        </g>
      </g>
    </svg>
  );
}
