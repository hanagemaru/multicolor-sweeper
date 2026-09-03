import { useEffect, useRef, type CSSProperties } from "react";
import {
  EFFECT_TIMING,
  PRODUCT_EFFECT_SELECTION,
  cellKey,
  clearWaveDelay,
  prefersReducedMotion,
  type BoardOutcomeEffect,
  type CascadePulseEffect,
  type CellOpeningEffects
} from "../effects/game-effects";
import { classifyFlagSwipe, COLORS, GRID_SIZE, SWIPE_LOCK_DISTANCE_PX } from "../game/rules";
import { flagColorHex, reviewMark, totalAdjacent } from "../game/game-core";
import { BombIcon, WrongMark } from "./BombIcon";
import { spriteRects } from "./pixel-art";
import type { Board, Cell, FlagColor } from "../game/types";
import {
  adjacentBombsLabel,
  boardLabel,
  bombLabel,
  cellPosition,
  cellStateLabel,
  flagLabel,
  type Language
} from "../i18n";

interface GameBoardProps {
  board: Board;
  language: Language;
  interactive: boolean;
  review: boolean;
  awaitingFirst: boolean;
  masked?: boolean;
  openingEffects?: CellOpeningEffects;
  cascadePulse?: CascadePulseEffect | null;
  outcomeEffect?: BoardOutcomeEffect | null;
  onOpen: (row: number, col: number) => void;
  onFlag: (row: number, col: number, flag: FlagColor) => void;
}

interface GestureState {
  pointerId: number;
  row: number;
  col: number;
  startX: number;
  startY: number;
  locked: boolean;
  lockedFlag: FlagColor | null;
}

function cellLabel(cell: Cell, review: boolean, language: Language): string {
  const at = cellPosition(language, cell.row + 1, cell.col + 1);
  if (cell.state === "exploded") {
    return `${at} ${bombLabel(language, cell.mineColor ?? 0)} ${cellStateLabel(language, "exploded")}`;
  }
  if (cell.state === "revealed") {
    return totalAdjacent(cell) === 0
      ? `${at} ${cellStateLabel(language, "empty")}`
      : `${at} ${adjacentBombsLabel(language, cell.adjacentCounts)}`;
  }
  if (review) {
    const mine = cell.mineColor === null ? "" : bombLabel(language, cell.mineColor);
    switch (reviewMark(cell)) {
      case "correct-flag":
        return `${at} ${mine} ${cellStateLabel(language, "correct")}`;
      case "mine-wrong-color":
        return `${at} ${mine} ${flagLabel(language, cell.flag as FlagColor)} ${cellStateLabel(language, "wrong-answer")}`;
      case "mine":
        return `${at} ${mine} ${cellStateLabel(language, "no-flag")}`;
      case "wrong-flag":
        return `${at} ${flagLabel(language, cell.flag as FlagColor)} ${cellStateLabel(language, "no-bomb")}`;
      default:
        return `${at} ${cellStateLabel(language, "empty")}`;
    }
  }
  return cell.flag === null
    ? `${at} ${cellStateLabel(language, "unrevealed")}`
    : `${at} ${flagLabel(language, cell.flag)}`;
}

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

function Flag({ flag, language }: { flag: FlagColor; language: Language }): React.JSX.Element {
  return (
    <svg
      className="flag"
      viewBox={`0 0 ${FLAG_WIDTH} ${FLAG_HEIGHT}`}
      shapeRendering="crispEdges"
      aria-label={flagLabel(language, flag)}
      role="img"
    >
      {spriteRects(FLAG_SPRITE, { p: FLAG_POLE, c: flagColorHex(flag) })}
    </svg>
  );
}

function Clue({ cell, colorCount, language }: { cell: Cell; colorCount: 3 | 4; language: Language }): React.JSX.Element | null {
  if (totalAdjacent(cell) === 0) return null;
  return (
    <span className={`clue clue-${colorCount}`} aria-label={adjacentBombsLabel(language, cell.adjacentCounts)}>
      {cell.adjacentCounts.map((count, color) => (
        <span key={color} style={{ color: COLORS[color].hex }}>{count === 0 ? "" : count}</span>
      ))}
    </span>
  );
}

