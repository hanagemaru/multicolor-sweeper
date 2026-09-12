import { useEffect, useMemo, useRef, useState } from "react";
import { GameBoard } from "../components/GameBoard";
import { cloneBoard, generateBoard, revealCell, setFlag } from "../game/game-core";
import { solveBoard } from "../game/solver";
import type { Board, Coordinate, FlagColor, TraceStep } from "../game/types";
import "./social-demo.css";

type DemoAction =
  | { type: "open"; cell: Coordinate }
  | { type: "flag"; cell: Coordinate; flag: FlagColor };

const COLOR_BY_NAME: Record<string, FlagColor | undefined> = {
  red: 0,
  blue: 1,
  green: 2,
  yellow: 3
};

function buildActions(trace: TraceStep[]): DemoAction[] {
  const actions: DemoAction[] = [];
  const opened = new Set<string>();
  const flagged = new Set<string>();
  const keyOf = ({ row, col }: Coordinate): string => `${row},${col}`;

  const pushOpen = (cell: Coordinate): void => {
    const key = keyOf(cell);
    if (opened.has(key)) return;
    opened.add(key);
    actions.push({ type: "open", cell });
  };

  for (const step of trace) {
    if (step.type === "initial-reveal") {
      pushOpen(step.firstClick);
      continue;
    }

    for (const deduction of step.deductions) {
      const flag = COLOR_BY_NAME[deduction.result];
      if (flag === undefined) continue;
      const key = keyOf(deduction.cell);
      if (flagged.has(key)) continue;
      flagged.add(key);
      actions.push({ type: "flag", cell: deduction.cell, flag });
    }

    for (const revealed of step.revealed) pushOpen(revealed);
  }

  return actions;
}

function createDemo(seed: string): { board: Board; actions: DemoAction[]; attempts: number } {
  // Social capture only needs one real 3-color no-guess board. Searching the
  // production C-filter also solves 4-color and mono variants and can be slow
  // enough to make a recording workflow hang, so keep capture generation lean.
  for (let attempt = 0; attempt < 1000; attempt += 1) {
    const board = generateBoard({
      seed: `${seed}|social-attempt:${attempt}`,
      mineCount: 20,
      colorCount: 3,
      firstRow: 4,
      firstCol: 4
    });
    const result = solveBoard(board, { includeTrace: true });
    if (!result.noGuess) continue;
    return {
      board: cloneBoard(board),
      actions: buildActions(result.trace ?? []),
      attempts: attempt + 1
    };
  }
  throw new Error("Could not generate a 3-color no-guess social demo board");
}

export default function SocialDemo(): React.JSX.Element {
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const seed = params.get("seed") ?? "hanage-social-demo-v1";
  const speedMs = Math.max(70, Number(params.get("speed")) || 150);
  const demo = useMemo(() => createDemo(seed), [seed]);
  const [board, setBoard] = useState<Board>(() => cloneBoard(demo.board));
  const [actionIndex, setActionIndex] = useState(0);
  const [elapsedTenths, setElapsedTenths] = useState(0);
  const [showClear, setShowClear] = useState(false);
  const [captureComplete, setCaptureComplete] = useState(false);
  const startedRef = useRef(performance.now());
  const solved = actionIndex >= demo.actions.length;

  useEffect(() => {
    if (solved) return;
    const interval = window.setInterval(() => {
      setElapsedTenths(Math.floor((performance.now() - startedRef.current) / 100));
    }, 100);
    return () => window.clearInterval(interval);
  }, [solved]);

  useEffect(() => {
    if (actionIndex >= demo.actions.length) return;
    const action = demo.actions[actionIndex];
    const delay = actionIndex === 0
      ? 700
      : action.type === "flag"
        ? Math.max(90, speedMs - 30)
        : speedMs;
    const timer = window.setTimeout(() => {
      setBoard((current) => {
        const next = cloneBoard(current);
        if (action.type === "open") {
          revealCell(next, action.cell.row, action.cell.col);
        } else {
          setFlag(next, action.cell.row, action.cell.col, action.flag);
        }
        return next;
      });
      setActionIndex((current) => current + 1);
    }, delay);
    return () => window.clearTimeout(timer);
  }, [actionIndex, demo.actions, speedMs]);

  useEffect(() => {
    if (!solved) return;
    const clearTimer = window.setTimeout(() => setShowClear(true), 780);
    const completeTimer = window.setTimeout(() => setCaptureComplete(true), 2400);
    return () => {
      window.clearTimeout(clearTimer);
      window.clearTimeout(completeTimer);
    };
  }, [solved]);

  const seconds = (elapsedTenths / 10).toFixed(1);

  return (
    <main
      className="social-demo-root"
      data-social-demo="ready"
      data-social-demo-complete={captureComplete ? "true" : "false"}
      data-social-demo-attempts={demo.attempts}
    >
      <section className="social-demo-stage">
        <header className="social-demo-header">
          <div>
            <h1>MULTICOLOR SWEEPER</h1>
            <p>20 BOMBS · 3 COLORS</p>
          </div>
          <strong>{seconds}s</strong>
        </header>
        <div className="social-demo-board-wrap">
          <GameBoard
            board={board}
            language="en"
            interactive={false}
            review={false}
            awaitingFirst={false}
            outcomeEffect={solved ? { id: 1, type: "clear", variant: "wave" } : null}
            onOpen={() => {}}
            onFlag={() => {}}
          />
          {showClear ? (
            <div className="social-demo-clear" aria-label="Clear">
              <strong>CLEAR!</strong>
              <span>{seconds}s</span>
            </div>
          ) : null}
        </div>
        <footer className="social-demo-footer">
          <span>NO-GUESS SOLVER PLAYBACK</span>
          <span>hanage.app</span>
        </footer>
      </section>
    </main>
  );
}
