import { useEffect, useMemo, useRef, useState } from "react";
import { buttonUiText } from "./button-typography";
import { GameBoard } from "./components/GameBoard";
import { GestureArrow } from "./components/GestureArrow";
import { GameAudio } from "./effects/game-audio";
import {
  cascadePulseForReveal,
  clearEffectForResult,
  openingEffectsForCells,
  prefersReducedMotion,
  PRODUCT_EFFECT_SELECTION,
  resultDelay,
  type BoardOutcomeEffect,
  type CascadePulseEffect,
  type CellOpeningEffects
} from "./effects/game-effects";
import {
  canChord,
  chordCell,
  cloneBoard,
  createEmptyBoard,
  flagColorHex,
  remainingFlagCount,
  revealCell,
  setFlag
} from "./game/game-core";
import { resolveMoveOutcome } from "./game/move-outcome";
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
  persistLanguage,
  readInitialLanguage,
  type Language
} from "./i18n";
import {
  fetchRanking,
  readOrCreatePlayerIdentity,
  submitOnlineRecord,
  updateOnlinePlayerName
} from "./ranking-client";
import {
  RANKING_APP_VERSION,
  RANKING_RULE_VERSION,
  type PlayerIdentity,
  type RecordedAction,
  type SubmitRecordRequest
} from "./ranking-shared";
import {
  AUTO_RANKING_DELAY_MS,
  bestRecordStorageKey,
  canSubmitResult,
  destinationAfterSuccessfulSubmit,
  PLAYER_NAME_STORAGE_KEY,
  resetLegacyTestRecordsOnce,
  type RankingEntry
} from "./ranking";
import { createGeneratorClient, type GeneratorClient } from "./workers/generator-client";

type Phase = "settings" | "awaiting-first" | "generating" | "playing" | "won" | "lost" | "error";
type ResultPhase = Extract<Phase, "won" | "lost" | "error">;
type SubmitState = "idle" | "sending" | "success" | "error";
type RankingOrigin = "settings" | "result";
type NamePurpose = "profile" | "submit";

interface LocalRecord {
  timeMs: number;
  colorCount: ColorCount;
}

function isResultPhase(phase: Phase): phase is ResultPhase {
  return phase === "won" || phase === "lost" || phase === "error";
}

