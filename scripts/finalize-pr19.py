from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        raise RuntimeError(f"missing replacement target: {label}")
    return text.replace(old, new, 1)


# --- i18n ---------------------------------------------------------------
i18n = '''import type { ColorCount, FlagColor, MineColor, MineCount } from "./game/types";

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
    timeStopped: "タイマー停止中",
    pauseDescription: "ポーズ中は盤面を隠しています。",
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
    nameOnlyForRecord: "名前はタイムを登録するときだけ必要です。",
    nameRequiredForSubmit: "タイムを登録するため、名前を登録してください。",
    nameOptional: "名前を登録しなくてもプレイできます。",
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
    timeStopped: "TIME STOPPED",
    pauseDescription: "The board is hidden while paused.",
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
    nameOnlyForRecord: "Name is only needed when submitting a time.",
    nameRequiredForSubmit: "Register a name to submit this time.",
    nameOptional: "You can play without registering a name.",
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
'''
(ROOT / "src/i18n.ts").write_text(i18n, encoding="utf-8")

# --- i18n tests ---------------------------------------------------------
test_path = ROOT / "src/i18n.test.ts"
t = test_path.read_text(encoding="utf-8")
t = t.replace('expect(bombCountLabel("ja", 20)).toBe("20爆弾");', 'expect(bombCountLabel("ja", 20)).toBe("爆弾 20個");')
marker = '  it("localizes normal and over-limit remaining flag announcements", () => {'
extra = '''  it("keeps established game terms in English in Japanese mode", () => {\n    const copy = getCopy("ja");\n    expect(copy.flags).toBe("FLAGS");\n    expect(copy.clearTime).toBe("CLEAR TIME");\n    expect(copy.retry).toBe("RETRY");\n    expect(copy.submitTime).toBe("タイムを登録");\n  });\n\n'''
if extra not in t:
    t = t.replace(marker, extra + marker)
test_path.write_text(t, encoding="utf-8")