function CellFace({ cell, colorCount, review, language }: { cell: Cell; colorCount: 3 | 4; review: boolean; language: Language }): React.JSX.Element | null {
  if (cell.state === "exploded") return <BombIcon color={cell.mineColor ?? 0} language={language} />;
  if (cell.state === "revealed") return <Clue cell={cell} colorCount={colorCount} language={language} />;

  if (review) {
    const mark = reviewMark(cell);
    if (mark === "mine") return <BombIcon color={cell.mineColor ?? 0} language={language} />;
    if (mark === "mine-wrong-color" && cell.mineColor !== null && cell.flag !== null) {
      return (
        <span className="mine-wrong">
          <BombIcon color={cell.mineColor} language={language} />
          <span className="mine-wrong-flag"><Flag flag={cell.flag} language={language} /></span>
        </span>
      );
    }
    if (mark === "wrong-flag") {
      return (
        <span className="flag-wrong">
          <Flag flag={cell.flag ?? "neutral"} language={language} />
          <WrongMark language={language} />
        </span>
      );
    }
  }

  if (cell.flag !== null) return <Flag flag={cell.flag} language={language} />;
  return null;
}

function SuperClearOverlay(): React.JSX.Element {
  return (
    <span className="super-clear-overlay" aria-hidden="true">
      <span className="super-clear-rays" />
      <span className="super-clear-border" />
      {Array.from({ length: 16 }, (_, index) => (
        <i
          key={index}
          style={({
            "--super-spark-angle": `${index * 22.5}deg`,
            "--super-spark-delay": `${300 + index * 10}ms`,
            "--super-spark-color": COLORS[index % COLORS.length].hex
          } as CSSProperties)}
        />
      ))}
      <strong>CLEAR!</strong>
    </span>
  );
}

