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
import {
  bombCountLabel,
  colorCountLabel,
  difficultyLabel,
  flagLabel,
  flagsRemainingLabel,
  getCopy,
  type Language
} from "./i18n";
import { createGeneratorClient, type GeneratorClient } from "./workers/generator-client";

type Phase = "settings" | "awaiting-first" | "generating" | "playing" | "won" | "lost" | "error";
type ResultPhase = Extract<Phase, "won" | "lost" | "error">;
const ACTIVE_LANGUAGE: Language = "en";

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
  const language = ACTIVE_LANGUAGE;
  const copy = getCopy(language);
  const japaneseCopy = getCopy("ja");

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
      setErrorMessage(copy.errors.clientUnavailable);
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
      setErrorMessage(copy.errors.generationFailed);
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
    settings: copy.status.settings,
    "awaiting-first": copy.status.awaitingFirst,
    generating: showGenerating ? copy.status.generating : "",
    playing: copy.status.playing,
    won: copy.status.won,
    lost: copy.status.lost,
    error: copy.status.error
  };
  const statusTranslation = phase === "awaiting-first"
    ? japaneseCopy.status.awaitingFirst
    : phase === "playing"
      ? japaneseCopy.status.playing
      : null;

  const flagsLabel = flagsRemainingLabel(language, flagsRemaining);

  return (
    <main className={`app-shell app-shell-${gameplayLayout ? "gameplay" : "settings"}`}>
      <section
        className="game-panel"
        aria-labelledby={phase === "settings" ? "game-title" : undefined}
        aria-label={phase === "settings" ? undefined : "Multicolor Sweeper game"}
      >
        <header className={`game-header game-header-${gameplayLayout ? "gameplay" : "settings"}`}>
          {phase === "settings" ? (
            <div>
              <p className="eyebrow">{copy.timeAttack}</p>
              <h1 id="game-title">MULTICOLOR SWEEPER</h1>
            </div>
          ) : (
            <div className="metrics" aria-label={copy.gameInfo}>
              <span><small>{copy.time}</small>{formatTime(elapsedMs)}</span>
              <span
                aria-label={flagsLabel}
                style={flagsRemaining < 0 ? {
                  color: "#ff8894",
                  textShadow: "0 0 6px rgba(255, 136, 148, 0.45)"
                } : undefined}
              >
                <small>{copy.flags}</small>{flagsRemaining.toString().padStart(2, "0")}
              </span>
            </div>
          )}
        </header>

        {phase === "settings" ? (
          <div className="settings">
            <fieldset>
              <legend>{copy.difficulty}</legend>
              <div className="choice-row">
                {DIFFICULTIES.map((difficulty) => (
                  <button
                    key={difficulty.id}
                    type="button"
                    className={mineCount === difficulty.mineCount ? "selected" : ""}
                    onClick={() => setMineCount(difficulty.mineCount)}
                  >
                    {difficultyLabel(language, difficulty.id)}
                    <small>{bombCountLabel(language, difficulty.mineCount)}</small>
                  </button>
                ))}
              </div>
            </fieldset>
            <fieldset>
              <legend>{copy.colors}</legend>
              <div className="choice-row colors-choice">
                {[3, 4].map((count) => (
                  <button
                    key={count}
                    type="button"
                    className={colorCount === count ? "selected" : ""}
                    onClick={() => setColorCount(count as ColorCount)}
                  >
                    {colorCountLabel(language, count as ColorCount)}
                  </button>
                ))}
              </div>
            </fieldset>
            <button className="start-button" type="button" onClick={enterBoard}>{copy.start}</button>
          </div>
        ) : (
          <>
            <div className="game-meta">
              <span>
                {selectedDifficulty ? difficultyLabel(language, selectedDifficulty.id) : ""}
                {" / "}{colorCountLabel(language, colorCount)}
              </span>
              <button type="button" onClick={resetToSettings} disabled={resultOpen}>{copy.menu}</button>
            </div>
            <div className="board-wrap">
              <GameBoard
                board={board}
                language={language}
                interactive={phase === "awaiting-first" || phase === "playing"}
                review={phase === "won" || phase === "lost"}
                awaitingFirst={phase === "awaiting-first"}
                onOpen={handleOpen}
                onFlag={handleFlag}
              />
              {phase === "generating" && showGenerating ? (
                <div className="generating-overlay" role="status">
                  <span className="spinner" />
                  <strong>{copy.generating}</strong>
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
                      {resultPhase === "won" ? copy.clear : resultPhase === "lost" ? copy.gameOver : copy.error}
                    </h2>
                    {resultPhase === "won" ? (
                      <p className="result-time">{copy.time} <strong>{formatTime(elapsedMs)}</strong></p>
                    ) : null}
                    {resultPhase === "error" ? <p className="result-error">{errorMessage}</p> : null}
                    <div className="result-actions">
                      <button type="button" onClick={enterBoard}>{copy.retry}</button>
                      <button type="button" onClick={resetToSettings}>{copy.menu}</button>
                      {resultPhase !== "error" ? (
                        <button className="review-button" type="button" onClick={closeResult}>{copy.viewBoard}</button>
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
                  {copy.result}
                </button>
              ) : null}
            </div>

            <p
              className={`status status-${phase}${statusTranslation ? " status-bilingual" : ""}${resultOpen ? " status-result-open" : ""}`}
              aria-live="polite"
            >
              <span>{statusText[phase]}</span>
              {statusTranslation ? <span className="status-translation" lang="ja">{statusTranslation}</span> : null}
            </p>

            <div
              className={`gesture-guide gesture-guide-${colorCount}${showGestureGuide ? "" : " gesture-guide-hidden"}`}
              aria-label={showGestureGuide ? copy.flagDirections : undefined}
              aria-hidden={!showGestureGuide}
            >
              {FLAG_GESTURES[colorCount].map((gesture) => (
                <span key={String(gesture.flag)}>
                  <GestureArrow angle={gesture.angle} color={flagColorHex(gesture.flag)} />
                  {flagLabel(language, gesture.flag)}
                </span>
              ))}
            </div>
          </>
        )}
      </section>
    </main>
  );
}