# --- App.tsx ------------------------------------------------------------
p = ROOT / "src/App.tsx"
s = p.read_text(encoding="utf-8")
s = replace_once(s, '  getCopy,\n  type Language\n', '  getCopy,\n  persistLanguage,\n  readInitialLanguage,\n  type Language\n', 'i18n imports')
s = replace_once(s, 'const ACTIVE_LANGUAGE: Language = "en";\n', '', 'remove active language')
s = replace_once(s, 'export default function App(): React.JSX.Element {\n  const [mineCount', 'export default function App(): React.JSX.Element {\n  const [language, setLanguage] = useState<Language>(() => readInitialLanguage());\n  const [mineCount', 'language state')
s = replace_once(s, '  const language = ACTIVE_LANGUAGE;\n  const copy = getCopy(language);\n  const japaneseCopy = getCopy("ja");\n', '  const copy = getCopy(language);\n', 'copy selection')
needle = '  useEffect(() => {\n    try {\n      setPlayerName(window.localStorage.getItem(PLAYER_NAME_STORAGE_KEY) ?? "");'
insert = '  useEffect(() => {\n    document.documentElement.lang = language;\n    persistLanguage(language);\n  }, [language]);\n\n  const selectLanguage = (nextLanguage: Language): void => {\n    setLanguage(nextLanguage);\n  };\n\n  useEffect(() => {\n    try {\n      setPlayerName(window.localStorage.getItem(PLAYER_NAME_STORAGE_KEY) ?? "");'
s = replace_once(s, needle, insert, 'language effect')
old_status = '''  const statusText: Record<Phase, string> = {\n    settings: copy.status.settings,\n    "awaiting-first": copy.status.awaitingFirst,\n    generating: showGenerating ? copy.status.generating : "",\n    playing: paused ? "PAUSED" : copy.status.playing,\n    won: copy.status.won,\n    lost: copy.status.lost,\n    error: copy.status.error\n  };\n  const statusTranslation = phase === "awaiting-first"\n    ? japaneseCopy.status.awaitingFirst\n    : phase === "playing" && !paused\n      ? japaneseCopy.status.playing\n      : null;\n'''
new_status = '''  const statusText: Record<Phase, string> = {\n    settings: copy.status.settings,\n    "awaiting-first": copy.status.awaitingFirst,\n    generating: showGenerating ? copy.status.generating : "",\n    playing: paused ? copy.paused : copy.status.playing,\n    won: copy.status.won,\n    lost: copy.status.lost,\n    error: copy.status.error\n  };\n'''
s = replace_once(s, old_status, new_status, 'status copy')
old_rank_header = '''          <header className="ranking-header">\n            <div>\n              <p className="eyebrow">TIME ATTACK</p>\n              <h1 id="ranking-title">RANKING</h1>\n            </div>\n            <button className="compact-button" type="button" onClick={() => setRankingOpen(false)}>BACK</button>\n          </header>'''
new_rank_header = '''          <header className="ranking-header">\n            <h1 id="ranking-title">{copy.ranking}</h1>\n            <div className="language-toggle" aria-label={copy.language}>\n              <button type="button" className={language === "ja" ? "selected" : ""} onClick={() => selectLanguage("ja")}>{copy.japanese}</button>\n              <span aria-hidden="true">|</span>\n              <button type="button" className={language === "en" ? "selected" : ""} onClick={() => selectLanguage("en")}>EN</button>\n            </div>\n          </header>'''
s = replace_once(s, old_rank_header, new_rank_header, 'ranking header')
s = s.replace('<span><small>PLAYER</small>{playerName || "NOT SET"}</span>', '<span><small>{copy.player}</small>{playerName || copy.notSet}</span>')
s = s.replace('<span><small>YOUR RANK</small>{yourRank === null ? "--" : `#${yourRank}`}</span>', '<span><small>{copy.yourRank}</small>{yourRank === null ? "--" : `#${yourRank}`}</span>')
s = s.replace('{playerName ? "CHANGE" : "SET NAME"}', '{playerName ? copy.changeName : copy.setName}')
s = s.replace('<thead><tr><th>RANK</th><th>NAME</th><th>COLOR</th><th>TIME</th></tr></thead>', '<thead><tr><th>{copy.rank}</th><th>{copy.name}</th><th>{copy.tableColors}</th><th>{copy.time}</th></tr></thead>')
s = s.replace('PLAY {rankingMineCount}', '{copy.play} {rankingMineCount}')
s = s.replace('{rankingOrigin === "result" ? "BACK TO RESULT" : "BACK"}', '{rankingOrigin === "result" ? copy.backToResult : copy.back}')
s = s.replace('<h2 id="name-title">{playerName ? "CHANGE NAME" : "REGISTER NAME"}</h2>\n                <p>Name is only needed when saving a record.</p>', '<h2 id="name-title">{playerName ? copy.changeName : copy.registerName}</h2>\n                <p>{copy.nameOnlyForRecord}</p>', 1)
s = s.replace('aria-label="Player name"', 'aria-label={copy.name}', 1)
s = s.replace('placeholder="PLAYER NAME"', 'placeholder={copy.playerNamePlaceholder}', 1)
s = s.replace('onClick={confirmName}>SAVE</button>', 'onClick={confirmName}>{copy.save}</button>', 1)
s = s.replace('onClick={() => setNameEditorOpen(false)}>CANCEL</button>', 'onClick={() => setNameEditorOpen(false)}>{copy.cancel}</button>', 1)
old_settings_header = '''            <header className="game-header game-header-settings">\n              <div>\n                <p className="eyebrow">{copy.timeAttack}</p>\n                <h1 id="game-title">MULTICOLOR SWEEPER</h1>\n              </div>\n            </header>'''
new_settings_header = '''            <header className="game-header game-header-settings">\n              <div>\n                <p className="eyebrow">{copy.timeAttack}</p>\n                <h1 id="game-title">MULTICOLOR SWEEPER</h1>\n              </div>\n              <div className="language-toggle" aria-label={copy.language}>\n                <button type="button" className={language === "ja" ? "selected" : ""} onClick={() => selectLanguage("ja")}>{copy.japanese}</button>\n                <span aria-hidden="true">|</span>\n                <button type="button" className={language === "en" ? "selected" : ""} onClick={() => selectLanguage("en")}>EN</button>\n              </div>\n            </header>'''
s = replace_once(s, old_settings_header, new_settings_header, 'settings header')
s = s.replace('>RANKING</button>', '>{copy.ranking}</button>')
s = s.replace('onClick={pauseGame}>PAUSE</button>', 'onClick={pauseGame}>{copy.pause}</button>')
s = s.replace('disabled={phase === "generating"}>MENU</button>', 'disabled={phase === "generating"}>{copy.menu}</button>')
s = s.replace('className={`status status-${phase}${statusTranslation ? " status-bilingual" : ""}${resultOpen ? " status-result-open" : ""}`}', 'className={`status status-${phase}${resultOpen ? " status-result-open" : ""}`}')
s = s.replace('              <span>{statusText[phase]}</span>\n              {statusTranslation ? <span className="status-translation" lang="ja">{statusTranslation}</span> : null}', '              <span>{statusText[phase]}</span>')
s = s.replace('<p className="eyebrow">TIME STOPPED</p>', '<p className="eyebrow">{copy.timeStopped}</p>')
s = s.replace('<h2 id="pause-title">PAUSED</h2>', '<h2 id="pause-title">{copy.paused}</h2>')
s = s.replace('<p>The board is hidden while paused.</p>', '<p>{copy.pauseDescription}</p>')
s = s.replace('onClick={resumeGame}>RESUME</button>', 'onClick={resumeGame}>{copy.resume}</button>')
s = s.replace('onClick={resetToSettings}>MENU</button>', 'onClick={resetToSettings}>{copy.menu}</button>')
s = s.replace('<p className="result-time"><small>CLEAR TIME</small>', '<p className="result-time"><small>{copy.clearTime}</small>')
s = s.replace('<p className="best-badge">NEW BEST!</p>', '<p className="best-badge">{copy.newBest}</p>')
s = s.replace('<p className="submit-status">SENDING...</p>', '<p className="submit-status">{copy.submitting}</p>')
s = s.replace('<p className="submit-status success">SAVED · #{submittedRank ?? "--"}</p>', '<p className="submit-status success">{copy.submitted} · #{submittedRank ?? "--"}</p>')
s = s.replace('<p className="submit-status error">SAVE FAILED</p>', '<p className="submit-status error">{copy.submitFailed}</p>')
s = s.replace('>VIEW RANKING</button>', '>{copy.ranking}</button>')
s = s.replace('{submitState === "error" ? "TRY SAVE AGAIN" : "SAVE SCORE"}', '{submitState === "error" ? copy.retrySubmit : copy.submitTime}')
s = s.replace('<h2 id="name-title">{playerName ? "CHANGE NAME" : "REGISTER NAME"}</h2>', '<h2 id="name-title">{playerName ? copy.changeName : copy.registerName}</h2>')
s = s.replace('<p>{namePurpose === "submit" ? "Register a name to save this record." : "You can play without registering a name."}</p>', '<p>{namePurpose === "submit" ? copy.nameRequiredForSubmit : copy.nameOptional}</p>')
s = s.replace('aria-label="Player name"', 'aria-label={copy.name}')
s = s.replace('placeholder="PLAYER NAME"', 'placeholder={copy.playerNamePlaceholder}')
s = s.replace('{namePurpose === "submit" ? "SAVE SCORE" : "SAVE"}', '{namePurpose === "submit" ? copy.submitTime : copy.save}')
s = s.replace('onClick={() => setNameEditorOpen(false)}>CANCEL</button>', 'onClick={() => setNameEditorOpen(false)}>{copy.cancel}</button>')
s = s.replace('<section className="game-panel ranking-screen" aria-labelledby="ranking-title">', '<section className={`game-panel ranking-screen language-${language}`} lang={language} aria-labelledby="ranking-title">')
s = s.replace('className="game-panel"\n        aria-labelledby', 'className={`game-panel language-${language}`}\n        lang={language}\n        aria-labelledby')
p.write_text(s, encoding="utf-8")

