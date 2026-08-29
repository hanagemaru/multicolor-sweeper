import { useRef } from "react";
import { COLORS, GRID_SIZE, SWIPE_LOCK_DISTANCE_PX } from "../game/rules";
import { flagColorHex, reviewMark, totalAdjacent } from "../game/game-core";
import { BombIcon, WrongMark } from "./BombIcon";
import { spriteRects } from "./pixel-art";
import type { Board, Cell, FlagColor } from "../game/types";

interface GameBoardProps {
  board: Board;
  interactive: boolean;
  // 決着後、伏せたままのマスに答えを描く。
  review: boolean;
  awaitingFirst: boolean;
  onOpen: (row: number, col: number) => void;
  onFlag: (row: number, col: number, flag: FlagColor) => void;
}

interface GestureState {
  pointerId: number;
  row: number;
  col: number;
  startX: number;
  startY: number;
  lockedFlag: FlagColor | null;
}

function classifySwipe(dx: number, dy: number): FlagColor {
  if (dy < 0 && Math.abs(dx) < Math.abs(dy) * 0.5) return "neutral";
  if (dy <= 0) return dx < 0 ? 0 : 1;
  return dx < 0 ? 2 : 3;
}

function flagLabel(flag: FlagColor): string {
  return flag === "neutral" ? "無色旗" : `${COLORS[flag].label}旗`;
}

// buttonにaria-labelを付けると子孫要素の文言は読み上げられなくなるので、
// マスの状態までを1つの読み上げ名にまとめる。
function cellLabel(cell: Cell, review: boolean): string {
  const at = `${cell.row + 1}行${cell.col + 1}列`;
  if (cell.state === "exploded") {
    return `${at} ${COLORS[cell.mineColor ?? 0].label}の爆弾 爆発`;
  }
  if (cell.state === "revealed") {
    return totalAdjacent(cell) === 0
      ? `${at} 空き`
      : `${at} 周囲の爆弾 ${cell.adjacentCounts.join(",")}`;
  }
  if (review) {
    const mineLabel = cell.mineColor === null ? "" : `${COLORS[cell.mineColor].label}の爆弾`;
    switch (reviewMark(cell)) {
      case "correct-flag":
        return `${at} ${mineLabel} 正解`;
      case "mine-wrong-color":
        return `${at} ${mineLabel} ${flagLabel(cell.flag as FlagColor)}で誤答`;
      case "mine":
        return `${at} ${mineLabel} 旗なし`;
      case "wrong-flag":
        return `${at} ${flagLabel(cell.flag as FlagColor)} 爆弾なし`;
      default:
        return `${at} 空き`;
    }
  }
  return cell.flag === null ? `${at} 未開放` : `${at} ${flagLabel(cell.flag)}`;
}

// 10x17のドット絵。1文字が1ドット。 . 透明 / p 竿 / c 布
// 元絵(docs/art/flag.png)のピクセルをそのまま写している。色だけ差し替えていて、
// 元絵の赤#ed1c24はCOLORSの赤へ置き換える。竿は元絵の灰のまま。白より暗い灰に
// しておかないと、無色旗のときに竿と布が同じ白になって区別が付かなくなる。
// 布は5色ぶん要るが、形は共通なので図案は1つだけ持つ。
const FLAG_SPRITE = [
  "pccc......",
  "pcccccc...",
  "pccccccccc",
  "pccccccccc",
  "pcccccccc.",
  "pcccccc...",
  "pccccc....",
  "pccc......",
  "pcc.......",
  "pp........",
  "pp........",
  "pp........",
  "pp........",
  "pp........",
  "pp........",
  "pp........",
  "pp........"
];

const FLAG_WIDTH = 10;
const FLAG_HEIGHT = 17;

const FLAG_POLE = "#c3c3c3";

function Flag({ flag }: { flag: FlagColor }): React.JSX.Element {
  return (
    <svg
      className="flag"
      viewBox={`0 0 ${FLAG_WIDTH} ${FLAG_HEIGHT}`}
      shapeRendering="crispEdges"
      aria-label={flagLabel(flag)}
      role="img"
    >
      {spriteRects(FLAG_SPRITE, { p: FLAG_POLE, c: flagColorHex(flag) })}
    </svg>
  );
}

