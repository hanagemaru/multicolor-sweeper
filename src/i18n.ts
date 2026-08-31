import type { ColorCount, FlagColor, MineColor, MineCount } from "./game/types";

export type Language = "ja" | "en";

export const LANGUAGE_STORAGE_KEY = "multicolor-sweeper-language";

const COLOR_NAMES: Record<Language, readonly string[]> = {
  ja: ["赤", "青", "緑", "黄"],
  en: ["red", "blue", "green", "yellow"]
};

const COPY = {
  ja: {
    language: "言語",
    japanese: "日本語",
    english: "EN",
    timeAttack: "TIME ATTACK",
    gameInfo: "ゲーム情報",
    time: "TIME",
    flags: "FLAGS",
    difficulty: "難易度",
    difficulties: { easy: "EASY", normal: "NORMAL", hard: "HARD" },
    colors: "色数",
    start: "START",
    menu: "MENU",
    pause: "PAUSE",
    paused: "PAUSE",
    resume: "再開",
    generating: "生成中…",
    result: "RESULT",
    clear: "CLEAR!",
    clearTime: "CLEAR TIME",
    gameOver: "GAME OVER",
    error: "エラー",
    retry: "RETRY",
    viewBoard: "盤面を見る",
    ranking: "RANKING",
    back: "戻る",
    backToResult: "RESULTへ戻る",
    player: "PLAYER",
    notSet: "未登録",
    setName: "名前登録",
    changeName: "名前変更",
    yourRank: "あなたの順位",
    rank: "順位",
    name: "名前",
    tableColors: "色数",
    play: "PLAY",
    registerName: "名前登録",
    nameRequiredForSubmit: "タイムを登録するため、名前を登録してください。",
    playerNamePlaceholder: "プレイヤー名",
    save: "保存",
    cancel: "CANCEL",
    submitTime: "タイムを登録",
    submitting: "送信中…",
    submitted: "登録完了",
    submitFailed: "送信失敗",
    retrySubmit: "再試行",
    newBest: "NEW BEST!",
    status: {
      settings: "難易度と色数を選んでください",
      awaitingFirst: "好きなマスをタップしてください",
      generating: "盤面を生成中…",
      playing: "タップで開く・スワイプで旗を立てる",
      won: "CLEAR!",
      lost: "GAME OVER",
      error: "生成エラー"
    },
    errors: {
      clientUnavailable: "盤面生成の準備ができませんでした。再読み込みしてください。",
      generationFailed: "盤面を生成できませんでした。もう一度お試しください。"
    },
    flagDirections: "旗を立てるスワイプ方向"
  },
  en: {
    language: "Language",
    japanese: "日本語",
    english: "EN",
    timeAttack: "TIME ATTACK",
    gameInfo: "Game information",
    time: "TIME",
    flags: "FLAGS",
    difficulty: "DIFFICULTY",
    difficulties: { easy: "EASY", normal: "NORMAL", hard: "HARD" },
    colors: "COLORS",
    start: "START",
    menu: "MENU",
    pause: "PAUSE",
    paused: "PAUSED",
    resume: "RESUME",
    generating: "GENERATING",
    result: "RESULT",
    clear: "CLEAR!",
    clearTime: "CLEAR TIME",
    gameOver: "GAME OVER",
    error: "ERROR",
    retry: "RETRY",
    viewBoard: "VIEW BOARD",
    ranking: "RANKING",
    back: "BACK",
    backToResult: "BACK TO RESULT",
    player: "PLAYER",
    notSet: "NOT SET",
    setName: "SET NAME",
    changeName: "CHANGE NAME",
    yourRank: "YOUR RANK",
    rank: "RANK",
    name: "NAME",
    tableColors: "COLORS",
    play: "PLAY",
    registerName: "REGISTER NAME",
    nameRequiredForSubmit: "Register a name to submit this time.",
    playerNamePlaceholder: "PLAYER NAME",
    save: "SAVE",
    cancel: "CANCEL",
    submitTime: "SUBMIT TIME",
    submitting: "SUBMITTING...",
    submitted: "SUBMITTED",
    submitFailed: "SUBMIT FAILED",
    retrySubmit: "TRY AGAIN",
    newBest: "NEW BEST!",
    status: {
      settings: "Choose a difficulty and number of colors",
      awaitingFirst: "Tap any cell to start",
      generating: "Generating board…",
      playing: "Tap to open · Swipe to flag",
      won: "CLEAR!",
      lost: "GAME OVER",
      error: "Generation error"
    },
    errors: {
      clientUnavailable: "The board generator is not ready. Please reload the page.",
      generationFailed: "The board could not be generated. Please try again."
    },
    flagDirections: "Swipe directions for flags"
  }
} as const;