# --- CSS ----------------------------------------------------------------
css_path = ROOT / "src/styles.css"
css = css_path.read_text(encoding="utf-8")
css = replace_once(css, '  place-items: center;\n}\n\n.board {', '  place-items: start center;\n  padding-top: 4px;\n}\n\n.board {', 'board top alignment')
if '.language-toggle {' not in css:
    css += '''\n\n.language-toggle {\n  display: inline-flex;\n  flex: 0 0 auto;\n  align-items: center;\n  gap: 4px;\n  color: #68708f;\n  white-space: nowrap;\n}\n.language-toggle button { min-height: 30px; padding: 2px 4px; color: #9ea6c6; background: transparent; font-family: "VT323", monospace; font-size: 17px; cursor: pointer; }\n.language-toggle button:first-child { font-family: "MaruMonica", system-ui, sans-serif; font-size: 11px; }\n.language-toggle button.selected { color: var(--accent); }\n.language-ja { font-family: "MaruMonica", system-ui, sans-serif; }\n.language-ja h1,\n.language-ja .eyebrow,\n.language-ja .hud-strip,\n.language-ja .ranking-tabs,\n.language-ja .ranking-table td,\n.language-ja .start-button,\n.language-ja .ranking-button,\n.language-ja .result-reopen,\n.language-ja .best-badge,\n.language-ja .result-time,\n.language-ja .choice-row button,\n.language-ja .result-dialog h2 { font-family: "VT323", monospace; }\n.language-ja .choice-row button small { font-family: "MaruMonica", system-ui, sans-serif; }\n@media (max-height: 600px) {\n  .language-toggle button { min-height: 26px; font-size: 15px; }\n  .language-toggle button:first-child { font-size: 10px; }\n  .board-wrap { padding-top: 2px; }\n}\n'''