function Clue({ cell, colorCount }: { cell: Cell; colorCount: 3 | 4 }): React.JSX.Element | null {
  if (totalAdjacent(cell) === 0) return null;
  return (
    <span className={`clue clue-${colorCount}`} aria-label={`周囲の爆弾 ${cell.adjacentCounts.join(",")}`}>
      {cell.adjacentCounts.map((count, color) => (
        <span key={color} style={{ color: COLORS[color].hex }}>{count === 0 ? "" : count}</span>
      ))}
    </span>
  );
}

function CellFace({
  cell,
  colorCount,
  review
}: {
  cell: Cell;
  colorCount: 3 | 4;
  review: boolean;
}): React.JSX.Element | null {
  if (cell.state === "exploded") return <BombIcon color={cell.mineColor ?? 0} />;
  if (cell.state === "revealed") return <Clue cell={cell} colorCount={colorCount} />;

  if (review) {
    const mark = reviewMark(cell);
    if (mark === "mine") return <BombIcon color={cell.mineColor ?? 0} />;
    if (mark === "mine-wrong-color" && cell.mineColor !== null && cell.flag !== null) {
      // 正解の爆弾を主役にしつつ、立てていた旗を隅に小さく残す。
      return (
        <span className="mine-wrong">
          <BombIcon color={cell.mineColor} />
          <span className="mine-wrong-flag">
            <Flag flag={cell.flag} />
          </span>
        </span>
      );
    }
    if (mark === "wrong-flag") {
      return (
        <span className="flag-wrong">
          <Flag flag={cell.flag ?? "neutral"} />
          <WrongMark />
        </span>
      );
    }
  }

  if (cell.flag !== null) return <Flag flag={cell.flag} />;
  return null;
}

export function GameBoard({
  board,
  interactive,
  review,
  awaitingFirst,
  onOpen,
  onFlag
}: GameBoardProps): React.JSX.Element {
  const gesture = useRef<GestureState | null>(null);

  const handlePointerDown = (event: React.PointerEvent<HTMLButtonElement>, cell: Cell): void => {
    if (!interactive) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    gesture.current = {
      pointerId: event.pointerId,
      row: cell.row,
      col: cell.col,
      startX: event.clientX,
      startY: event.clientY,
      lockedFlag: null
    };
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLButtonElement>): void => {
    const current = gesture.current;
    if (!current || current.pointerId !== event.pointerId || current.lockedFlag !== null || awaitingFirst) return;
    const dx = event.clientX - current.startX;
    const dy = event.clientY - current.startY;
    if (Math.hypot(dx, dy) < SWIPE_LOCK_DISTANCE_PX) return;
    current.lockedFlag = classifySwipe(dx, dy);
    event.currentTarget.dataset.gesture = "locked";
  };

  const finishGesture = (event: React.PointerEvent<HTMLButtonElement>): void => {
    const current = gesture.current;
    if (!current || current.pointerId !== event.pointerId) return;
    gesture.current = null;
    delete event.currentTarget.dataset.gesture;
    if (current.lockedFlag !== null) {
      onFlag(current.row, current.col, current.lockedFlag);
    } else {
      onOpen(current.row, current.col);
    }
  };

  return (
    <div
      className="board"
      role="grid"
      aria-label={`${GRID_SIZE}×${GRID_SIZE} マインスイーパー盤面`}
      style={{
        // minmax(0, 1fr)にしないと、マスの中身が大きいときに行や列が
        // 押し広げられて正方形が崩れる。
        gridTemplateColumns: `repeat(${GRID_SIZE}, minmax(0, 1fr))`,
        gridTemplateRows: `repeat(${GRID_SIZE}, minmax(0, 1fr))`
      }}
    >
      {board.cells.flat().map((cell) => (
        <button
          key={`${cell.row}-${cell.col}`}
          type="button"
          role="gridcell"
          className={`cell cell-${cell.state}${
            review && reviewMark(cell) === "correct-flag" ? " cell-correct" : ""
          }`}
          disabled={!interactive}
          aria-label={cellLabel(cell, review)}
          onPointerDown={(event) => handlePointerDown(event, cell)}
          onPointerMove={handlePointerMove}
          onPointerUp={finishGesture}
          onPointerCancel={(event) => {
            gesture.current = null;
            delete event.currentTarget.dataset.gesture;
          }}
          onContextMenu={(event) => event.preventDefault()}
        >
          <CellFace cell={cell} colorCount={board.colorCount} review={review} />
        </button>
      ))}
    </div>
  );
}