function makeBaseSeed(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `game-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function makeSubmissionId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `submission-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function formatTime(milliseconds: number): string {
  return (milliseconds / 1000).toFixed(2).padStart(5, "0");
}

function mixedUiText(text: string): React.ReactNode {
  if (!/[\u3040-\u30ff\u3400-\u9fff]/u.test(text)) return text;
  return text.split(/([A-Za-z0-9#./:+-]+)/gu).map((part, index) => (
    /[A-Za-z0-9]/u.test(part)
      ? <span className="mixed-latin-run" key={`${part}-${index}`}>{part}</span>
      : part
  ));
}

function readStoredRecord(key: string): LocalRecord | null {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<LocalRecord>;
    if (typeof parsed.timeMs !== "number" || (parsed.colorCount !== 3 && parsed.colorCount !== 4)) return null;
    return { timeMs: parsed.timeMs, colorCount: parsed.colorCount };
  } catch {
    return null;
  }
}

function persistRecord(key: string, record: LocalRecord): void {
  window.localStorage.setItem(key, JSON.stringify(record));
}

export default function App(): React.JSX.Element {
  const [language, setLanguage] = useState<Language>(() => readInitialLanguage());
  const [mineCount, setMineCount] = useState<MineCount>(20);
  const [colorCount, setColorCount] = useState<ColorCount>(3);
  const [phase, setPhase] = useState<Phase>("settings");
  const [board, setBoard] = useState<Board>(() => createEmptyBoard(3, 20));
  const [baseSeed, setBaseSeed] = useState("");
  const [elapsedMs, setElapsedMs] = useState(0);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const elapsedBeforeSegmentRef = useRef(0);
  const [paused, setPaused] = useState(false);
  const [showGenerating, setShowGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [resultOpen, setResultOpen] = useState(false);
  const [newBest, setNewBest] = useState(false);
  const [bestRecords, setBestRecords] = useState<Partial<Record<MineCount, LocalRecord>>>({});
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [submittedRank, setSubmittedRank] = useState<number | null>(null);
  const [playerName, setPlayerName] = useState("");
  const [nameEditorOpen, setNameEditorOpen] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [namePurpose, setNamePurpose] = useState<NamePurpose>("profile");
  const [nameSaving, setNameSaving] = useState(false);
  const [nameError, setNameError] = useState(false);
  const [rankingOpen, setRankingOpen] = useState(false);
  const [rankingOrigin, setRankingOrigin] = useState<RankingOrigin>("settings");
  const [rankingMineCount, setRankingMineCount] = useState<MineCount>(20);
  const [rankingEntries, setRankingEntries] = useState<RankingEntry[]>([]);
  const [yourRank, setYourRank] = useState<number | null>(null);
  const [rankingLoading, setRankingLoading] = useState(false);
  const [rankingError, setRankingError] = useState(false);
  const [openingEffects, setOpeningEffects] = useState<CellOpeningEffects>({});
  const [cascadePulse, setCascadePulse] = useState<CascadePulseEffect | null>(null);
  const [outcomeEffect, setOutcomeEffect] = useState<BoardOutcomeEffect | null>(null);
  const [resultPending, setResultPending] = useState(false);

  const clientRef = useRef<GeneratorClient | null>(null);
  const audioRef = useRef<GameAudio | null>(null);
  const identityRef = useRef<PlayerIdentity | null>(null);
  const boardStateRef = useRef(board);
  const effectIdRef = useRef(0);
  const generationRequestRef = useRef(0);
  const resultDialogRef = useRef<HTMLDivElement | null>(null);
  const resultButtonRef = useRef<HTMLButtonElement | null>(null);
  const rankingRedirectTimerRef = useRef<number | null>(null);
  const submitRequestVersionRef = useRef(0);
  const allowAutoRankingRef = useRef(false);
  const acceptedAttemptRef = useRef<number | null>(null);
  const firstClickRef = useRef<{ row: number; col: number } | null>(null);
  const actionHistoryRef = useRef<RecordedAction[]>([]);
  const scoreSubmissionIdRef = useRef<string | null>(null);

  const gameplayLayout = phase !== "settings";
  const resultPhase = isResultPhase(phase) ? phase : null;
  const showGestureGuide = phase === "awaiting-first" || phase === "generating" || phase === "playing";
  const copy = getCopy(language);
  const rankingUnavailable = language === "ja" ? "ランキングを取得できません" : "RANKING UNAVAILABLE";

  useEffect(() => {
    const client = createGeneratorClient();
    const audio = new GameAudio();
    clientRef.current = client;
    audioRef.current = audio;
    try {
      identityRef.current = readOrCreatePlayerIdentity(window.localStorage);
    } catch {
      identityRef.current = readOrCreatePlayerIdentity({
        getItem: () => null,
        setItem: () => {},
        removeItem: () => {},
        clear: () => {},
        key: () => null,
        length: 0
      } as Storage);
    }
    return () => {
      submitRequestVersionRef.current += 1;
      if (rankingRedirectTimerRef.current !== null) window.clearTimeout(rankingRedirectTimerRef.current);
      client.dispose();
      audio.dispose();
      clientRef.current = null;
      audioRef.current = null;
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
    document.documentElement.lang = language;
    persistLanguage(language);
  }, [language]);

  const selectLanguage = (nextLanguage: Language): void => {
    setLanguage(nextLanguage);
  };

  useEffect(() => {
    try {
      resetLegacyTestRecordsOnce(window.localStorage);
      setPlayerName(window.localStorage.getItem(PLAYER_NAME_STORAGE_KEY) ?? "");
    } catch {
      setPlayerName("");
    }
    const best: Partial<Record<MineCount, LocalRecord>> = {};
    for (const count of [15, 20, 25] as const) {
      const bestRecord = readStoredRecord(bestRecordStorageKey(count));
      if (bestRecord) best[count] = bestRecord;
    }
    setBestRecords(best);
  }, []);

  useEffect(() => {
    if (resultPhase === null) {
      setResultOpen(false);
      setResultPending(false);
      return;
    }
    if (resultPhase === "error") {
      setResultPending(false);
      setResultOpen(true);
      return;
    }

    if (!outcomeEffect) return;
    setResultOpen(false);
    setResultPending(true);
    const timer = window.setTimeout(() => {
      setOutcomeEffect(null);
      setResultPending(false);
      setResultOpen(true);
    }, resultDelay(outcomeEffect, prefersReducedMotion()));
    return () => window.clearTimeout(timer);
  }, [resultPhase]);

  useEffect(() => {
    if (!resultOpen || resultPhase === null || rankingOpen || nameEditorOpen) return;
    const frame = window.requestAnimationFrame(() => resultDialogRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [resultOpen, resultPhase, rankingOpen, nameEditorOpen]);

  useEffect(() => {
    if (phase !== "playing" || paused || startedAt === null) return;
    const update = (): void => {
      setElapsedMs(elapsedBeforeSegmentRef.current + performance.now() - startedAt);
    };
    update();
    const interval = window.setInterval(update, 50);
    return () => window.clearInterval(interval);
  }, [phase, paused, startedAt]);

  const flagsRemaining = remainingFlagCount(mineCount, board);
  const selectedDifficulty = useMemo(
    () => DIFFICULTIES.find((difficulty) => difficulty.mineCount === mineCount),
    [mineCount]
  );

  const currentElapsed = (): number => (
    startedAt === null
      ? elapsedBeforeSegmentRef.current
      : elapsedBeforeSegmentRef.current + performance.now() - startedAt
  );

  const commitBoard = (next: Board): void => {
    boardStateRef.current = next;
    setBoard(next);
  };

  const cancelAutoRanking = (): void => {
    allowAutoRankingRef.current = false;
    if (rankingRedirectTimerRef.current !== null) {
      window.clearTimeout(rankingRedirectTimerRef.current);
      rankingRedirectTimerRef.current = null;
    }
  };

  const animateReveal = (cells: readonly { row: number; col: number }[], row: number, col: number): void => {
    if (cells.length === 0) return;
    const id = ++effectIdRef.current;
    const nextEffects = openingEffectsForCells(cells, { row, col }, id);
    setOpeningEffects((current) => ({ ...current, ...nextEffects }));
    const delays = Object.values(nextEffects).map((effect) => effect.delayMs);
    setCascadePulse(cascadePulseForReveal(nextEffects, cells.length, id));
    audioRef.current?.playReveal(delays, cells.length);
  };

  const enterBoard = (nextMineCount: MineCount = mineCount, nextColorCount: ColorCount = colorCount): void => {
    generationRequestRef.current += 1;
    submitRequestVersionRef.current += 1;
    cancelAutoRanking();
    const seed = makeBaseSeed();
    setMineCount(nextMineCount);
    setColorCount(nextColorCount);
    setBaseSeed(seed);
    commitBoard(createEmptyBoard(nextColorCount, nextMineCount, seed));
    elapsedBeforeSegmentRef.current = 0;
    setElapsedMs(0);
    setStartedAt(null);
    setPaused(false);
    setErrorMessage("");
    setResultOpen(false);
    setNewBest(false);
    setSubmitState("idle");
    setSubmittedRank(null);
    setRankingOpen(false);
    setOpeningEffects({});
    setCascadePulse(null);
    setOutcomeEffect(null);
    setResultPending(false);
    acceptedAttemptRef.current = null;
    firstClickRef.current = null;
    actionHistoryRef.current = [];
    scoreSubmissionIdRef.current = null;
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
    const indicatorTimer = window.setTimeout(() => setShowGenerating(true), GENERATING_INDICATOR_DELAY_MS);
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
      const reveal = revealCell(generated, row, col);
      commitBoard(generated);
      animateReveal(reveal.cells, row, col);
      acceptedAttemptRef.current = result.attempt;
      firstClickRef.current = { row, col };
      actionHistoryRef.current = [];
      elapsedBeforeSegmentRef.current = 0;
      setElapsedMs(0);
      setStartedAt(performance.now());
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

  const recordLocalBest = (timeMs: number): boolean => {
    const previous = bestRecords[mineCount];
    const isBest = previous === undefined || timeMs < previous.timeMs;
    setNewBest(isBest);
    if (!isBest) return false;
    const record = { timeMs, colorCount };
    setBestRecords((current) => ({ ...current, [mineCount]: record }));
    try {
      persistRecord(bestRecordStorageKey(mineCount), record);
    } catch {
      // The result still remains visible when storage is unavailable.
    }
    return true;
  };

  const finishAfterMove = (next: Board, hitMine: boolean, row: number, col: number): void => {
    const outcome = resolveMoveOutcome(next, hitMine);
    commitBoard(next);
    if (outcome === null) return;

    setCascadePulse(null);

    const finalElapsed = currentElapsed();
    elapsedBeforeSegmentRef.current = finalElapsed;
    setElapsedMs(finalElapsed);
    setStartedAt(null);
    if (outcome === "lost") {
      const exploded = next.cells.flat().find((cell) => cell.state === "exploded") ?? { row, col };
      setOutcomeEffect({
        id: ++effectIdRef.current,
        type: "explosion",
        origin: { row: exploded.row, col: exploded.col },
        variant: PRODUCT_EFFECT_SELECTION.explosion
      });
      setResultPending(true);
      audioRef.current?.playExplosion(PRODUCT_EFFECT_SELECTION.explosion);
      setPhase("lost");
    } else {
      const isNewBest = recordLocalBest(finalElapsed);
      const clearVariant = clearEffectForResult(isNewBest);
      setOutcomeEffect({ id: ++effectIdRef.current, type: "clear", variant: clearVariant });
      setResultPending(true);
      audioRef.current?.playClear(clearVariant, prefersReducedMotion() ? 0 : undefined);
      setPhase("won");
    }
  };

  const handleOpen = (row: number, col: number): void => {
    if (paused) return;
    audioRef.current?.unlock();
    if (phase === "awaiting-first") {
      void generateFromFirstClick(row, col);
      return;
    }
    if (phase !== "playing") return;
    actionHistoryRef.current.push({ type: "open", row, col, elapsedMs: currentElapsed() });
    const next = cloneBoard(boardStateRef.current);
    const cell = next.cells[row][col];
    const result = cell.state === "revealed" && canChord(next, row, col)
      ? chordCell(next, row, col)
      : revealCell(next, row, col);
    if (result.type === "reveal") animateReveal(result.cells, row, col);
    finishAfterMove(next, result.type === "mine", row, col);
  };

  const handleFlag = (row: number, col: number, flag: FlagColor): void => {
    if (phase !== "playing" || paused) return;
    audioRef.current?.unlock();
    actionHistoryRef.current.push({ type: "flag", row, col, flag, elapsedMs: currentElapsed() });
    const next = cloneBoard(boardStateRef.current);
    const previousFlag = next.cells[row][col].flag;
    setFlag(next, row, col, flag);
    const nextFlag = next.cells[row][col].flag;
    if (nextFlag !== previousFlag) {
      audioRef.current?.playFlag(nextFlag === null ? "remove" : "place");
    }
    commitBoard(next);
  };

  const resetToSettings = (): void => {
    generationRequestRef.current += 1;
    submitRequestVersionRef.current += 1;
    cancelAutoRanking();
    setPhase("settings");
    commitBoard(createEmptyBoard(colorCount, mineCount));
    elapsedBeforeSegmentRef.current = 0;
    setStartedAt(null);
    setElapsedMs(0);
    setPaused(false);
    setResultOpen(false);
    setRankingOpen(false);
    setSubmitState("idle");
    setOpeningEffects({});
    setCascadePulse(null);
    setOutcomeEffect(null);
    setResultPending(false);
  };

  const pauseGame = (): void => {
    if (phase !== "playing" || paused) return;
    const pausedElapsed = currentElapsed();
    elapsedBeforeSegmentRef.current = pausedElapsed;
    setElapsedMs(pausedElapsed);
    setStartedAt(null);
    setPaused(true);
  };

  const resumeGame = (): void => {
    if (!paused || phase !== "playing") return;
    setPaused(false);
    setStartedAt(performance.now());
  };

  const closeResult = (): void => {
    if (resultPhase === "error") return;
    cancelAutoRanking();
    setResultOpen(false);
    window.requestAnimationFrame(() => resultButtonRef.current?.focus());
  };

  const openNameEditor = (purpose: NamePurpose): void => {
    setNamePurpose(purpose);
    setNameDraft(playerName);
    setNameError(false);
    setNameEditorOpen(true);
  };

  const savePlayerNameLocally = (name: string): boolean => {
    const trimmed = name.trim().slice(0, 16);
    if (!trimmed) return false;
    setPlayerName(trimmed);
    try {
      window.localStorage.setItem(PLAYER_NAME_STORAGE_KEY, trimmed);
    } catch {
      // The name still works for the current session.
    }
    return true;
  };

  const loadRanking = async (count: MineCount): Promise<void> => {
    const identity = identityRef.current;
    if (!identity) return;
    setRankingLoading(true);
    setRankingError(false);
    try {
      const response = await fetchRanking(identity, count);
      setRankingEntries(response.entries.map((entry) => ({
        rank: entry.rank,
        playerId: entry.playerId,
        name: entry.name,
        colorCount: entry.colorCount,
        timeMs: entry.timeMs,
        mineCount: entry.mineCount,
        isPlayer: entry.isPlayer
      })));
      setYourRank(response.yourRank);
    } catch {
      setRankingEntries([]);
      setYourRank(null);
      setRankingError(true);
    } finally {
      setRankingLoading(false);
    }
  };

  useEffect(() => {
    if (!rankingOpen) return;
    void loadRanking(rankingMineCount);
  }, [rankingOpen, rankingMineCount]);

  const submitScore = async (name: string = playerName): Promise<void> => {
    if (resultPhase !== "won" || !canSubmitResult(newBest) || submitState === "sending") return;
    const trimmed = name.trim();
    if (!trimmed) {
      openNameEditor("submit");
      return;
    }
    const identity = identityRef.current;
    const attempt = acceptedAttemptRef.current;
    const firstClick = firstClickRef.current;
    if (!identity || attempt === null || !firstClick) {
      setSubmitState("error");
      return;
    }

    const requestVersion = ++submitRequestVersionRef.current;
    allowAutoRankingRef.current = true;
    setSubmitState("sending");
    scoreSubmissionIdRef.current ??= makeSubmissionId();
    const payload: SubmitRecordRequest = {
      submissionId: scoreSubmissionIdRef.current,
      displayName: trimmed,
      mineCount,
      colorCount,
      timeMs: Math.round(elapsedMs),
      baseSeed,
      firstRow: firstClick.row,
      firstCol: firstClick.col,
      attempt,
      ruleVersion: RANKING_RULE_VERSION,
      appVersion: RANKING_APP_VERSION,
      actions: actionHistoryRef.current.map((action) => ({ ...action, elapsedMs: Math.round(action.elapsedMs) }))
    };

    try {
      const response = await submitOnlineRecord(identity, payload);
      if (submitRequestVersionRef.current !== requestVersion) return;
      if (!response.accepted || response.status !== "verified") throw new Error("record not accepted");
      savePlayerNameLocally(trimmed);
      setSubmittedRank(response.rank);
      setSubmitState("success");
      if (destinationAfterSuccessfulSubmit(newBest) === "ranking" && allowAutoRankingRef.current) {
        rankingRedirectTimerRef.current = window.setTimeout(() => {
          rankingRedirectTimerRef.current = null;
          if (!allowAutoRankingRef.current) return;
          setRankingOrigin("result");
          setRankingMineCount(mineCount);
          setRankingOpen(true);
        }, AUTO_RANKING_DELAY_MS);
      }
    } catch {
      if (submitRequestVersionRef.current === requestVersion) setSubmitState("error");
    }
  };

  const confirmName = async (): Promise<void> => {
    const trimmed = nameDraft.trim().slice(0, 16);
    if (!trimmed || nameSaving) return;
    if (namePurpose === "submit") {
      if (!savePlayerNameLocally(trimmed)) return;
      setNameEditorOpen(false);
      void submitScore(trimmed);
      return;
    }

    const identity = identityRef.current;
    if (!identity) {
      setNameError(true);
      return;
    }
    setNameSaving(true);
    setNameError(false);
    try {
      await updateOnlinePlayerName(identity, trimmed);
      savePlayerNameLocally(trimmed);
      setNameEditorOpen(false);
      if (rankingOpen) void loadRanking(rankingMineCount);
    } catch {
      setNameError(true);
    } finally {
      setNameSaving(false);
    }
  };

  const openRanking = (origin: RankingOrigin): void => {
    cancelAutoRanking();
    setRankingOrigin(origin);
    setRankingMineCount(mineCount);
    setRankingOpen(true);
  };

  const resultBestRecord = bestRecords[mineCount] ?? null;

  const statusText: Record<Phase, string> = {
    settings: copy.status.settings,
    "awaiting-first": copy.status.awaitingFirst,
    generating: showGenerating ? copy.status.generating : "",
    playing: paused ? copy.paused : copy.status.playing,
    won: copy.status.won,
    lost: copy.status.lost,
    error: copy.status.error
  };

  const flagsLabel = flagsRemainingLabel(language, flagsRemaining);

  if (rankingOpen) {
    return (
      <main className="app-shell app-shell-ranking">
        <section className={`game-panel ranking-screen language-${language}`} lang={language} aria-labelledby="ranking-title">
          <header className="ranking-header">
            <h1 id="ranking-title">{copy.ranking}</h1>
            <div className="language-toggle" aria-label={copy.language}>
              <button type="button" className={language === "ja" ? "selected" : ""} onClick={() => selectLanguage("ja")}>{buttonUiText(copy.japanese)}</button>
              <span aria-hidden="true">|</span>
              <button type="button" className={language === "en" ? "selected" : ""} onClick={() => selectLanguage("en")}>{buttonUiText("EN")}</button>
            </div>
          </header>

          <div className="ranking-tabs" role="group" aria-label={copy.rankingCategory}>
            {([15, 20, 25] as const).map((count) => (
              <button
                key={count}
                type="button"
                className={rankingMineCount === count ? "selected" : ""}
                onClick={() => setRankingMineCount(count)}
              >
                {buttonUiText(count)}<small>{buttonUiText("BOMBS")}</small>
              </button>
            ))}
          </div>

          <div className="player-card">
            <span><small>{copy.player}</small>{mixedUiText(playerName || copy.notSet)}</span>
            <span><small>{copy.yourRank}</small>{yourRank === null ? "--" : `#${yourRank}`}</span>
            <button type="button" onClick={() => openNameEditor("profile")}>{buttonUiText(playerName ? copy.changeName : copy.setName)}</button>
          </div>

          <div className="ranking-table-wrap">
            <table className="ranking-table">
              <thead><tr><th>{copy.rank}</th><th>{copy.name}</th><th>{copy.tableColors}</th><th>{copy.time}</th></tr></thead>
              <tbody>
                {rankingLoading ? (
                  <tr><td colSpan={4}>{copy.submitting}</td></tr>
                ) : rankingError ? (
                  <tr><td colSpan={4}>{rankingUnavailable}</td></tr>
                ) : rankingEntries.length === 0 ? (
                  <tr><td colSpan={4}>--</td></tr>
                ) : rankingEntries.slice(0, 10).map((entry) => (
                  <tr key={`${entry.playerId ?? entry.rank}-${entry.mineCount}`} className={entry.isPlayer ? "is-player" : ""}>
                    <td>#{entry.rank}</td><td>{mixedUiText(entry.name)}</td><td>{entry.colorCount}</td><td>{formatTime(entry.timeMs)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className={`ranking-actions${rankingOrigin === "settings" ? " ranking-actions-single" : ""}`}>
            {rankingOrigin === "result" ? (
              <>
                <button className="primary-button" type="button" onClick={() => setRankingOpen(false)}>
                  {buttonUiText(copy.result)}
                </button>
                <button className="secondary-button" type="button" onClick={resetToSettings}>
                  {buttonUiText(copy.menu)}
                </button>
              </>
            ) : (
              <button className="secondary-button" type="button" onClick={() => setRankingOpen(false)}>
                {buttonUiText(copy.back)}
              </button>
            )}
          </div>

          {nameEditorOpen ? (
            <div className="modal-layer modal-layer-solid">
              <div className="name-dialog" role="dialog" aria-modal="true" aria-labelledby="name-title">
                <h2 id="name-title">{playerName ? copy.changeName : copy.registerName}</h2>
                <input
                  autoFocus
                  value={nameDraft}
                  maxLength={16}
                  aria-label={copy.name}
                  onChange={(event) => setNameDraft(event.target.value)}
                  onKeyDown={(event) => { if (event.key === "Enter") void confirmName(); }}
                  placeholder={copy.playerNamePlaceholder}
                />
                {nameError ? <p className="submit-status error">{copy.submitFailed}</p> : null}
                <div className="dialog-actions">
                  <button className="primary-button" type="button" disabled={!nameDraft.trim() || nameSaving} onClick={() => void confirmName()}>{buttonUiText(copy.save)}</button>
                  <button className="secondary-button" type="button" disabled={nameSaving} onClick={() => setNameEditorOpen(false)}>{buttonUiText(copy.cancel)}</button>
                </div>
              </div>
            </div>
          ) : null}
        </section>
      </main>
    );
  }

  return (
    <main className={`app-shell app-shell-${gameplayLayout ? "gameplay" : "settings"}`}>
      <section
        className={`game-panel language-${language}`}
        lang={language}
        aria-labelledby={phase === "settings" ? "game-title" : undefined}
        aria-label={phase === "settings" ? undefined : "Multicolor Sweeper game"}
      >
        {phase === "settings" ? (
          <>
            <header className="game-header game-header-settings">
              <div>
                <p className="eyebrow">{copy.timeAttack}</p>
                <h1 id="game-title">MULTICOLOR SWEEPER</h1>
              </div>
              <div className="language-toggle" aria-label={copy.language}>
                <button type="button" className={language === "ja" ? "selected" : ""} onClick={() => selectLanguage("ja")}>{buttonUiText(copy.japanese)}</button>
                <span aria-hidden="true">|</span>
                <button type="button" className={language === "en" ? "selected" : ""} onClick={() => selectLanguage("en")}>{buttonUiText("EN")}</button>
              </div>
            </header>
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
                      {buttonUiText(difficultyLabel(language, difficulty.id))}
                      <small>{buttonUiText(bombCountLabel(language, difficulty.mineCount))}</small>
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
                      {buttonUiText(colorCountLabel(language, count as ColorCount))}
                    </button>
                  ))}
                </div>
              </fieldset>

              <div className="player-setting">
                <span><small>{copy.player}</small>{mixedUiText(playerName || copy.notSet)}</span>
                <button type="button" onClick={() => openNameEditor("profile")}>{buttonUiText(playerName ? copy.changeName : copy.setName)}</button>
              </div>

              <div className="settings-actions">
                <button className="start-button" type="button" onClick={() => enterBoard()}>{buttonUiText(copy.start)}</button>
                <button className="ranking-button" type="button" onClick={() => openRanking("settings")}>{buttonUiText(copy.ranking)}</button>
              </div>
            </div>
          </>
        ) : (
          <>
            <header className="hud-strip" aria-label={copy.gameInfo}>
              <span className="hud-metric"><small>{copy.time}</small><strong>{formatTime(elapsedMs)}</strong></span>
              <span
                className="hud-metric hud-flags"
                aria-label={flagsLabel}
                data-over={flagsRemaining < 0 ? "true" : undefined}
              >
                <small>{copy.flags}</small><strong>{flagsRemaining.toString().padStart(2, "0")}</strong>
              </span>
              {resultPhase !== null && resultPending ? (
                <span className="hud-action hud-action-pending" aria-hidden="true" />
              ) : resultPhase !== null && !resultOpen ? (
                <button ref={resultButtonRef} className="hud-action hud-action-result" type="button" onClick={() => setResultOpen(true)}>{buttonUiText(copy.result)}</button>
              ) : phase === "playing" ? (
                <button className="hud-action" type="button" onClick={pauseGame}>{buttonUiText(copy.pause)}</button>
              ) : (
                <button className="hud-action" type="button" onClick={resetToSettings} disabled={phase === "generating"}>{buttonUiText(copy.menu)}</button>
              )}
            </header>

            <div className="condition-line">
              <span>{selectedDifficulty ? difficultyLabel(language, selectedDifficulty.id) : ""}</span>
              <span>{mixedUiText(colorCountLabel(language, colorCount))}</span>
            </div>

            <div className="board-wrap">
              <GameBoard
                board={board}
                language={language}
                interactive={!paused && (phase === "awaiting-first" || phase === "playing")}
                review={(phase === "won" || phase === "lost") && !resultPending}
                awaitingFirst={phase === "awaiting-first"}
                masked={paused}
                openingEffects={openingEffects}
                cascadePulse={cascadePulse}
                outcomeEffect={outcomeEffect}
                onOpen={handleOpen}
                onFlag={handleFlag}
              />
              {phase === "generating" && showGenerating ? (
                <div className="generating-overlay" role="status">
                  <span className="spinner" />
                  <strong>{copy.generating}</strong>
                </div>
              ) : null}
            </div>

            <p
              className={`status status-${phase}${resultOpen ? " status-result-open" : ""}`}
              aria-live="polite"
            >
              <span>{mixedUiText(resultPending ? "" : statusText[phase])}</span>
            </p>

            <div
              className={`gesture-guide gesture-guide-${colorCount}${showGestureGuide && !paused ? "" : " gesture-guide-hidden"}`}
              aria-label={showGestureGuide && !paused ? copy.flagDirections : undefined}
              aria-hidden={!showGestureGuide || paused}
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

        {paused ? (
          <div className="modal-layer pause-layer">
            <div className="pause-dialog" role="dialog" aria-modal="true" aria-labelledby="pause-title">
              <h2 id="pause-title">{copy.paused}</h2>
              <div className="dialog-actions">
                <button className="primary-button" type="button" onClick={resumeGame}>{buttonUiText(copy.resume)}</button>
                <button className="secondary-button" type="button" onClick={resetToSettings}>{buttonUiText(copy.menu)}</button>
              </div>
            </div>
          </div>
        ) : null}

        {resultPhase !== null && resultOpen ? (
          <div className="modal-layer result-layer">
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
                <>
                  <p className="result-time"><small>{copy.clearTime}</small><strong>{formatTime(elapsedMs)}</strong></p>
                  {newBest ? <p className="best-badge">{copy.newBest}</p> : null}
                  {!newBest && resultBestRecord ? (
                    <p className="best-time"><small>{copy.bestTime}</small><strong>{formatTime(resultBestRecord.timeMs)}</strong></p>
                  ) : null}
                  {submitState === "sending" ? <p className="submit-status">{copy.submitting}</p> : null}
                  {submitState === "success" ? <p className="submit-status success">{mixedUiText(`${copy.submitted} · #${submittedRank ?? "--"}`)}</p> : null}
                  {submitState === "error" ? <p className="submit-status error">{copy.submitFailed}</p> : null}
                </>
              ) : null}
              {resultPhase === "error" ? <p className="result-error">{mixedUiText(errorMessage)}</p> : null}

              <div className="result-actions">
                <button className="primary-button" type="button" onClick={() => enterBoard()}>{buttonUiText(copy.retry)}</button>
                {resultPhase === "won" ? (
                  canSubmitResult(newBest) ? (
                    submitState === "success" ? (
                      <button className="secondary-button" type="button" onClick={() => openRanking("result")}>{buttonUiText(copy.ranking)}</button>
                    ) : (
                      <button
                        className="secondary-button"
                        type="button"
                        disabled={submitState === "sending"}
                        onClick={() => void submitScore()}
                      >
                        {buttonUiText(submitState === "error" ? copy.retrySubmit : copy.submitTime)}
                      </button>
                    )
                  ) : (
                    <button className="secondary-button" type="button" onClick={() => openRanking("result")}>{buttonUiText(copy.ranking)}</button>
                  )
                ) : null}
                {resultPhase !== "error" ? (
                  <div className="result-aux-actions">
                    <button type="button" onClick={closeResult}>{buttonUiText(copy.viewBoard)}</button>
                    <button type="button" onClick={resetToSettings}>{buttonUiText(copy.menu)}</button>
                  </div>
                ) : (
                  <button className="secondary-button" type="button" onClick={resetToSettings}>{buttonUiText(copy.menu)}</button>
                )}
              </div>
            </div>
          </div>
        ) : null}

        {nameEditorOpen ? (
          <div className="modal-layer modal-layer-solid">
            <div className="name-dialog" role="dialog" aria-modal="true" aria-labelledby="name-title">
              <h2 id="name-title">{playerName ? copy.changeName : copy.registerName}</h2>
              {namePurpose === "submit" ? <p>{copy.nameRequiredForSubmit}</p> : null}
              <input
                autoFocus
                value={nameDraft}
                maxLength={16}
                aria-label={copy.name}
                onChange={(event) => setNameDraft(event.target.value)}
                onKeyDown={(event) => { if (event.key === "Enter") void confirmName(); }}
                placeholder={copy.playerNamePlaceholder}
              />
              {nameError ? <p className="submit-status error">{copy.submitFailed}</p> : null}
              <div className="dialog-actions">
                <button className="primary-button" type="button" disabled={!nameDraft.trim() || nameSaving} onClick={() => void confirmName()}>
                  {buttonUiText(namePurpose === "submit" ? copy.submitTime : copy.save)}
                </button>
                <button className="secondary-button" type="button" disabled={nameSaving} onClick={() => setNameEditorOpen(false)}>{buttonUiText(copy.cancel)}</button>
              </div>
            </div>
          </div>
        ) : null}
      </section>
    </main>
  );
}
