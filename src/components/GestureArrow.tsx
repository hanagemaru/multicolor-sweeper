interface GestureArrowProps {
  // 上向きを0度とした時計回りの角度。
  angle: number;
  color: string;
}

interface PixelRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

const VIEWBOX_SIZE = 16;

// 斜め矢印はSVGの直線を45度回転させず、整数座標の矩形だけで階段状に描く。
// これによりOSやアンチエイリアスに依存せず、20px表示でもピクセル感を保てる。
// 矢じりは1pxずつ広がる三角にする。2pxずつ広げると段が横棒として読めてしまい、
// 軸と合わせて十字に見える。
const UP: readonly PixelRect[] = [
  { x: 7, y: 2, width: 2, height: 1 },
  { x: 6, y: 3, width: 4, height: 1 },
  { x: 5, y: 4, width: 6, height: 1 },
  { x: 4, y: 5, width: 8, height: 1 },
  { x: 3, y: 6, width: 10, height: 1 },
  { x: 7, y: 7, width: 2, height: 8 }
];

const UP_RIGHT: readonly PixelRect[] = [
  // 軸は1pxずつずらした2x2矩形を重ね、はっきりした階段状にする。
  // 各ブロックの中心は矢じりの対称軸(x + y = 16)の上に来る。
  { x: 2, y: 12, width: 2, height: 2 },
  { x: 3, y: 11, width: 2, height: 2 },
  { x: 4, y: 10, width: 2, height: 2 },
  { x: 5, y: 9, width: 2, height: 2 },
  { x: 6, y: 8, width: 2, height: 2 },
  { x: 7, y: 7, width: 2, height: 2 },
  { x: 8, y: 6, width: 2, height: 2 },
  { x: 9, y: 5, width: 2, height: 2 },
  // 矢じりは上向きと同じ塗りつぶしの三角。頂角90度の三角を45度傾けると
  // 2辺が水平・垂直になるので、右上のくさび形になる。
  { x: 7, y: 2, width: 7, height: 1 },
  { x: 8, y: 3, width: 6, height: 1 },
  { x: 9, y: 4, width: 5, height: 1 },
  { x: 10, y: 5, width: 4, height: 1 },
  { x: 11, y: 6, width: 3, height: 1 },
  { x: 12, y: 7, width: 2, height: 1 },
  { x: 13, y: 8, width: 1, height: 1 }
];

function mirrorX(rects: readonly PixelRect[]): PixelRect[] {
  return rects.map((rect) => ({
    ...rect,
    x: VIEWBOX_SIZE - rect.x - rect.width
  }));
}

function mirrorY(rects: readonly PixelRect[]): PixelRect[] {
  return rects.map((rect) => ({
    ...rect,
    y: VIEWBOX_SIZE - rect.y - rect.height
  }));
}

const PIXEL_ARROWS: Readonly<Record<number, readonly PixelRect[]>> = {
  0: UP,
  45: UP_RIGHT,
  135: mirrorY(UP_RIGHT),
  225: mirrorY(mirrorX(UP_RIGHT)),
  315: mirrorX(UP_RIGHT)
};

function normalizedAngle(angle: number): number {
  return ((angle % 360) + 360) % 360;
}

export function GestureArrow({ angle, color }: GestureArrowProps): React.JSX.Element {
  const rects = PIXEL_ARROWS[normalizedAngle(angle)] ?? UP;

  return (
    <svg
      className="gesture-arrow"
      viewBox={`0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}`}
      width="20"
      height="20"
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      {rects.map((rect, index) => (
        <rect
          key={`${rect.x}-${rect.y}-${index}`}
          x={rect.x}
          y={rect.y}
          width={rect.width}
          height={rect.height}
          fill={color}
        />
      ))}
    </svg>
  );
}
