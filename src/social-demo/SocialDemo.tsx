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

function hashSeed(seed: string): number {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function makeRandom(seed: string): () => number {
  let state = hashSeed(seed) || 1;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 4294967296;
  };
}

function buildActionDelays(actions: DemoAction[], seed: string, targetGameplayMs: number): number[] {
  if (actions.length === 0) return [];
  if (actions.length === 1) return [900];

  const random = makeRandom(`${seed}|pacing`);
  const firstDelay = 900;
  const weights = actions.slice(1).map((action) => {
    let weight = (action.type === "flag" ? 0.86 : 1) * (0.72 + random() * 0.62);
    // Occasionally leave a noticeably longer pause to make the solver feel like
    // it is considering the next move rather than playing back at a fixed rate.
    if (random() < 0.14) weight += 1.25 + random() * 1.35;
    return weight;
  });
  const weightTotal = weights.reduce((sum, weight) => sum + weight, 0);
  const remainingMs = Math.max(actions.length * 140, targetGameplayMs - firstDelay);
  return [
    firstDelay,
    ...weights.map((weight) => Math.max(140, Math.round((remainingMs * weight) / weightTotal)))
  ];
}

export default function SocialDemo(): React.JSX.Element {
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const seed = params.get("seed") ?? "hanage-social-demo-v1";
  const targetGameplayMs = Math.max(16000, Number(params.get("target")) || 22000);
  const demo = useMemo(() => createDemo(seed), [seed]);
  const actionDelays = useMemo(
    () => buildActionDelays(demo.actions, seed, targetGameplayMs),
    [demo.actions, seed, targetGameplayMs]
  );
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
    const delay = actionDelays[actionIndex] ?? 250;
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
  }, [actionDelays, actionIndex, demo.actions]);

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