export function resolveInitialLanguage(storedLanguage: string | null, browserLanguages: readonly string[]): Language {
  if (storedLanguage === "ja" || storedLanguage === "en") return storedLanguage;
  return browserLanguages.some((language) => language.toLowerCase().startsWith("ja")) ? "ja" : "en";
}

export function readInitialLanguage(): Language {
  if (typeof window === "undefined") return "en";
  let storedLanguage: string | null = null;
  try { storedLanguage = window.localStorage.getItem(LANGUAGE_STORAGE_KEY); } catch {}
  const browserLanguages = navigator.languages.length > 0 ? navigator.languages : [navigator.language];
  return resolveInitialLanguage(storedLanguage, browserLanguages);
}

export function persistLanguage(language: Language): void {
  try { window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language); } catch {}
}

export function getCopy(language: Language) { return COPY[language]; }

export function difficultyLabel(language: Language, difficulty: "easy" | "normal" | "hard"): string {
  return COPY[language].difficulties[difficulty];
}

export function bombCountLabel(language: Language, mineCount: MineCount): string {
  return language === "ja" ? `爆弾 ${mineCount}個` : `${mineCount} BOMBS`;
}

export function colorCountLabel(language: Language, colorCount: ColorCount): string {
  return language === "ja" ? `${colorCount}色` : `${colorCount} COLORS`;
}

export function colorName(language: Language, color: MineColor): string { return COLOR_NAMES[language][color]; }

export function flagLabel(language: Language, flag: FlagColor): string {
  if (flag === "neutral") return language === "ja" ? "無色旗" : "neutral flag";
  return language === "ja" ? `${colorName(language, flag)}旗` : `${colorName(language, flag)} flag`;
}

export function flagsRemainingLabel(language: Language, remaining: number): string {
  if (language === "ja") {
    return remaining < 0 ? `残り旗数 ${remaining}。旗が${Math.abs(remaining)}本多いです` : `残り旗数 ${remaining}`;
  }
  return remaining < 0 ? `${remaining} flags remaining. ${Math.abs(remaining)} too many flags placed.` : `${remaining} flags remaining`;
}

export function boardLabel(language: Language, gridSize: number): string {
  return language === "ja" ? `${gridSize}×${gridSize} マインスイーパー盤面` : `${gridSize} by ${gridSize} Minesweeper board`;
}

export function cellPosition(language: Language, row: number, col: number): string {
  return language === "ja" ? `${row}行${col}列` : `Row ${row}, column ${col}`;
}

export function bombLabel(language: Language, color: MineColor): string {
  return language === "ja" ? `${colorName(language, color)}の爆弾` : `${colorName(language, color)} bomb`;
}

export function cellStateLabel(language: Language, state: "exploded" | "empty" | "correct" | "wrong-answer" | "no-flag" | "no-bomb" | "unrevealed"): string {
  const labels = {
    ja: { exploded: "爆発", empty: "空き", correct: "正解", "wrong-answer": "で誤答", "no-flag": "旗なし", "no-bomb": "爆弾なし", unrevealed: "未開放" },
    en: { exploded: "exploded", empty: "empty", correct: "correct", "wrong-answer": "wrong answer", "no-flag": "no flag", "no-bomb": "no bomb", unrevealed: "unrevealed" }
  } as const;
  return labels[language][state];
}

export function adjacentBombsLabel(language: Language, counts: readonly number[]): string {
  const values = counts.join(",");
  return language === "ja" ? `周囲の爆弾 ${values}` : `Adjacent bombs ${values}`;
}

export function wrongFlagLabel(language: Language): string { return language === "ja" ? "誤った旗" : "Wrong flag"; }
