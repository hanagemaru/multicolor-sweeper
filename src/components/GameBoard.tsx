import { useRef } from "react";
import { COLORS, GRID_SIZE, SWIPE_LOCK_DISTANCE_PX } from "../game/rules";
import { flagColorHex, reviewMark, totalAdjacent } from "../game/game-core";
import { BombIcon, WrongMark } from "./BombIcon";
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

function Flag({ flag }: { flag: FlagColor }): React.JSX.Element {
  return (
    <span className="flag" aria-label={flag === "neutral" ? "無色旗" : `${COLORS[flag].label}旗`}>
      <span className="flag-pole" />
      <span className="flag-cloth" style={{ backgroundColor: flagColorHex(flag) }} />
    </span>
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
        gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`,
        gridTemplateRows: `repeat(${GRID_SIZE}, 1fr)`
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
          aria-label={`${cell.row + 1}行${cell.col + 1}列`}
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
