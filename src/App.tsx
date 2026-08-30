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
  persistLanguage,
  readInitialLanguage,
  type Language
} from "./i18n";
import {
  bestRecordStorageKey,
  PLAYER_NAME_STORAGE_KEY,
  playerRank,
  rankingWithPlayer,
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

const SUBMITTED_RECORD_STORAGE_PREFIX = "multicolor-sweeper-submitted";

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

function submittedRecordStorageKey(mineCount: MineCount): string {
  return `${SUBMITTED_RECORD_STORAGE_PREFIX}-${mineCount}`;
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
  const [submittedRecords, setSubmittedRecords] = useState<Partial<Record<MineCount, LocalRecord>>>({});
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [submittedRank, setSubmittedRank] = useState<number | null>(null);
  const [playerName, setPlayerName] = useState("");
  const [nameEditorOpen, setNameEditorOpen] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [namePurpose, setNamePurpose] = useState<NamePurpose>("profile");
  const [rankingOpen, setRankingOpen] = useState(false);
  const [rankingOrigin, setRankingOrigin] = useState<RankingOrigin>("settings");
  const [rankingMineCount, setRankingMineCount] = useState<MineCount>(20);

  const clientRef = useRef<GeneratorClient | null>(null);
  const generationRequestRef = useRef(0);
  const resultDialogRef = useRef<HTMLDivElement | null>(null);
  const resultButtonRef = useRef<HTMLButtonElement | null>(null);

  const gameplayLayout = phase !== "settings";
  const resultPhase = isResultPhase(phase) ? phase : null;
  const showGestureGuide = phase === "awaiting-first" || phase === "generating" || phase === "playing";
  const copy = getCopy(language);

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
    document.documentElement.lang = language;
  }, [language]);

  useEffect(() => {
    try {
      setPlayerName(window.localStorage.getItem(PLAYER_NAME_STORAGE_KEY) ?? "");
    } catch {
      setPlayerName("");
    }
    const best: Partial<Record<MineCount, LocalRecord>> = {};
    const submitted: Partial<Record<MineCount, LocalRecord>> = {};
    for (const count of [15, 20, 25] as const) {
      const bestRecord = readStoredRecord(bestRecordStorageKey(count));
      const submittedRecord = readStoredRecord(submittedRecordStorageKey(count));
      if (bestRecord) best[count] = bestRecord;
      if (submittedRecord) submitted[count] = submittedRecord;
    }
    setBestRecords(best);
    setSubmittedRecords(submitted);
  }, []);

  useEffect(() => {
    setResultOpen(resultPhase !== null);
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

  const enterBoard = (nextMineCount: MineCount = mineCount, nextColorCount: ColorCount = colorCount): void => {
    generationRequestRef.current += 1;
    const seed = makeBaseSeed();
    setMineCount(nextMineCount);
    setColorCount(nextColorCount);
    setBaseSeed(seed);
    setBoard(createEmptyBoard(nextColorCount, nextMineCount, seed));
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
      if ("failed" in result) throw new Error("æ£ä»´C8àk¹æ›8àk¹æ§8à¤¹å'ù¢$9."ºfd9a¡xàjùænº)¢øàiøàcxào¸àføà¤øàiøàeøàgÈŠNÂˆÛÛœİÙ[™\˜]YHÛÛÜÛİ[OOHÈÈ™\İ[˜›Ø\™Èˆ™\İ[˜›Ø\™ÂˆYˆ
YÙ[™\˜]Y
H›İÈ™]È\œ›ÜŠ:"lùæé:gh8àc9å'ù¢$8àexà£8ào¸àføà¤øàiøàeøàgÈŠNÂˆ™]™X[Ù[
Ù[™\˜]Y›İËÛÛ
NÂˆÙ]›Ø\™
Ù[™\˜]Y
NÂˆ[\ÙY™Y›Ü™TÙYÛY[™Y‹˜İ\œ™[HÂˆÙ][\ÙY\Ê
NÂˆÙ]İ\Y]
\™›Ü›X[˜ÙK››İÊ
JNÂˆÙ]\ÙJœ^Z[™ÈŠNÂˆHØ]Ú
\œ›ÜŠHÂˆYˆ
Ù[™\˜][Û”™\]Y\İ™Y‹˜İ\œ™[OOH™\]Y\İY
H™]\›ÂˆÛÛœÛÛK™\œ›ÜŠ›Ø\™Ù[™\˜][Ûˆ˜Z[Y‹\œ›ÜŠNÂˆÙ]\œ›Ü“Y\ÜØYÙJÛÜK™\œ›ÜœË™Ù[™\˜][Û‘˜Z[Y
NÂˆÙ]\ÙJ™\œ›ÜˆŠNÂˆHš[˜[HÂˆÚ[™İË˜ÛX\•[Y[İ]
[™XØ]Ü•[Y\ŠNÂˆYˆ
Ù[™\˜][Û”™\]Y\İ™Y‹˜İ\œ™[OOH™\]Y\İY
HÙ]ÚİÑÙ[™\˜][™Ê˜[ÙJNÂˆBˆNÂ‚ˆÛÛœİ™XÛÜ™ØØ[™\İH
[YS\Îˆ[X™\ŠNˆ›ÚYOˆÂˆÛÛœİ™]š[İ\ÈH™\İ™XÛÜ™ÖÛZ[™PÛİ[NÂˆÛÛœİ\Ğ™\İH™]š[İ\ÈOOH[™Yš[™Y[YS\È™]š[İ\Ë[YS\ÎÂˆÙ]™]Ğ™\İ
\Ğ™\İ
NÂˆYˆ
Z\Ğ™\İ
H™]\›ÂˆÛÛœİ™XÛÜ™HÈ[YS\ËÛÛÜÛİ[NÂˆÙ]™\İ™XÛÜ™Ê
İ\œ™[
HOˆ
È‹‹˜İ\œ™[ÛZ[™PÛİ[Nˆ™XÛÜ™JJNÂˆHÂˆ\œÚ\İ™XÛÜ™
™\İ™XÛÜ™İÜ˜YÙRÙ^JZ[™PÛİ[
K™XÛÜ™
NÂˆHØ]ÚÂˆËÈH™\İ[İ[™[XZ[œÈš\ÚX›HÚ[ˆİÜ˜YÙH\È[˜]˜Z[X›K‚ˆBˆNÂ‚ˆÛÛœİš[š\ÚY\“[İ™HH
™^ˆ›Ø\™]Z[™Nˆ›ÛÛX[ŠNˆ›ÚYOˆÂˆÛÛœİš[˜[[\ÙYHİ\œ™[[\ÙY

NÂˆ[\ÙY™Y›Ü™TÙYÛY[™Y‹˜İ\œ™[Hš[˜[[\ÙYÂˆÙ][\ÙY\Êš[˜[[\ÙY
NÂˆÙ]İ\Y]
[
NÂˆÙ]›Ø\™
™^
NÂˆYˆ
]Z[™JHÂˆÙ]\ÙJ›ÜİŠNÂˆH[ÙHYˆ
ÚXÚÕÚ[Š™^
JHÂˆ™XÛÜ™ØØ[™\İ
š[˜[[\ÙY
NÂˆÙ]\ÙJÛÛˆŠNÂˆBˆNÂ‚ˆÛÛœİ[™SÜ[ˆH
›İÎˆ[X™\‹ÛÛˆ[X™\ŠNˆ›ÚYOˆÂˆYˆ
]\ÙY
H™]\›ÂˆYˆ
\ÙHOOH˜]ØZ][™ËYš\œİŠHÂˆ›ÚYÙ[™\˜]Qœ›ÛQš\œİÛXÚÊ›İËÛÛ
NÂˆ™]\›ÂˆBˆYˆ
\ÙHOOHœ^Z[™ÈŠH™]\›ÂˆÛÛœİ™^HÛÛ™P›Ø\™
›Ø\™
NÂˆÛÛœİÙ[H™^˜Ù[ÖÜ›İ×VØÛÛNÂˆÛÛœİ™\İ[HÙ[œİ]HOOHœ™]™X[Yˆ	‰ˆØ[ÚÜ™
™^›İËÛÛ
BˆÈÚÜ™Ù[
™^›İËÛÛ
Bˆˆ™]™X[Ù[
™^›İËÛÛ
NÂˆš[š\ÚY\“[İ™J™^™\İ[\HOOH›Z[™HŠNÂˆNÂ‚ˆÛÛœİ[™Q›YÈH
›İÎˆ[X™\‹ÛÛˆ[X™\‹›YÎˆ›YĞÛÛÜŠNˆ›ÚYOˆÂˆYˆ
\ÙHOOHœ^Z[™Èˆ]\ÙY
H™]\›ÂˆÛÛœİ™^HÛÛ™P›Ø\™
›Ø\™
NÂˆÙ]›YÊ™^›İËÛÛ›YÊNÂˆÙ]›Ø\™
™^
NÂˆNÂ‚ˆÛÛœİ™\Ù]ÔÙ][™ÜÈH

Nˆ›ÚYOˆÂˆÙ[™\˜][Û”™\]Y\İ™Y‹˜İ\œ™[
ÏHNÂˆÙ]\ÙJœÙ][™ÜÈŠNÂˆÙ]›Ø\™
Ü™X]Q[\P›Ø\™
ÛÛÜÛİ[Z[™PÛİ[
JNÂˆ[\ÙY™Y›Ü™TÙYÛY[™Y‹˜İ\œ™[HÂˆÙ]İ\Y]
[
NÂˆÙ][\ÙY\Ê
NÂˆÙ]]\ÙY
˜[ÙJNÂˆÙ]™\İ[Ü[Š˜[ÙJNÂˆÙ]˜[šÚ[™ÓÜ[Š˜[ÙJNÂˆÙ]İX›Z]İ]JšYHŠNÂˆNÂ‚ˆÛÛœİ]\ÙQØ[YHH

Nˆ›ÚYOˆÂˆYˆ
\ÙHOOHœ^Z[™Èˆ]\ÙY
H™]\›ÂˆÛÛœİ]\ÙY[\ÙYHİ\œ™[[\ÙY

NÂˆ[\ÙY™Y›Ü™TÙYÛY[™Y‹˜İ\œ™[H]\ÙY[\ÙYÂˆÙ][\ÙY\Ê]\ÙY[\ÙY
NÂˆÙ]İ\Y]
[
NÂˆÙ]]\ÙY
YJNÂˆNÂ‚ˆÛÛœİ™\İ[YQØ[YHH

Nˆ›ÚYOˆÂˆYˆ
\]\ÙY\ÙHOOHœ^Z[™ÈŠH™]\›ÂˆÙ]]\ÙY
˜[ÙJNÂˆÙ]İ\Y]
\™›Ü›X[˜ÙK››İÊ
JNÂˆNÂ‚ˆÛÛœİÛÜÙT™\İ[H

Nˆ›ÚYOˆÂˆYˆ
™\İ[\ÙHOOH™\œ›ÜˆŠH™]\›ÂˆÙ]™\İ[Ü[Š˜[ÙJNÂˆÚ[™İËœ™\]Y\İ[š[X][Û‘œ˜[YJ

HOˆ™\İ[]Û”™Y‹˜İ\œ™[Ë™›Øİ\Ê
JNÂˆNÂ‚ˆÛÛœİÜ[“˜[YQY]ÜˆH
\œÜÙNˆ˜[YT\œÜÙJNˆ›ÚYOˆÂˆÙ]˜[YT\œÜÙJ\œÜÙJNÂˆÙ]˜[YQ˜Y
^Y\“˜[YJNÂˆÙ]˜[YQY]Ü“Ü[ŠYJNÂˆNÂ‚ˆÛÛœİØ]™T^Y\“˜[YHH
˜[YNˆİš[™ÊNˆ›ÛÛX[ˆOˆÂˆÛÛœİš[[YYH˜[YKš[J
KœÛXÙJMŠNÂˆYˆ
]š[[YY
H™]\›ˆ˜[ÙNÂˆÙ]^Y\“˜[YJš[[YY
NÂˆHÂˆÚ[™İË›ØØ[İÜ˜YÙKœÙ]][JVQT—ÓSQWÔÕÔQÑWÒÑVKš[[YY
NÂˆHØ]ÚÂˆËÈH˜[YHİ[ÛÜšÜÈ›ÜˆHİ\œ™[Ù\ÜÚ[Û‹‚ˆBˆ™]\›ˆYNÂˆNÂ‚ˆÛÛœİİX›Z]ØÛÜ™HH
˜[YNˆİš[™ÈH^Y\“˜[YJNˆ›ÚYOˆÂˆYˆ
™\İ[\ÙHOOHÛÛˆˆİX›Z]İ]HOOHœÙ[™[™ÈŠH™]\›ÂˆÛÛœİš[[YYH˜[YKš[J
NÂˆYˆ
]š[[YY
HÂˆÜ[“˜[YQY]ÜŠœİX›Z]ŠNÂˆ™]\›ÂˆB‚ˆÙ]İX›Z]İ]JœÙ[™[™ÈŠNÂˆÚ[™İËœÙ][Y[İ]


HOˆÂˆHÂˆÛÛœİ™XÛÜ™HÈ[YS\Îˆ[\ÙY\ËÛÛÜÛİ[NÂˆÛÛœİİ\œ™[˜[šÚ[™ÈH˜[šÚ[™ÕÚ]^Y\ŠZ[™PÛİ[š[[YY™XÛÜ™˜ÛÛÜÛİ[™XÛÜ™[YS\ÊNÂˆÙ]İX›Z]Y˜[šÊ^Y\”˜[šÊİ\œ™[˜[šÚ[™ÊJNÂˆÛÛœİ™]š[İ\ÈHİX›Z]Y™XÛÜ™ÖÛZ[™PÛİ[NÂˆÛÛœİİX›Z]YH™]š[İ\ÈOOH[™Yš[™Y™XÛÜ™[YS\È™]š[İ\Ë[YS\ÈÈ™XÛÜ™ˆ™]š[İ\ÎÂˆÙ]İX›Z]Y™XÛÜ™Ê
İ\œ™[
HOˆ
È‹‹˜İ\œ™[ÛZ[™PÛİ[NˆİX›Z]YJJNÂˆ\œÚ\İ™XÛÜ™
İX›Z]Y™XÛÜ™İÜ˜YÙRÙ^JZ[™PÛİ[
KİX›Z]Y
NÂˆÙ]İX›Z]İ]JœİXØÙ\ÜÈŠNÂˆHØ]ÚÂˆÙ]İX›Z]İ]J™\œ›ÜˆŠNÂˆBˆKL
NÂˆNÂ‚ˆÛÛœİÛÛ™š\›S˜[YHH

Nˆ›ÚYOˆÂˆÛÛœİš[[YYH˜[YQ˜Yš[J
KœÛXÙJMŠNÂˆYˆ
]š[[YY
H™]\›ÂˆYˆ
\Ø]™T^Y\“˜[YJš[[YY
JH™]\›ÂˆÙ]˜[YQY]Ü“Ü[Š˜[ÙJNÂˆYˆ
˜[YT\œÜÙHOOHœİX›Z]ŠHİX›Z]ØÛÜ™Jš[[YY
NÂˆNÂ‚ˆÛÛœİÜ[”˜[šÚ[™ÈH
ÜšYÚ[ˆ˜[šÚ[™ÓÜšYÚ[ŠNˆ›ÚYOˆÂˆÙ]˜[šÚ[™ÓÜšYÚ[ŠÜšYÚ[ŠNÂˆÙ]˜[šÚ[™ÓZ[™PÛİ[
Z[™PÛİ[
NÂˆÙ]˜[šÚ[™ÓÜ[ŠYJNÂˆNÂ‚ˆÛÛœİ˜[šÚ[™Ô™XÛÜ™HİX›Z]Y™XÛÜ™ÖÜ˜[šÚ[™ÓZ[™PÛİ[HÏÈ[ÂˆÛÛœİ˜[šÚ[™Ñ[šY\Îˆ˜[šÚ[™Ñ[V×HH˜[šÚ[™ÕÚ]^Y\Šˆ˜[šÚ[™ÓZ[™PÛİ[ˆ^Y\“˜[YKˆ˜[šÚ[™Ô™XÛÜ™Ë˜ÛÛÜÛİ[ÏÈÛÛÜÛİ[ˆ˜[šÚ[™Ô™XÛÜ™Ë[YS\ÈÏÈ[ˆ
NÂˆÛÛœİ[İ\”˜[šÈH^Y\”˜[šÊ˜[šÚ[™Ñ[šY\ÊNÂ‚ˆÛÛœİÚ[™ÙS[™İXYÙHH
™^[™İXYÙNˆ[™İXYÙJNˆ›ÚYOˆÂˆÙ][™İXYÙJ™^[™İXYÙJNÂˆ\œÚ\İ[™İXYÙJ™^[™İXYÙJNÂˆNÂ‚ˆÛÛœİ[™İXYÙUÙÙÛHH
ˆ]ˆÛ\ÜÓ˜[YOH›[™İXYÙK]ÙÙÛHˆ›ÛOH™Ü›İ\ˆ\šXK[X™[^ØÛÜK›[™İXYÙ_O‚ˆ]Û‚ˆ\OH˜]Ûˆ‚ˆÛ\ÜÓ˜[YO^Û[™İXYÙHOOHš˜HˆÈœÙ[XİYˆˆˆŸBˆ\šXK\™\ÜÙY^Û[™İXYÙHOOHš˜HŸBˆÛÛXÚÏ^Ê
HOˆÚ[™ÙS[™İXYÙJš˜HŠ_Bˆ‚ˆ9¥éy§+:*§‚ˆØ]Û‚ˆ]Û‚ˆ\OH˜]Ûˆ‚ˆÛ\ÜÓ˜[YO^Û[™İXYÙHOOH™[ˆˆÈœÙ[XİYˆˆˆŸBˆ\šXK\™\ÜÙY^Û[™İXYÙHOOH™[ˆŸBˆÛÛXÚÏ^Ê
HOˆÚ[™ÙS[™İXYÙJ™[ˆŠ_Bˆ‚ˆS‚ˆØ]Û‚ˆÙ]‚ˆ
NÂ‚ˆÛÛœİİ]\Õ^ˆ™XÛÜ™\ÙKİš[™ÏˆHÂˆÙ][™ÜÎˆÛÜKœİ]\ËœÙ][™ÜËˆ˜]ØZ][™ËYš\œİˆÛÜKœİ]\Ë˜]ØZ][™Ñš\œİˆÙ[™\˜][™ÎˆÚİÑÙ[™\˜][™ÈÈÛÜKœİ]\Ë™Ù[™\˜][™Èˆˆ‹ˆ^Z[™Îˆ]\ÙYÈÛÜKœ]\ÙYˆÛÜKœİ]\Ëœ^Z[™ËˆÛÛˆÛÜKœİ]\ËÛÛ‹ˆÜİˆÛÜKœİ]\Ë›Üİˆ\œ›ÜˆÛÜKœİ]\Ë™\œ›Ü‚ˆNÂˆÛÛœİ›YÜÓX™[H›YÜÔ™[XZ[š[™ÓX™[
[™İXYÙK›YÜÔ™[XZ[š[™ÊNÂ‚ˆYˆ
˜[šÚ[™ÓÜ[ŠHÂˆ™]\›ˆ
ˆXZ[ˆÛ\ÜÓ˜[YOH˜\\Ú[\\Ú[\˜[šÚ[™È‚ˆÙXİ[ÛˆÛ\ÜÓ˜[YOH™Ø[YK\[™[˜[šÚ[™Ë\ØÜ™Y[ˆˆ\šXK[X™[YOHœ˜[šÚ[™Ë]]H‚ˆXY\ˆÛ\ÜÓ˜[YOHœ˜[šÚ[™ËZXY\ˆ‚ˆ]‚ˆHYHœ˜[šÚ[™Ë]]HØÛÜKœ˜[šÚ[™ßOÚO‚ˆÙ]‚ˆ]ˆÛ\ÜÓ˜[YOHœ˜[šÚ[™ËZXY\‹XXİ[ÛœÈÛ[™İXYÙUÙÙÛ_O]ÛˆÛ\ÜÓ˜[YOH˜ÛÛ\XİX]Ûˆˆ\OH˜]ÛˆˆÛÛXÚÏ^Ê
HOˆÙ]˜[šÚ[™ÓÜ[Š˜[ÙJ_OØÛÜK˜˜XÚßOØ]ÛÙ]‚ˆÚXY\‚‚ˆ]ˆÛ\ÜÓ˜[YOHœ˜[šÚ[™Ë]XœÈˆ\šXK[X™[H”˜[šÚ[™ÈØ]YÛÜH‚ˆÊÌMKŒWH\ÈÛÛœİ
K›X\

Ûİ[
HOˆ
ˆ]Û‚ˆÙ^O^ØÛİ[Bˆ\OH˜]Ûˆ‚ˆÛ\ÜÓ˜[YO^Ü˜[šÚ[™ÓZ[™PÛİ[OOHÛİ[ÈœÙ[XİYˆˆˆŸBˆÛÛXÚÏ^Ê
HOˆÙ]˜[šÚ[™ÓZ[™PÛİ[
Ûİ[
_Bˆ‚ˆØÛİ[OÛX[Û[™İXYÙHOOHš˜HˆÈ¹â!¹o/ˆˆˆ“ÓP”ÈŸOÜÛX[‚ˆØ]Û‚ˆ
J_BˆÙ]‚‚ˆ]ˆÛ\ÜÓ˜[YOHœ^Y\‹XØ\™‚ˆÜ[ÛX[ØÛÜKœ^Y\ŸOÜÛX[Ü^Y\“˜[YHÛÜK››İÙ]OÜÜ[‚ˆÜ[ÛX[ØÛÜK[İ\”˜[šßOÜÛX[Ş[İ\”˜[šÈOOH[È‹KHˆˆÉŞ[İ\”˜[šßXOÜÜ[‚ˆ]Ûˆ\OH˜]ÛˆˆÛÛXÚÏ^Ê
HOˆÜ[“˜[YQY]ÜŠœ›Ùš[HŠ_OÜ^Y\“˜[YHÈÛÜK˜Ú[™ÙS˜[YHˆÛÜKœÙ]˜[Y_OØ]Û‚ˆÙ]‚‚ˆ]ˆÛ\ÜÓ˜[YOHœ˜[šÚ[™Ë]X›K]Ü˜\‚ˆX›HÛ\ÜÓ˜[YOHœ˜[šÚ[™Ë]X›H‚ˆXYØÛÜKœ˜[šßOİØÛÜK›˜[Y_OİØÛÜK˜ÛÛÜÛÛ[[ŸOİØÛÜK[Y_OİİİXY‚ˆ›ÙO‚ˆÜ˜[šÚ[™Ñ[šY\ËœÛXÙJL
K›X\

[JHOˆ
ˆˆÙ^O^Ø	Ù[Kœ˜[šßKIÙ[K›˜[Y_KIÙ[K˜ÛÛÜÛİ[XHÛ\ÜÓ˜[YO^Ù[Kš\Ô^Y\ˆÈš\Ë\^Y\ˆˆˆˆŸO‚ˆˆŞÙ[Kœ˜[šßOİÙ[K›˜[Y_OİÙ[K˜ÛÛÜÛİ[OİÙ›Ü›X][YJ[K[YS\Ê_Oİ‚ˆİ‚ˆ
J_Bˆİ›ÙO‚ˆİX›O‚ˆÙ]‚‚ˆ]ˆÛ\ÜÓ˜[YOHœ˜[šÚ[™ËXXİ[ÛœÈ‚ˆ]Û‚ˆÛ\ÜÓ˜[YOHœš[X\KX]Ûˆ‚ˆ\OH˜]Ûˆ‚ˆÛÛXÚÏ^Ê
HOˆ[\›Ø\™
˜[šÚ[™ÓZ[™PÛİ[ÛÛÜÛİ[
_Bˆ‚ˆÛ[™İXYÙHOOHš˜HˆÈ9â!¹o/‰Ü˜[šÚ[™ÓZ[™PÛİ[y`"øàiÔVXˆ	ØÛÜKœ^_H	Ü˜[šÚ[™ÓZ[™PÛİ[H“ÓP”ØBˆØ]Û‚ˆ]ÛˆÛ\ÜÓ˜[YOHœÙXÛÛ™\KX]Ûˆˆ\OH˜]ÛˆˆÛÛXÚÏ^Ê
HOˆÙ]˜[šÚ[™ÓÜ[Š˜[ÙJ_O‚ˆÜ˜[šÚ[™ÓÜšYÚ[ˆOOHœ™\İ[ˆÈÛÜK˜˜XÚÕÔ™\İ[ˆÛÜK˜˜XÚßBˆØ]Û‚ˆÙ]‚‚ˆÛ˜[YQY]Ü“Ü[ˆÈ
ˆ]ˆÛ\ÜÓ˜[YOH›[Ù[[^Y\ˆ[Ù[[^Y\‹\ÛÛY‚ˆ]ˆÛ\ÜÓ˜[YOH›˜[YKYX[ÙÈˆ›ÛOH™X[ÙÈˆ\šXK[[Ù[HYHˆ\šXK[X™[YOH›˜[YK]]H‚ˆˆYH›˜[YK]]HÜ^Y\“˜[YHÈÛÜK˜Ú[™ÙS˜[YHˆÛÜKœ™YÚ\İ\“˜[Y_OÚ‚ˆØÛÜK›˜[YSÛ›Q›Ü”İX›Z]OÜ‚ˆ[œ]ˆ]]Ñ›Øİ\Âˆ˜[YO^Û˜[YQ˜YBˆX^[™İ^ÌMŸBˆ\šXK[X™[^ØÛÜKœ^Y\“˜[YSX™[BˆÛÚ[™ÙO^Ê]™[
HOˆÙ]˜[YQ˜Y
]™[\™Ù]˜[YJ_BˆÛ’Ù^QİÛ^Ê]™[
HOˆÈYˆ
]™[šÙ^HOOH‘[\ˆŠHÛÛ™š\›S˜[YJ
NÈ_BˆXÙZÛ\^ØÛÜKœ^Y\“˜[YTXÙZÛ\ŸBˆÏ‚ˆ]ˆÛ\ÜÓ˜[YOH™X[ÙËXXİ[ÛœÈ‚ˆ]ÛˆÛ\ÜÓ˜[YOHœš[X\KX]Ûˆˆ\OH˜]Ûˆˆ\ØX›Y^È[˜[YQ˜Yš[J
_HÛÛXÚÏ^ØÛÛ™š\›S˜[Y_OØÛÜKœØ]™S˜[Y_OØ]Û‚ˆ]ÛˆÛ\ÜÓ˜[YOHœÙXÛÛ™\KX]Ûˆˆ\OH˜]ÛˆˆÛÛXÚÏ^Ê
HOˆÙ]˜[YQY]Ü“Ü[Š˜[ÙJ_OØÛÜK˜Ø[˜Ù[OØ]Û‚ˆÙ]‚ˆÙ]‚ˆÙ]‚ˆ
Hˆ[BˆÜÙXİ[Û‚ˆÛXZ[‚ˆ
NÂˆB‚ˆ™]\›ˆ
ˆXZ[ˆÛ\ÜÓ˜[YO^Ø\\Ú[\\Ú[IÙØ[Y\^S^[İ]È™Ø[Y\^HˆˆœÙ][™ÜÈŸXO‚ˆÙXİ[Û‚ˆÛ\ÜÓ˜[YOH™Ø[YK\[™[‚ˆ\šXK[X™[YO^Ü\ÙHOOHœÙ][™ÜÈˆÈ™Ø[YK]]Hˆˆ[™Yš[™YBˆ\šXK[X™[^Ü\ÙHOOHœÙ][™ÜÈˆÈ[™Yš[™Yˆ“][XÛÛÜˆİÙY\\ˆØ[YHŸBˆ‚ˆÜ\ÙHOOHœÙ][™ÜÈˆÈ
ˆ‚ˆXY\ˆÛ\ÜÓ˜[YOH™Ø[YKZXY\ˆØ[YKZXY\‹\Ù][™ÜÈ‚ˆ]‚ˆÛ\ÜÓ˜[YOH™^YXœ›İÈØÛÜK[YP]XÚßOÜ‚ˆHYH™Ø[YK]]H“USPÓÓÔˆÕÑQTTÚO‚ˆÙ]‚ˆÛ[™İXYÙUÙÙÛ_BˆÚXY\‚ˆ]ˆÛ\ÜÓ˜[YOHœÙ][™ÜÈ‚ˆšY[Ù]‚ˆYÙ[™ØÛÜK™Y™šXİ[_OÛYÙ[™‚ˆ]ˆÛ\ÜÓ˜[YOH˜ÚÚXÙK\›İÈ‚ˆÑQ‘’PÕSQTË›X\

Y™šXİ[JHOˆ
ˆ]Û‚ˆÙ^O^ÙY™šXİ[KšYBˆ\OH˜]Ûˆ‚ˆÛ\ÜÓ˜[YO^ÛZ[™PÛİ[OOHY™šXİ[K›Z[™PÛİ[ÈœÙ[XİYˆˆˆŸBˆÛÛXÚÏ^Ê
HOˆÙ]Z[™PÛİ[
Y™šXİ[K›Z[™PÛİ[
_Bˆ‚ˆÙY™šXİ[SX™[
[™İXYÙKY™šXİ[KšY
_BˆÛX[Ø›ÛXÛİ[X™[
[™İXYÙKY™šXİ[K›Z[™PÛİ[
_OÜÛX[‚ˆØ]Û‚ˆ
J_BˆÙ]‚ˆÙšY[Ù]‚ˆšY[Ù]‚ˆYÙ[™ØÛÜK˜ÛÛÜœßOÛYÙ[™‚ˆ]ˆÛ\ÜÓ˜[YOH˜ÚÚXÙK\›İÈÛÛÜœËXÚÚXÙH‚ˆÖÌËK›X\

Ûİ[
HOˆ
ˆ]Û‚ˆÙ^O^ØÛİ[Bˆ\OH˜]Ûˆ‚ˆÛ\ÜÓ˜[YO^ØÛÛÜÛİ[OOHÛİ[ÈœÙ[XİYˆˆˆŸBˆÛÛXÚÏ^Ê
HOˆÙ]ÛÛÜÛİ[
Ûİ[\ÈÛÛÜÛİ[
_Bˆ‚ˆØÛÛÜÛİ[X™[
[™İXYÙKÛİ[\ÈÛÛÜÛİ[
_BˆØ]Û‚ˆ
J_BˆÙ]‚ˆÙšY[Ù]‚‚ˆ]ˆÛ\ÜÓ˜[YOHœ^Y\‹\Ù][™È‚ˆÜ[ÛX[ØÛÜKœ^Y\ŸOÜÛX[Ü^Y\“˜[YHÛÜK››İÙ]OÜÜ[‚ˆ]Ûˆ\OH˜]ÛˆˆÛÛXÚÏ^Ê
HOˆÜ[“˜[YQY]ÜŠœ›Ùš[HŠ_OÜ^Y\“˜[YHÈÛÜK˜Ú[™ÙS˜[YHˆÛÜKœÙ]˜[Y_OØ]Û‚ˆÙ]‚‚ˆ]ˆÛ\ÜÓ˜[YOHœÙ][™ÜËXXİ[ÛœÈ‚ˆ]ÛˆÛ\ÜÓ˜[YOHœİ\X]Ûˆˆ\OH˜]ÛˆˆÛÛXÚÏ^Ê
HOˆ[\›Ø\™

_OØÛÜKœİ\OØ]Û‚ˆ]ÛˆÛ\ÜÓ˜[YOHœ˜[šÚ[™ËX]Ûˆˆ\OH˜]ÛˆˆÛÛXÚÏ^Ê
HOˆÜ[”˜[šÚ[™ÊœÙ][™ÜÈŠ_OØÛÜKœ˜[šÚ[™ßOØ]Û‚ˆÙ]‚ˆÙ]‚ˆÏ‚ˆ
Hˆ
ˆ‚ˆXY\ˆÛ\ÜÓ˜[YOHšY\İš\ˆ\šXK[X™[^ØÛÜK™Ø[YR[™›ßO‚ˆÜ[ˆÛ\ÜÓ˜[YOHšY[Y]šXÈÛX[ØÛÜK[Y_OÜÛX[İ›Û™ÏÙ›Ü›X][YJ[\ÙY\Ê_OÜİ›Û™ÏÜÜ[‚ˆÜ[‚ˆÛ\ÜÓ˜[YOHšY[Y]šXÈYY›YÜÈ‚ˆ\šXK[X™[^Ù›YÜÓX™[Bˆ]K[İ™\^Ù›YÜÔ™[XZ[š[™ÈÈYHˆˆ[™Yš[™YBˆ‚ˆÛX[ØÛÜK™›YÜßOÜÛX[İ›Û™ÏÙ›YÜÔ™[XZ[š[™ËÔİš[™Ê
KœYİ\
‹ŒŠ_OÜİ›Û™Ï‚ˆÜÜ[‚ˆÜ\ÙHOOHœ^Z[™ÈˆÈ
ˆ]ÛˆÛ\ÜÓ˜[YOHšYXXİ[Ûˆˆ\OH˜]ÛˆˆÛÛXÚÏ^Ü]\ÙQØ[Y_OØÛÜKœ]\Ù_OØ]Û‚ˆ
Hˆ
ˆ]ÛˆÛ\ÜÓ˜[YOHšYXXİ[Ûˆˆ\OH˜]ÛˆˆÛÛXÚÏ^Ü™\Ù]ÔÙ][™ÜßH\ØX›Y^Ü\ÙHOOH™Ù[™\˜][™ÈŸOØÛÜK›Y[_OØ]Û‚ˆ
_BˆÚXY\‚‚ˆ]ˆÛ\ÜÓ˜[YOH˜ÛÛ™][Û‹[[™H‚ˆÜ[ÜÙ[XİYY™šXİ[HÈY™šXİ[SX™[
[™İXYÙKÙ[XİYY™šXİ[KšY
HˆˆŸOÜÜ[‚ˆÜ[ØÛÛÜÛİ[X™[
[™İXYÙKÛÛÜÛİ[
_OÜÜ[‚ˆÙ]‚‚ˆ]ˆÛ\ÜÓ˜[YOH˜›Ø\™]Ü˜\‚ˆØ[YP›Ø\™ˆ›Ø\™^Ø›Ø\™Bˆ[™İXYÙO^Û[™İXYÙ_Bˆ[\˜Xİ]™O^È\]\ÙY	‰ˆ
\ÙHOOH˜]ØZ][™ËYš\œİˆ\ÙHOOHœ^Z[™ÈŠ_Bˆ™]šY]Ï^Ü\ÙHOOHÛÛˆˆ\ÙHOOH›ÜİŸBˆ]ØZ][™Ñš\œİ^Ü\ÙHOOH˜]ØZ][™ËYš\œİŸBˆX\ÚÙY^Ü]\ÙYBˆÛ“Ü[^Ú[™SÜ[ŸBˆÛ‘›YÏ^Ú[™Q›YßBˆÏ‚ˆÜ\ÙHOOH™Ù[™\˜][™Èˆ	‰ˆÚİÑÙ[™\˜][™ÈÈ
ˆ]ˆÛ\ÜÓ˜[YOH™Ù[™\˜][™Ë[İ™\›^Hˆ›ÛOHœİ]\È‚ˆÜ[ˆÛ\ÜÓ˜[YOHœÜ[›™\ˆˆÏ‚ˆİ›Û™ÏØÛÜK™Ù[™\˜][™ßOÜİ›Û™Ï‚ˆÙ]‚ˆ
Hˆ[BˆÙ]‚‚ˆÜ™\İ[\ÙHOOH[	‰ˆ\™\İ[Ü[ˆÈ
ˆ]ˆÛ\ÜÓ˜[YOHœÜİ\™\İ[X˜\ˆ‚ˆ]Ûˆ™Y^Ü™\İ[]Û”™YŸHÛ\ÜÓ˜[YOHœ™\İ[\™[Ü[ˆˆ\OH˜]ÛˆˆÛÛXÚÏ^Ê
HOˆÙ]™\İ[Ü[ŠYJ_OØÛÜKœ™\İ[OØ]Û‚ˆÙ]‚ˆ
Hˆ[B‚ˆˆÛ\ÜÓ˜[YO^Øİ]\Èİ]\ËIÜ\Ù_IÜ™\İ[Ü[ˆÈˆİ]\Ë\™\İ[[Ü[ˆˆˆˆŸXBˆ\šXK[]™OHœÛ]H‚ˆ‚ˆÜ[Üİ]\Õ^Ü\ÙW_OÜÜ[‚ˆÜ‚‚ˆ]‚ˆÛ\ÜÓ˜[YO^ØÙ\İ\™KYİZYHÙ\İ\™KYİZYKIØÛÛÜÛİ[IÜÚİÑÙ\İ\™QİZYH	‰ˆ\]\ÙYÈˆˆˆˆÙ\İ\™KYİZYKZY[ˆŸXBˆ\šXK[X™[^ÜÚİÑÙ\İ\™QİZYH	‰ˆ\]\ÙYÈÛÜK™›YÑ\™Xİ[ÛœÈˆ[™Yš[™YBˆ\šXKZY[^È\ÚİÑÙ\İ\™QİZYH]\ÙYBˆ‚ˆÑ“Q×ÑÑTÕT‘TÖØÛÛÜÛİ[K›X\

Ù\İ\™JHOˆ
ˆÜ[ˆÙ^O^Ôİš[™ÊÙ\İ\™K™›YÊ_O‚ˆÙ\İ\™P\œ›İÈ[™ÛO^ÙÙ\İ\™K˜[™Û_HÛÛÜ^Ù›YĞÛÛÜ’^
Ù\İ\™K™›YÊ_HÏ‚ˆÙ›YÓX™[
[™İXYÙKÙ\İ\™K™›YÊ_BˆÜÜ[‚ˆ
J_BˆÙ]‚ˆÏ‚ˆ
_B‚ˆÜ]\ÙYÈ
ˆ]ˆÛ\ÜÓ˜[YOH›[Ù[[^Y\ˆ]\ÙK[^Y\ˆ‚ˆ]ˆÛ\ÜÓ˜[YOHœ]\ÙKYX[ÙÈˆ›ÛOH™X[ÙÈˆ\šXK[[Ù[HYHˆ\šXK[X™[YOHœ]\ÙK]]H‚ˆÛ\ÜÓ˜[YOH™^YXœ›İÈØÛÜK[Y\”İÜYOÜ‚ˆˆYHœ]\ÙK]]HØÛÜKœ]\ÙYOÚ‚ˆØÛÜK˜›Ø\™Y[•Ú[T]\ÙYOÜ‚ˆ]ˆÛ\ÜÓ˜[YOH™X[ÙËXXİ[ÛœÈ‚ˆ]ÛˆÛ\ÜÓ˜[YOHœš[X\KX]Ûˆˆ\OH˜]ÛˆˆÛÛXÚÏ^Ü™\İ[YQØ[Y_OØÛÜKœ™\İ[Y_OØ]Û‚ˆ]ÛˆÛ\ÜÓ˜[YOHœÙXÛÛ™\KX]Ûˆˆ\OH˜]ÛˆˆÛÛXÚÏ^Ü™\Ù]ÔÙ][™ÜßOØÛÜK›Y[_OØ]Û‚ˆÙ]‚ˆÙ]‚ˆÙ]‚ˆ
Hˆ[B‚ˆÜ™\İ[\ÙHOOH[	‰ˆ™\İ[Ü[ˆÈ
ˆ]ˆÛ\ÜÓ˜[YOH›[Ù[[^Y\ˆ™\İ[[^Y\ˆ‚ˆ]ˆ™Y^Ü™\İ[X[ÙÔ™YŸHÛ\ÜÓ˜[YO^Ø™\İ[YX[ÙÈ™\İ[YX[ÙËIÜ™\İ[\Ù_XH›ÛOH™X[ÙÈˆ\šXK[[Ù[HYHˆ\šXK[X™[YOHœ™\İ[]]HˆX’[™^^ËL_HÛ’Ù^QİÛ^Ê]™[
HOˆÈYˆ
]™[šÙ^HOOH‘\ØØ\Hˆ	‰ˆ™\İ[\ÙHOOH™\œ›ÜˆŠHÛÜÙT™\İ[

NÈ_O‚ˆˆYHœ™\İ[]]HÜ™\İ[\ÙHOOHÛÛˆˆÈÛÜK˜ÛX\ˆˆ™\İ[\ÙHOOH›ÜİˆÈÛÜK™Ø[YSİ™\ˆˆÛÜK™\œ›ÜŸOÚ‚ˆÜ™\İ[\ÙHOOHÛÛˆˆÈ
ˆ‚ˆÛ\ÜÓ˜[YOHœ™\İ[][YHÛX[ØÛÜK˜ÛX\•[Y_OÜÛX[İ›Û™ÏÙ›Ü›X][YJ[\ÙY\Ê_OÜİ›Û™ÏÜ‚ˆÛ™]Ğ™\İÈÛ\ÜÓ˜[YOH˜™\İX˜YÙHØÛÜK›™]Ğ™\İOÜˆˆ[BˆÜİX›Z]İ]HOOHœÙ[™[™ÈˆÈÛ\ÜÓ˜[YOHœİX›Z]\İ]\ÈØÛÜKœİX›Z][™ßOÜˆˆ[BˆÜİX›Z]İ]HOOHœİXØÙ\ÜÈˆÈÛ\ÜÓ˜[YOHœİX›Z]\İ]\ÈİXØÙ\ÜÈØÛÜKœİX›Z]YH0­ÈŞÜİX›Z]Y˜[šÈÏÈ‹KHŸOÜˆˆ[BˆÜİX›Z]İ]HOOH™\œ›ÜˆˆÈÛ\ÜÓ˜[YOHœİX›Z]\İ]\È\œ›ÜˆØÛÜKœİX›Z]˜Z[YOÜˆˆ[BˆÏ‚ˆ
Hˆ[BˆÜ™\İ[\ÙHOOH™\œ›ÜˆˆÈÛ\ÜÓ˜[YOHœ™\İ[Y\œ›ÜˆÙ\œ›Ü“Y\ÜØYÙ_OÜˆˆ[Bˆ]ˆÛ\ÜÓ˜[YOHœ™\İ[XXİ[ÛœÈ‚ˆ]ÛˆÛ\ÜÓ˜[YOHœš[X\KX]Ûˆˆ\OH˜]ÛˆˆÛÛXÚÏ^Ê
HOˆ[\›Ø\™

_OØÛÜKœ™]_OØ]Û‚ˆÜ™\İ[\ÙHOOHÛÛˆˆÈ
ˆİX›Z]İ]HOOHœİXØÙ\ÜÈˆÈ
ˆ]ÛˆÛ\ÜÓ˜[YOHœÙXÛÛ™\KX]Ûˆˆ\OH˜]ÛˆˆÛÛXÚÏ^Ê
HOˆÜ[”˜[šÚ[™Êœ™\İ[Š_OØÛÜKœ˜[šÚ[™ßOØ]Û‚ˆ
Hˆ
ˆ]ÛˆÛ\ÜÓ˜[YOHœÙXÛÛ™\KX]Ûˆˆ\OH˜]Ûˆˆ\ØX›Y^ÜİX›Z]İ]HOOHœÙ[™[™ÈŸHÛÛXÚÏ^Ê
HOˆİX›Z]ØÛÜ™J
_OÜİX›Z]İ]HOOH™\œ›ÜˆˆÈÛÜKPYØZ[ˆˆÛÜKœİX›Z][Y_OØ]Û‚ˆ
Bˆ
Hˆ[BˆÜ™\İ[\ÙHOOH™\œ›ÜˆˆÈ
ˆ]ˆÛ\ÜÓ˜[YOHœ™\İ[X]^XXİ[ÛœÈ‚ˆ]Ûˆ\OH˜]ÛˆˆÛÛXÚÏ^ØÛÜÙT™\İ[OØÛÜKšY]Ğ›Ø\™OØ]Û‚ˆ]Ûˆ\OH˜]ÛˆˆÛÛXÚÏ^Ü™\Ù]Ù][™ÜßOØÛÜK›Y[_OØ]Û‚ˆÙ]‚ˆ
Hˆ
ˆ]ÛˆÛ\ÜÓ˜[YOHœÙXÛÛ™\KX]Ûˆˆ\OH˜]ÛˆˆÛÛXÚÏ^Ü™\Ù]ÔÙ][™ÜßOØÛÜK›Y[_OØ]Û‚ˆ
_BˆÙ]‚ˆÙ]‚ˆÙ]‚ˆ
Hˆ[B‚ˆÛ˜[YQY]Ü“Ü[ˆÈ
ˆ]ˆÛ\ÜÓ˜[YOH›[Ù[[^Y\ˆ[Ù[[^Y\‹\ÛÛY‚ˆ]ˆÛ\ÜÓ˜[YOH›˜[YKYX[ÙÈˆ›ÛOH™X[ÙÈˆ\šXK[[Ù[HYHˆ\šXK[X™[YOH›˜[YK]]H‚ˆˆYH›˜[YK]]HÜ^Y\“˜[YHÈÛÜK˜Ú[™ÙS˜[YHˆÛÜKœ™YÚ\İ\“˜[Y_OÚ‚ˆÛ˜[YT\œÜÙHOOHœİX›Z]ˆÈÛÜK›˜[YS™YYY›Ü”İX›Z]ˆÛÜK›˜[YSÜ[Û˜[OÜ‚ˆ[œ]]]Ñ›Øİ\È˜[YO^Û˜[YQ˜YHX^[™İ^ÌMŸH\šXK[X™[^ØÛÜKœ^Y\“˜[YSX™[HÛÚ[™ÙO^Ê]™[
HOˆÙ]˜[YQ˜Y
]™[\™Ù]˜[YJ_HÛ’Ù^QİÛ^Ê]™[
HOˆÈYˆ
]™[šÙ^HOOH‘[\ˆŠHÛÛ™š\›S˜[YJ
NÈ_HXÙZÛ\^ØÛÜKœ^Y\“˜[YTXÙZÛ\ŸHÏ‚ˆ]ˆÛ\ÜÓ˜[YOH™X[ÙËXXİ[ÛœÈ‚ˆ]ÛˆÛ\ÜÓ˜[YOHœš[X\KX]Ûˆˆ\OH˜]Ûˆˆ\ØX›Y^È[˜[YQ˜Yš[J
_HÛÛXÚÏ^ØÛÛ™š\›S˜[Y_OÛ˜[YT\œÜÙHOOHœİX›Z]ˆÈÛÜKœİX›Z][YHˆÛÜKœØ]™S˜[Y_OØ]Û‚ˆ]ÛˆÛ\ÜÓ˜[YOHœÙXÛÛ™\KX]Ûˆˆ\OH˜]ÛˆˆÛÛXÚÏ^Ê
HOˆÙ]˜[YQY]Ü“Ü[Š˜[ÙJ_OØÛÜK˜Ø[˜Ù[OØ]Û‚ˆÙ]‚ˆÙ]‚ˆÙ]‚ˆ
Hˆ[BˆÜÙXİ[Û‚ˆÛXZ[‚ˆ
NÂŸB