css_path.write_text(css, encoding="utf-8")

# --- terminology --------------------------------------------------------
terminology = '''# UI Terminology / 日英表記

最終更新: 2026-08-30

日本語モードは全訳しない。ゲームUIとして日本でも一般的な短い英語はそのまま残し、意味を一瞬考えやすい説明・状態・ランキング固有語を日本語化する。

## 日本語モードでも英語のまま使う

| 意味 | EN | 日本語モード |
| --- | --- | --- |
| ゲーム名 | MULTICOLOR SWEEPER | MULTICOLOR SWEEPER |
| モード | TIME ATTACK | TIME ATTACK |
| 開始 | START | START |
| 難易度名 | EASY / NORMAL / HARD | EASY / NORMAL / HARD |
| ランキング | RANKING | RANKING |
| 時間HUD | TIME | TIME |
| 残り旗HUD | FLAGS | FLAGS |
| ポーズ | PAUSE | PAUSE |
| メニュー | MENU | MENU |
| クリア | CLEAR! | CLEAR! |
| クリアタイム | CLEAR TIME | CLEAR TIME |
| ゲームオーバー | GAME OVER | GAME OVER |
| 再挑戦 | RETRY | RETRY |
| ベスト更新 | NEW BEST! | NEW BEST! |
| 結果再表示 | RESULT | RESULT |
| キャンセル | CANCEL | CANCEL |
| プレイヤー見出し | PLAYER | PLAYER |

## 日本語モードで日本語化する

| 意味 | EN | 日本語モード |
| --- | --- | --- |
| 難易度見出し | DIFFICULTY | 難易度 |
| 爆弾数 | 20 BOMBS | 爆弾 20個 |
| 色数見出し | COLORS | 色数 |
| 色数 | 3 COLORS / 4 COLORS | 3色 / 4色 |
| 名前未登録 | NOT SET | 未登録 |
| 名前登録 | SET NAME / REGISTER NAME | 名前登録 |
| 名前変更 | CHANGE NAME | 名前変更 |
| 自分の順位 | YOUR RANK | あなたの順位 |
| 順位列 | RANK | 順位 |
| 名前列 | NAME | 名前 |
| 色数列 | COLORS | 色数 |
| 戻る | BACK | 戻る |
| 結果へ戻る | BACK TO RESULT | RESULTへ戻る |
| 再開 | RESUME | 再開 |
| タイマー停止状態 | TIME STOPPED | タイマー停止中 |
| タイム登録 | SUBMIT TIME | タイムを登録 |
| 送信中 | SUBMITTING... | 送信中… |
| 登録完了 | SUBMITTED | 登録完了 |
| 送信失敗 | SUBMIT FAILED | 送信失敗 |
| 再送 | TRY AGAIN | 再試行 |
| 盤面確認 | VIEW BOARD | 盤面を見る |

## 運用ルール

- `SAVE SCORE` は使用しない。このゲームで競う値はスコアではなくタイムなので、英語は `SUBMIT TIME`、日本語は `タイムを登録` とする。
- ランキングの3色/4色は同一部門に混在する。列名は「特定の色」ではなく色数を表すため、英語は `COLORS`、日本語は `色数` とする。
- 名前はプレイ開始時には要求しない。初回の `SUBMIT TIME` / `タイムを登録` 時に未登録なら名前登録を求める。
- 言語切替は設定画面とランキング画面に `日本語 | EN` として表示し、プレイHUDには置かない。
- 選択言語は端末に保存する。日本語ブラウザで未選択の場合は日本語、それ以外は英語を初期値とする。
- 言語切替後、操作案内・説明・エラーは選択中の言語だけを表示し、英日併記はしない。
- 日本語はMaruMonica、英語・数字・共通ゲーム英語はVT323を基本とする。
'''
(ROOT / "UI_TERMINOLOGY.md").write_text(terminology, encoding="utf-8")

