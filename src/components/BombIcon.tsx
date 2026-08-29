import { COLORS } from "../game/rules";
import type { MineColor } from "../game/types";

// 11x17のドット絵。1文字が1ドット。元絵(docs/art/bomb-v2.png)のピクセルをそのまま写している。
//   . 透明 / b 本体 / h ハイライト / f 導火線 / s 炎(赤) / S 炎(橙) / W 炎(黄)
// 元絵は4色ぶん並んでいるが、違うのは本体色だけで形も炎もハイライトも完全に同じ。
// なので図案は1つだけ持ち、bをCOLORSの色に差し替えて4色を作る。
// 色の定義はrules.tsが唯一の出処なので、旗と爆弾の色が食い違うことはない。
const SPRITE = [
  "..s........",
  ".sSs.......",
  "sSWff......",
  ".sSs.f.....",
  "..s..f.....",
  "....bbb....",
  "....bbb....",
  "..bbbbbbb..",
  ".bbbhbbbbb.",
  "bbbhbbbbbbb",
  "bbhbbbbbbbb",
  "bhhbbbbbbbb",
  "bbhbbbbbbbb",
  "bbbbbbbbbbb",
  "bbbbbbbbbbb",
  ".bbbbbbbbb.",
  "..bbbbbbb.."
];

const SPRITE_WIDTH = 11;
const SPRITE_HEIGHT = 17;

const HIGHLIGHT = "#ffffff";
const FUSE = "#000000";
const FLAME = "#ed1c24";
const FLAME_MID = "#ff7f27";
const FLAME_CORE = "#ffc90e";

function paletteFor(hex: string): Record<string, string> {
  return {
    b: hex,
    h: HIGHLIGHT,
    f: FUSE,
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
