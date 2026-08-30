import { useEffect, useMemo, useRef, useState } from "react";
import { GameBoard } from "./components/GameBoard";
import { GestureArrow } from "./components/GestureArrow";
import {
  canChord,
  checkWin,
  chordCell,
  cloneBoard,
  createEmptyBoard,
  flagColorHex,
  remainingFlagCount,
  revealCell,
  setFlag
} from "./game/game-core";
import {
  DIFFICULTIES,
  FLAG_GESTURES,
  GENERATING_INDICATOR_DELAY_MS,
  PRODUCT_FILTER
} from "./game/rules";
import type { Board, ColorCount, FlagColor, MineCount } from "./game/types";
import { createGeneratorClient, type GeneratorClient } from "./workers/generator-client";

type Phase = "settings" | "awaiting-first" | "generating" | "playing" | "won" | "lost" | "error";
type ResultPhase = Extract<Phase, "won" | "lost" | "error">;

function isResultPhase(phase: Phase): phase is ResultPhase {
  return phase === "won" || phase === "lost" || phase === "error";
}

function makeBaseSeed(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `game-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function formatTime(milliseconds: number): string {
  return (milliseconds / 1000).toFixed(2).padStart(5, "0");
}

export default function App(): React.JSX.Element {
  const [mineCount, setMineCount] = useState<MineCount>(20);
  const [colorCount, setColorCount] = useState<ColorCount>(3);
  const [phase, setPhase] = useState<Phase>("settings");
  const [board, setBoard] = useState<Board>(() => createEmptyBoard(3, 20));
  const [baseSeed, setBaseSeed] = useState("");
  const [elapsedMs, setElapsedMs] = useState(0);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [showGenerating, setShowGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [resultOpen, setResultOpen] = useState(false);
  const clientRef = useRef<GeneratorClient | null>(null);
  const generationRequestRef = useRef(0);
  const resultDialogRef = useRef<HTMLDivElement | null>(null);
  const resultButtonRef = useRef<HTMLButtonElement | null>(null);
  const gameplayLayout = phase !== "settings";
  const resultPhase = isResultPhase(phase) ? phase : null;
  const showGestureGuide = phase === "awaiting-first" || phase === "generating" || phase === "playing";

  useEffect(() => {
    const client = createGeneratorClient();
    clientRef.current = client;
    return () => {
      client.dispose();
      clientRef.current = null;
    };
  }, []);

  useEffect(() => {
    document.documentElement.classList.add("app-viewport-locked");
    document.body.classList.add("app-viewport-locked");
    return () => {
      document.documentElement.classList.remove("app-viewport-locked");
      document.body.classList.remove("app-viewport-locked");
    };
  }, []);

  useEffect(() => {
    setResultOpen(resultPhase !== null);
  }, [resultPhase]);

  useEffect(() => {
    if (!resultOpen || resultPhase === null) return;
    const frame = window.requestAnimationFrame(() => resultDialogRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [resultOpen, resultPhase]);

  useEffect(() => {
    if (phase !== "playing" || startedAt === null) return;
    const update = (): void => setElapsedMs(performance.now() - startedAt);
    update();
    const interval = window.setInterval(update, 50);
    return () => window.clearInterval(interval);
  }, [phase, startedAt]);

  const flagsRemaining = remainingFlagCount(mineCount, board);
  const selectedDifficulty = useMemo(
    () => DIFFICULTIES.find((difficulty) => difficulty.mineCount === mineCount),
    [mineCount]
  );

  const enterBoard = (): void => {
    generationRequestRef.current += 1;
    const seed = makeBaseSeed();
    setBaseSeed(seed);
    setBoard(createEmptyBoard(colorCount, mineCount, seed));
    setElapsedMs(0);
    setStartedAt(null);
    setErrorMessage("");
    setResultOpen(false);
    setPhase("awaiting-first");
  };

  const generateFromFirstClick = async (row: number, col: number): Promise<void> => {
    const client = clientRef.current;
    if (!client) {
      setErrorMessage("盤面生成の準備ができませんでした。再読み込みしてください。");
      setPhase("error");
      return;
    }
    const requestId = ++generationRequestRef.current;
    setPhase("generating");
    setShowGenerating(false);
    const indicatorTimer = window.setTimeout(
      () => setShowGenerating(true),
      GENERATING_INDICATOR_DELAY_MS
    );
    try {
      const result = await client.generate({
        baseSeed,
        filter: PRODUCT_FILTER,
        mineCount,
        firstRow: row,
        firstCol: col,
        includeTrace: false
      });
      if (generationRequestRef.current !== requestId) return;
      if ("failed" in result) throw new Error("条件Cの盤面を生成上限内に発見できませんでした");
      const generated = colorCount === 3 ? result.board3 : result.board4;
      if (!generated) throw new Error("4色盤面が生成されませんでした");
      revealCell(generated, row, col);
      setBoard(generated);
      const timerStart = performance.now();
      setElapsedMs(0);
      setStartedAt(timerStart);
      setPhase("playing");
    } catch (error) {
      if (generationRequestRef.current !== requestId) return;
      console.error("Board generation failed", error);
      setErrorMessage("盤面を生成できませんでした。もう一度お試しください。");
      setPhase("error");
    } finally {
      window.clearTimeout(indicatorTimer);
      if (generationRequestRef.current === requestId) setShowGenerating(false);
    }
  };

  const finishAfterMove = (next: Board, hitMine: boolean): void => {
    setBoard(next);
    if (startedAt !== null) setElapsedMs(performance.now() - startedAt);
    if (hitMine) {
      setStartedAt(null);
      setPhase("lost");
    } else if (checkWin(next)) {
      setStartedAt(null);
      setPhase("won");
    }
  };

  const handleOpen = (row: number, col: number): void => {
    if (phase === "awaiting-first") {
      void generateFromFirstClick(row, col);
      return;
    }
    if (phase !== "playing") return;
    const next = cloneBoard(board);
    const cell = next.cells[row][col];
    const result = cell.state === "revealed" && canChord(next, row, col)
      ? chordCell(next, row, col)
      : revealCell(next, row, col);
    finishAfterMove(next, result.type === "mine");
  };

  const handleFlag = (row: number, col: number, flag: FlagColor): void => {
    if (phase !== "playing") return;
    const next = cloneBoard(board);
    setFlag(next, row, col, flag);
    setBoard(next);
  };

  const resetToSettings = (): void => {
    generationRequestRef.current += 1;
    setPhase("settings");
    setBoard(createEmptyBoard(colorCount, mineCount));
    setStartedAt(null);
    setElapsedMs(0);
    setResultOpen(false);
  };

  const closeResult = (): void => {
    if (resultPhase === "error") return;
    setResultOpen(false);
    window.requestAnimationFrame(() => resultButtonRef.current?.focus());
  };

  const statusText: Record<Phase, string> = {
    settings: "難易度と色数を選んでください",
    "awaiting-first": "好きなマスをタップしてください",
    generating: showGenerating ? "盤面を生成中…" : "",
    playing: "タップで開く・スワイプで旗",
    won: "CLEAR!",
    lost: "GAME OVER",
    error: "生成エラー"
  };

  const flagsLabel = flagsRemaining < 0
    ? `残り旗数 ${flagsRemaining}。旗が${Math.abs(flagsRemaining)}本多いです`
    : `残り旗数 ${flagsRemaining}`;

  return (
    <main className={`app-shell app-shell-${gameplayLayout ? "gameplay" : "settings"}`}>
      <section className="game-panel" aria-labelledby="game-title">
        <header className="game-header">
          <div>
            <p className="eyebrow">TIME ATTACK</p>
            <h1 id="game-title">MULTICOLOR SWEEPER</h1>
          </div>
          <div className="metrics" aria-label="ゲーム情報">
            <span><small>TIME</small>{formatTime(elapsedMs)}</span>
            <span
              aria-label={flagsLabel}
              style={flagsRemaining < 0 ? {
                color: "#ff8894",
                textShadow: "0 0 6px rgba(255, 136, 148, 0.45)"
              } : undefined}
            >
              <small>FLAGS</small>{flagsRemaining.toString().padStart(2, "0")}
            </span>
          </div>
        </header>

        {phase === "settings" ? (
          <div className="settings">
            <fieldset>
              <legend>DIFFICULTY</legend>
              <div className="choice-row">
                {DIFFICULTIES.map((difficulty) => (
                  <button
                    key={difficulty.id}
                    type="button"
                    className={mineCount === difficulty.mineCount ? "selected" : ""}
                    onClick={() => setMineCount(difficulty.mineCount)}
                  >
                    {difficulty.label}<small>{difficulty.mineCount} BOMBS</small>
                  </button>
                ))}
              </div>
            </fieldset>
            <fieldset>
              <legend>COLORS</legend>
              <div className="choice-row colors-choice">
                {[3, 4].map((count) => (
                  <button
                    key={count}
                    type="button"
                    className={colorCount === count ? "selected" : ""}
                    onClick={() => setColorCount(count as ColorCount)}
                  >
                    {count} COLORS
                  </button>
                ))}
              </div>
            </fieldset>
            <button className="start-button" type="button" onClick={enterBoard}>START</button>
          </div>
        ) : (
          <>
            <div className="game-meta">
              <span>{selectedDifficulty?.label} / {colorCount} COLORS</span>
              <button type="button" onClick={resetToSettings} disabled={resultOpen}>MENU</button>
            </div>
            <div className="board-wrap">
              <GameBoard
                board={board}
                interactive={phase === "awaiting-first" || phase === "playing"}
                review={phase === "won" || phase === "lost"}
                awaitingFirst={phase === "awaiting-first"}
                onOpen={handleOpen}
                onFlag={handleFlag}
              />
              {phase === "generating" && showGenerating ? (
                <div className="generating-overlay" role="status">
                  <span className="spinner" />
                  <strong>GENERATING</strong>
                </div>
              ) : null}
              {resultPhase !== null && resultOpen ? (
                <div className="result-overlay">
                  <div
                    ref={resultDialogRef}
                    className={`result-dialog result-dialog-${resultPhase}`}
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="result-title"
                    tabIndex={-1}
                    onKeyDown={(event) => {
                      if (event.key === "Escape" && resultPhase !== "error") closeResult();
                    }}
                  >
                    <h2 id="result-title">
                      {resultPhase === "won" ? "CLEAR!" : resultPhase === "lost" ? "GAME OVER" : "ERROR"}
                    </h2>
                    {resultPhase === "won" ? (
                      <p className="result-time">TIME <strong>{formatTime(elapsedMs)}</strong></p>
                    ) : null}
                    {resultPhase === "error" ? <p className="result-error">{errorMessage}</p> : null}
                    <div className="result-actions">
                      <button type="button" onClick={enterBoard}>RETRY</button>
                      <button type="button" onClick={resetToSettings}>MENU</button>
                      {resultPhase !== "error" ? (
                        <button className="review-button" type="button" onClick={closeResult}>盤面を見る</button>
                      ) : null}
                    </div>
                  </div>
                </div>
              ) : null}
              {resultPhase !== null && !resultOpen ? (
                <button
                  ref={resultButtonRef}
                  className="result-reopen"
                  type="button"
                  onClick={() => setResultOpen(true)}
                >
                  RESULT
                </button>
              ) : null}
            </div>

            <p
              className={`status status-${phase}${resultOpen ? " status-result-open" : ""}`}
              aria-live="polite"
            >
              {statusText[phase]}
            </p>

            <div
              className={`gesture-guide gesture-guide-${colorCount}${showGestureGuide ? "" : " gesture-guide-hidden"}`}
              aria-label={showGestureGuide ? "旗のスワイプ方向" : undefined}
              aria-hidden={!showGestureGuide}
            >
              {FLAG_GESTURES[colorCount].map((gesture) => (
                <span key={gesture.label}>
                  <GestureArrow angle={gesture.angle} color={flagColorHex(gesture.flag)} />
                  {gesture.label}
                </span>
              ))}
            </div>
          </>
        )}
      </section>
    </main>
  );
}