# --- SPEC targeted updates ---------------------------------------------
spec_path = ROOT / "SPEC.md"
spec = spec_path.read_text(encoding="utf-8")
spec = spec.replace('- 通常UIは英語を基本とし、初手待ちとプレイ中の操作案内だけ英日併記する\n- 言語切替UIは表示しない。翻訳基盤は保持する', '- 設定画面とランキング画面に `日本語 | EN` の言語切替を表示し、選択を端末に保存する\n- 日本語モードでもゲーム界隈で一般的な短い英語は残し、説明・状態・ランキング固有語を日本語化する。詳細は `UI_TERMINOLOGY.md` を正とする\n- 操作案内・説明・エラーは選択中の言語だけを表示し、英日併記はしない')
spec = spec.replace('- 難易度と色数は盤面直上の補助情報として簡潔に表示する', '- 難易度と色数は盤面直上の補助情報として簡潔に表示する\n- 縦長画面でもHUDと盤面の間に大きな空白を作らず、余剰高さは原則として盤面より下側へ逃がす')
spec = spec.replace('- 記録未送信時の第二操作は `SAVE SCORE`', '- 記録未送信時の第二操作は英語 `SUBMIT TIME` / 日本語 `タイムを登録`')
spec = spec.replace('- ランキング表には `COLOR` 列を設け、各記録が3色か4色か明示する', '- ランキング表には `COLORS` 列を設け、各記録が3色か4色か明示する')
spec = spec.replace('- 初めて `SAVE SCORE` を選んだ時だけ名前登録を求める', '- 初めて `SUBMIT TIME` / `タイムを登録` を選んだ時だけ名前登録を求める')
spec = spec.replace('- 保存操作には `SENDING...` / 成功 / 失敗の状態を持つ', '- 登録操作には `SUBMITTING...` / 成功 / 失敗の状態を持つ')
spec = spec.replace('- 表の主要列は `RANK / NAME / COLOR / TIME`', '- 表の主要列は英語時 `RANK / NAME / COLORS / TIME`。日本語時は順位・名前・色数を日本語化し、`TIME` は英語のまま維持する')
start = spec.index('## 多言語化')
end = spec.index('\n## 技術構成', start)
spec_multi = '''## 多言語化\n\n- 設定画面とランキング画面に `日本語 | EN` の言語切替を表示する\n- 選択言語はlocalStorageへ保存する。未保存時はブラウザ言語を参照する\n- 日本語モードは全訳せず、日本のゲームUIで一般的な短い英語はそのまま残す\n  - 例: `TIME ATTACK` / `START` / `RANKING` / `TIME` / `FLAGS` / `PAUSE` / `MENU` / `CLEAR!` / `CLEAR TIME` / `RETRY` / `NEW BEST!` / `RESULT`\n- 意味を考えやすい説明、状態、ランキング固有語は日本語化する\n  - 例: `SUBMIT TIME` → `タイムを登録`、`YOUR RANK` → `あなたの順位`、`COLORS` → `色数`\n- 操作案内・説明・エラーは選択中の言語だけを表示する\n- 日本語はMaruMonica、英語・数字・共通ゲーム英語はVT323を基本とする\n- 表記の正は `UI_TERMINOLOGY.md` とする\n- ゲームタイトル `MULTICOLOR SWEEPER` は固有名詞として両言語で維持する\n- 実行中HTML `lang` は選択言語へ追従する\n'''
spec = spec[:start] + spec_multi + spec[end:]
spec_path.write_text(spec, encoding="utf-8")

