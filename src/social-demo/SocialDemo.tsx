import { useEffect, useMemo, useRef, useState } from "react";
import { GameBoard } from "../components/GameBoard";
import { cloneBoard, revealCell, setFlag } from "../game/game-core";
import { generateNoGuess } from "../game/no-guess-generator";
import type { Board, Coordinate, FlagColor, GenerateSuccess, TraceStep } from "../game/types";
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

function isSuccess(result: ReturnType<typeof generateNoGuess>): result is GenerateSuccess {
  return !("failed" in result);
}

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
  const generated = generateNoGuess({
    baseSeed: seed,
    mineCount: 20,
    firstRow: 4,
    firstCol: 4,
    includeTrace: true
  });
  if (!isSuccess(generated)) throw new Error("Could not generate a no-guess social demo board");
  const trace = generated.results.three.trace ?? [];
  return {
    board: cloneBoard(generated.board3),
    actions: buildActions(trace),
    attempts: generated.attempts
  };
}

export default function SocialDemo(): React.JSX.Element {
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const seed = params.get("seed") ?? "hanage-social-demo-v1";
  const speedMs = Math.max(70, Number(params.get("speed")) || 150);
  const demo = useMemo(() => createDemo(seed), [seed]);
  const [board, setBoard] = useState<Board>(() => cloneBoard(demo.board));
  const [actionIndex, setActionIndex] = useState(0);
  const [elapsedTenths, setElapsedTenths] = useState(0);
  const startedRef = useRef(performance.now());

  useEffect(() => {
    const interval = window.setInterval(() => {
      setElapsedTenths(Math.floor((performance.now() - startedRef.current) / 100));
    }, 100);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (actionIndex >= demo.actions.length) return;
    const timer = window.setTimeout(() => {
      const action = demo.actions[actionIndex];
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
    }, actionIndex === 0 ? 700 : action.type === "flag" ? Math.max(90, speedMs - 30) : speedMs);
    return () => window.clearTimeout(timer);
  }, [actionIndex, demo.actions, speedMs]);

  const seconds = (elapsedTenths / 10).toFixed(1);
  const complete = actionIndex >= demo.actions.length;

  return (
    <main
      className="social-demo-root"
      data-social-demo="ready"
      data-social-demo-complete={complete ? "true" : "false"}
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
            onOpen={() => {}}
            onFlag={() => {}}
          />
        </div>
        <footer className="social-demo-footer">
          <span>NO-GUESS SOLVER PLAYBACK</span>
          <span>hanage.app</span>
        </footer>
      </section>
    </main>
  );
}
