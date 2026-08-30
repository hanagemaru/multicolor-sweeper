import { useEffect, useMemo, useRef, useState } from "react";
import { GameBoard } from "./components/GameBoard";
import { GestureArrow } from "./components/GestureArrow";
import {
  canChord,
  checkWin,
  chordCell,
  cloneBoard,
  countFlags,
  createEmptyBoard,
  flagColorHex,
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
  const [generationStats, setGenerationStats] = useState<{ elapsedMs: number; attempts: number } | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const clientRef = useRef<GeneratorClient | null>(null);
  const generationRequestRef = useRef(0);
  const lockGameplayViewport = phase === "awaiting-first" || phase === "generating" || phase === "playing";

  useEffect(() => {
    const client = createGeneratorClient();
    clientRef.current = client;
    return () => {
      client.dispose();
      clientRef.current = null;
    };
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("gameplay-locked", lockGameplayViewport);
    document.body.classList.toggle("gameplay-locked", lockGameplayViewport);
    return () => {
      document.documentElement.classList.remove("gameplay-locked");
      document.body.classList.remove("gameplay-locked");
    };
  }, [lockGameplayViewport]);

  useEffect(() => {
    if (phase !== "playing" || startedAt === null) return;
    const update = (): void => setElapsedMs(performance.now() - startedAt);
    update();
    const interval = window.setInterval(update, 50);
    return () => window.clearInterval(interval);
  }, [phase, startedAt]);

  const flagsRemaining = Math.max(0, mineCount - countFlags(board));
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
    setGenerationStats(null);
    setErrorMessage("");
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
      setGenerationStats({ elapsedMs: result.elapsedMs, attempts: result.attempts });
      const timerStart = performance.now();
      setElapsedMs(0);
      setStartedAt(timerStart);
      setPhase("playing");
    } catch (error) {
      if (generationRequestRef.current !== requestId) return;
      setErrorMessage(error instanceof Error ? error.message : String(error));
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
  };

  const statusText: Record<Phase, string> = {
    settings: "難易度と色数を選んでください",
    "awaiting-first": "好きなマスをタップしてください",
    generating: showGenerating ? "NO-GUESS盤面を生成中…" : "",
    playing: "タップで開く・スワイプで旗",
    won: "CLEAR!",
    lost: "GAME OVER",
    error: "生成エラー"
  };

  return (
    <main className={`app-shell${lockGameplayViewport ? " app-shell-gameplay" : ""}`}>
      <section className="game-panel" aria-labelledby="game-title">
        <header className="game-header">
          <div>
            <p className="eyebrow">TIME ATTACK / CONDITION C</p>
            <h1 id="game-title">MULTICOLOR SWEEPER</h1>
          </div>
          <div className="metrics" aria-label="ゲーム情報">
            <span><small>TIME</small>{formatTime(elapsedMs)}</span>
            <span><small>MINES</small>{flagsRemaining.toString().padStart(2, "0")}</span>
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
              <button type="button" onClick={resetToSettings}>設定へ戻る</button>
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
                  <small>NO-GUESS BOARD</small>
                </div>
              ) : null}
            </div>

            <p className={`status status-${phase}`} aria-live="polite">{statusText[phase]}</p>

            {phase === "playing" || phase === "awaiting-first" ? (
              <div className={`gesture-guide gesture-guide-${colorCount}`} aria-label="旗のスワイプ方向">
                {FLAG_GESTURES[colorCount].map((gesture) => (
                  <span key={gesture.label}>
                    <GestureArrow angle={gesture.angle} color={flagColorHex(gesture.flag)} />
                    {gesture.label}
                  </span>
                ))}
              </div>
            ) : null}

            {(phase === "won" || phase === "lost" || phase === "error") ? (
              <div className="result-panel">
                {phase === "won" || phase === "lost" ? (
                  <p>TIME <strong>{formatTime(elapsedMs)}</strong></p>
                ) : null}
                {phase === "error" ? <p>{errorMessage}</p> : null}
                <button type="button" onClick={enterBoard}>RETRY</button>
                <button type="button" onClick={resetToSettings}>SETTINGS</button>
              </div>
            ) : null}

            {generationStats ? (
              <p className="seed-line">
                SEED {baseSeed.slice(0, 8)}… / {generationStats.attempts} attempts / {Math.round(generationStats.elapsedMs)}ms
              </p>
            ) : null}
          </>
        )}
      </section>
    </main>
  );
}