# --- project status -----------------------------------------------------
status = '''# Project Status

最終更新: 2026-08-30

## 現在地

- React / Vite / TypeScript / PWAの製品版基礎構成を作成済み
- Labの決定論的ゲームコア、標準Solver、color-essential、条件C生成器をTypeScriptへ移植済み
- 生成処理をmodule Web Worker境界へ分離済み
- EASY 15 / NORMAL 20 / HARD 25爆弾、3色/4色選択、自由初手、初手周囲安全、生成後タイマー開始を実装済み
- タップ開封、Chord、3色/4色の色旗・無色旗、勝敗、決着後答え合わせを実装済み
- PR #16〜#18までの用語・UI基盤整理をmain反映済み
- PR #19で完成案C「Board First」、PAUSE、ランキングUIシェル、日英切替を反映
- Cloudflare Workers（Static Assets）へデプロイ構成済み

## PR #19 — Board First UI

ユーザー確認済みの完成案Cを採用。

### レイアウト / HUD

- プレイ画面を `TIME / FLAGS / PAUSE` の1行HUDへ整理
- 難易度・色数を盤面直上へ簡潔に表示
- 縦長画面でHUDと盤面の距離が開きすぎないよう盤面を上寄せし、余剰高さを盤面より下側へ逃がす
- `MULTICOLOR SWEEPER` / `TIME ATTACK` は設定画面だけに表示
- `VIEW BOARD` 後の `RESULT` は盤面外に配置し、セルと重ねない
- 320×480を含む小画面で主要文字と操作を極端に縮小しない
- 操作ボタンは可能な限り約44pxのタップ領域を確保
- 背景、パネル、罫線、文字、アクセントを共通のデザイン体系へ整理

### PAUSE

- プレイ中HUDに `PAUSE`
- PAUSE中はタイマー停止
- 全81セルを未開封見た目へマスクし、Clue・旗・爆弾・開封位置を見せない
- PAUSE中は盤面操作を無効化
- 主要操作は `RESUME` / 日本語モードでは `再開`、補助操作は `MENU`
- RESUME後は停止時間をタイムへ含めない
- ポーズ前後で盤面サイズ・位置を変えない

### ランキングUIシェル

実ランキング通信、DB、認証、不正対策は未実装。現段階はモックデータ＋localStorage。

- 設定画面とCLEAR結果から `RANKING` へ遷移
- 名前はプレイ開始時に要求しない
- 初回 `SUBMIT TIME` / `タイムを登録` 時、未登録なら名前登録
- 設定・ランキングから名前を登録/変更可能
- CLEARでクリアタイムと `NEW BEST!` を表示
- 登録中 / 成功 / 失敗 / 今回順位のUI状態を用意
- 部門は15 / 20 / 25 BOMBSの3部門
- 3色と4色は同一ランキングへ混在
- ランキング表は英語時 `RANK / NAME / COLORS / TIME`。3色/4色を `COLORS` で識別
- 自己ベストも同じ爆弾数なら3色/4色をまたいで比較
- ランキングから選択中の爆弾数で再プレイ可能

### 日英切替 / 用語

- 設定画面とランキング画面に `日本語 | EN` を表示
- 選択言語をlocalStorageへ保存し、実行中HTML `lang` も追従
- 操作案内・説明・エラーは選択言語だけを表示
- 日本語モードでも一般的なゲーム英語は維持
  - `TIME ATTACK / START / RANKING / TIME / FLAGS / PAUSE / MENU / CLEAR! / CLEAR TIME / RETRY / NEW BEST! / RESULT`
- 説明・状態・ランキング固有語は日本語化
- `SAVE SCORE` は廃止し、英語 `SUBMIT TIME` / 日本語 `タイムを登録`
- `COLOR` 列は `COLORS` に変更
- 詳細表記は `UI_TERMINOLOGY.md` を正とする

## 検証

PR #16〜#18反映後のmain基準は44 tests。PR #19ではランキング純粋ロジック4 testsと日英表記テストを追加する。

最終確認:
- `npm run typecheck`
- `npm test`
- `npm run build`

主要viewport: 320×480 / 320×568 / 375×667 / 390×844。

## 既存の確定事項

- 製品版の採用フィルタは条件C
- 条件C / No-Guess / Seed / attempt / generation ms は内部仕様であり通常UIには表示しない
- タイマーはWorker生成完了・初手開封後に開始
- Chordは旗総数判定
- 旗の設置本数は爆弾総数で制限せず、超過時は `FLAGS` を負数の警告表示にする
- 3色は ↖赤 / ↗青 / ↙緑 / ↑無色、↘未使用
- 4色は ↖赤 / ↗青 / ↙緑 / ↘黄 / ↑無色
- 色の定義は `rules.ts` の `COLORS` が唯一の出処
- `MULTICOLOR SWEEPER` / `TIME ATTACK` は設定画面だけに表示
- ページ全体を100dvhに固定し、盤面は9×9正方形を維持
- 爆弾・旗・矢印はSVG/ピクセルアートで保持

## 残課題 / 次の順序

1. 開封・連鎖・爆発・CLEARの演出＋効果音
2. iPhone / Android実機・アクセシビリティ最終QA
3. 実ランキングAPI / DB / 認証 / 不正対策

別系統: エンドレスモード / 広告 / カスタムドメイン / hanage-hub紹介ページ / Daily Challenge。
'''
(ROOT / "PROJECT_STATUS.md").write_text(status, encoding="utf-8")