export function GameBoard({
  board,
  language,
  interactive,
  review,
  awaitingFirst,
  masked = false,
  openingEffects = {},
  cascadePulse = null,
  outcomeEffect = null,
  onOpen,
  onFlag
}: GameBoardProps): React.JSX.Element {
  const gesture = useRef<GestureState | null>(null);
  const boardRef = useRef<HTMLDivElement | null>(null);
  const cinematicExplosion = outcomeEffect?.type === "explosion" && outcomeEffect.variant === "cinematic";
  const superClear = outcomeEffect?.type === "clear" && outcomeEffect.variant === "super";

  useEffect(() => {
    const element = boardRef.current;
    if (!element) return;

    const preventBrowserNavigation = (event: TouchEvent): void => {
      if (!interactive || masked) return;
      event.preventDefault();
    };

    element.addEventListener("touchstart", preventBrowserNavigation, { passive: false });
    return () => element.removeEventListener("touchstart", preventBrowserNavigation);
  }, [interactive, masked]);

  useEffect(() => {
    const element = boardRef.current;
    if (!element || !cascadePulse || outcomeEffect !== null || prefersReducedMotion()) return;
    const animation = element.animate(
      [
        { transform: "scale(1)", filter: "brightness(1)" },
        { transform: `scale(${cascadePulse.scale})`, filter: "brightness(1.12)", offset: 0.48 },
        { transform: "scale(1)", filter: "brightness(1)" }
      ],
      {
        duration: EFFECT_TIMING.cascadeBoardPulseMs,
        delay: cascadePulse.delayMs,
        easing: "cubic-bezier(0.2, 0.8, 0.35, 1)"
      }
    );
    return () => animation.cancel();
  }, [cascadePulse, outcomeEffect]);

  const handlePointerDown = (event: React.PointerEvent<HTMLButtonElement>, cell: Cell): void => {
    if (!interactive || masked) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    gesture.current = {
      pointerId: event.pointerId,
      row: cell.row,
      col: cell.col,
      startX: event.clientX,
      startY: event.clientY,
      locked: false,
      lockedFlag: null
    };
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLButtonElement>): void => {
    const current = gesture.current;
    if (!current || current.pointerId !== event.pointerId || current.locked || awaitingFirst || masked) return;
    const dx = event.clientX - current.startX;
    const dy = event.clientY - current.startY;
    if (Math.hypot(dx, dy) < SWIPE_LOCK_DISTANCE_PX) return;
    current.lockedFlag = classifyFlagSwipe(dx, dy, board.colorCount);
    current.locked = true;
    event.currentTarget.dataset.gesture = "locked";
  };

  const finishGesture = (event: React.PointerEvent<HTMLButtonElement>): void => {
    const current = gesture.current;
    if (!current || current.pointerId !== event.pointerId || masked) return;
    gesture.current = null;
    delete event.currentTarget.dataset.gesture;
    if (current.locked) {
      if (current.lockedFlag !== null) onFlag(current.row, current.col, current.lockedFlag);
      return;
    }
    onOpen(current.row, current.col);
  };

  return (
    <div
      ref={boardRef}
      className={`board${masked ? " board-masked" : ""}${
        outcomeEffect?.type === "explosion" ? ` board-exploding board-exploding-${outcomeEffect.variant}` : ""
      }${outcomeEffect?.type === "clear" ? ` board-clearing board-clearing-${outcomeEffect.variant}` : ""}`}
      role="grid"
      aria-label={masked ? "Board hidden while paused" : boardLabel(language, GRID_SIZE)}
      aria-hidden={masked || undefined}
      style={{
        gridTemplateColumns: `repeat(${GRID_SIZE}, minmax(0, 1fr))`,
        gridTemplateRows: `repeat(${GRID_SIZE}, minmax(0, 1fr))`
      }}
    >
      {board.cells.flat().map((cell) => {
        const openingEffect = openingEffects[cellKey(cell.row, cell.col)];
        const exploding = outcomeEffect?.type === "explosion"
          && outcomeEffect.origin.row === cell.row
          && outcomeEffect.origin.col === cell.col;
        const clearing = outcomeEffect?.type === "clear";
        const rowFromCenter = cell.row - Math.floor(GRID_SIZE / 2);
        const colFromCenter = cell.col - Math.floor(GRID_SIZE / 2);
        const radialDistance = Math.max(Math.abs(rowFromCenter), Math.abs(colFromCenter));
        const effectStyle = openingEffect || clearing || cinematicExplosion
          ? ({
              "--opening-delay": `${openingEffect?.delayMs ?? 0}ms`,
              "--clear-delay": `${clearing ? clearWaveDelay(cell.row, cell.col) : 0}ms`,
              "--super-clear-delay": `${radialDistance * 32}ms`,
              "--blast-x": `${colFromCenter * 24}px`,
              "--blast-y": `${rowFromCenter * 24}px`,
              "--blast-x-soft": `${colFromCenter * 1.92}px`,
              "--blast-y-soft": `${rowFromCenter * 1.92}px`,
              "--blast-x-return": `${colFromCenter * -0.6}px`,
              "--blast-y-return": `${rowFromCenter * -0.6}px`,
              "--blast-rotate": `${(colFromCenter * 17 + rowFromCenter * 11) % 55}deg`
            } as CSSProperties)
          : undefined;
        return (
          <button
            key={`${cell.row}-${cell.col}`}
            type="button"
            role="gridcell"
            className={`cell ${masked ? "cell-masked" : `cell-${cell.state}`}${
              !masked && review && reviewMark(cell) === "correct-flag" ? " cell-correct" : ""
            }${openingEffect ? ` cell-opening cell-opening-${PRODUCT_EFFECT_SELECTION.openingLight}` : ""}${
              cinematicExplosion ? " cell-cinematic-blast" : ""
            }${exploding ? ` cell-exploding cell-exploding-${outcomeEffect.variant}` : ""}${
              clearing ? ` cell-clear-${outcomeEffect.variant}` : ""
            }`}
            style={effectStyle}
            disabled={!interactive || masked}
            tabIndex={masked ? -1 : undefined}
            aria-label={masked ? undefined : cellLabel(cell, review, language)}
            onPointerDown={(event) => handlePointerDown(event, cell)}
            onPointerMove={handlePointerMove}
            onPointerUp={finishGesture}
            onPointerCancel={(event) => {
              gesture.current = null;
              delete event.currentTarget.dataset.gesture;
            }}
            onContextMenu={(event) => event.preventDefault()}
          >
            {masked ? null : <CellFace cell={cell} colorCount={board.colorCount} review={review} language={language} />}
            {exploding ? (
              <span className="explosion-particles" aria-hidden="true">
                {Array.from({ length: cinematicExplosion ? 28 : 14 }, (_, index) => (
                  <i
                    key={`${outcomeEffect.id}-${index}`}
                    style={cinematicExplosion ? ({
                      "--cinematic-particle-angle": `${index * (360 / 28) + (index % 2) * 9}deg`,
                      "--cinematic-particle-distance": `${56 + (index % 4) * 13}px`,
                      "--cinematic-particle-delay": `${(index % 3) * 12}ms`
                    } as CSSProperties) : undefined}
                  />
                ))}
              </span>
            ) : null}
          </button>
        );
      })}
      {superClear ? <SuperClearOverlay /> : null}
    </div>
  );
}