# --- roadmap ------------------------------------------------------------
roadmap = '''# UI Roadmap

最終更新: 2026-08-30

## 情報の優先順位

1. `SPEC.md`: 確定した製品仕様
2. `UI_TERMINOLOGY.md`: 日英UI表記
3. `PROJECT_STATUS.md`: mainへ反映済みの実装状況・検証結果
4. `UI_ROADMAP.md`: 次のUI作業順序

## 1. UIレイアウト・文字・配色の品質改善

**状態: DONE — PR #19**

採用案: **C / Board First**

完了範囲:
- `TIME / FLAGS / PAUSE` 1行HUD
- HUDと盤面を近づけ、縦長画面の余白を盤面下へ寄せる
- フォント、余白、罫線、背景、アクセント色の統一
- MENU / PAUSE / RESULT / 結果操作の階層・タップ領域整理
- 320×480を含む小画面対応
- RESULTを盤面セルから外す
- PAUSE: タイマー停止、全セル未開封表示、盤面操作無効、RESUME / MENU
- ランキングUIシェル: 名前登録、NEW BEST、登録状態、15/20/25 BOMBS、3色/4色混在、`COLORS` 列、自分の順位
- 言語切替: 設定 / ランキングの `日本語 | EN`、選択保存、`UI_TERMINOLOGY.md` の表記基準

実ランキング通信・DB・認証・不正対策は含めない。

## 2. 開封・連鎖・爆発・CLEARの演出＋効果音

**状態: NEXT**

候補範囲:
- セル開封フィードバック
- 連鎖開封の短い演出
- 爆発シーケンス
- CLEAR演出
- 旗方向固定時の短い視覚フィードバック
- 開封 / 旗 / 爆発 / CLEAR効果音
- ミュート
- `prefers-reduced-motion`への配慮

制約: 盤面位置・操作判定・ランキングタイム計測・PAUSEマスクを演出で変えない。

## 3. 端末・アクセシビリティ最終QA

**状態: LATER**

対象:
- iPhone Safari / Android Chrome
- 320×480 / 320×568 / 375×667 / 390×844程度
- safe area / PWA表示
- タッチ操作とブラウザジェスチャー干渉
- フォーカス順 / キーボード / 読み上げ
- コントラスト / D型色覚を含む色弁別
- reduced motion
- フォント読み込み・日英切替時のレイアウトシフト

## UIとは別の主要タスク

- 実ランキングAPI / DB / 認証 / 不正対策
- 広告
- エンドレスモード
- Daily Challenge
- カスタムドメイン
- hanage-hub紹介ページ

## 既完了タスク

- P0 操作整合性・viewport固定: PR #7〜#10
- P1-A 用語統一・HUD整理: PR #11、#13
- P1-B 結果表示・100dvh: PR #14
- P1-C 多言語基盤: PR #15、フォローアップ PR #16〜#18
- Board First / PAUSE / ランキングUI / 日英切替: PR #19
'''
(ROOT / "UI_ROADMAP.md").write_text(roadmap, encoding="utf-8")

# --- restore normal CI and remove this one-shot machinery --------------
ci = '''name: CI\n\non:\n  pull_request:\n  push:\n    branches: [main]\n\njobs:\n  verify:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - uses: actions/setup-node@v4\n        with:\n          node-version: 22\n          cache: npm\n      - run: npm ci\n      - run: npm run typecheck\n      - run: npm test\n      - run: npm run build\n'''
(ROOT / ".github/workflows/ci.yml").write_text(ci, encoding="utf-8")

for transient in [ROOT / "scripts/finalize-pr19.py", ROOT / ".github/workflows/finalize-pr19.yml"]:
    if transient.exists(): transient.unlink()
