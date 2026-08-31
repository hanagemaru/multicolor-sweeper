from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    p = Path(path)
    text = p.read_text(encoding="utf-8")
    if old not in text:
        raise RuntimeError(f"pattern not found in {path}: {old[:80]!r}")
    p.write_text(text.replace(old, new, 1), encoding="utf-8")


# App: remove redundant pause copy and profile-name helper copy.
replace_once(
    "src/App.tsx",
    '                <p>{copy.nameOnlyForRecord}</p>\n                <input',
    '                <input',
)
replace_once(
    "src/App.tsx",
    '              <p className="eyebrow">{copy.timeStopped}</p>\n              <h2 id="pause-title">{copy.paused}</h2>\n              <p>{copy.pauseDescription}</p>',
    '              <h2 id="pause-title">{copy.paused}</h2>',
)
replace_once(
    "src/App.tsx",
    '              <p>{namePurpose === "submit" ? copy.nameRequiredForSubmit : copy.nameOptional}</p>',
    '              {namePurpose === "submit" ? <p>{copy.nameRequiredForSubmit}</p> : null}',
)

# GameBoard: block Safari/browser edge navigation before it can steal a flag swipe.
replace_once(
    "src/components/GameBoard.tsx",
    'import { useRef } from "react";',
    'import { useEffect, useRef } from "react";',
)
replace_once(
    "src/components/GameBoard.tsx",
    '  const gesture = useRef<GestureState | null>(null);\n',
    '''  const gesture = useRef<GestureState | null>(null);\n  const boardRef = useRef<HTMLDivElement | null>(null);\n\n  useEffect(() => {\n    const element = boardRef.current;\n    if (!element) return;\n\n    const preventBrowserNavigation = (event: TouchEvent): void => {\n      if (!interactive || masked) return;\n      event.preventDefault();\n    };\n\n    element.addEventListener("touchstart", preventBrowserNavigation, { passive: false });\n    return () => element.removeEventListener("touchstart", preventBrowserNavigation);\n  }, [interactive, masked]);\n''',
)
replace_once(
    "src/components/GameBoard.tsx",
    '    <div\n      className={`board${masked ? " board-masked" : ""}`}',
    '    <div\n      ref={boardRef}\n      className={`board${masked ? " board-masked" : ""}`}',
)

# i18n: remove copy that is intentionally no longer shown.
for old in [
    '    timeStopped: "タイマー停止中",\n',
    '    pauseDescription: "ポーズ中は盤面を隠しています。",\n',
    '    nameOnlyForRecord: "名前はタイムを登録するときだけ必要です。",\n',
    '    nameOptional: "名前を登録しなくてもプレイできます。",\n',
    '    timeStopped: "TIME STOPPED",\n',
    '    pauseDescription: "The board is hidden while paused.",\n',
    '    nameOnlyForRecord: "Name is only needed when submitting a time.",\n',
    '    nameOptional: "You can play without registering a name.",\n',
]:
    replace_once("src/i18n.ts", old, "")

# CSS: explicitly lock language selector into one row and strengthen gesture containment.
replace_once(
    "src/styles.css",
    '  touch-action: none;\n}\n\n.cell {',
    '  touch-action: none;\n  overscroll-behavior: none;\n  -webkit-touch-callout: none;\n}\n\n.cell {',
)
replace_once(
    "src/styles.css",
    '''.language-toggle {\n  display: inline-flex;\n  flex: 0 0 auto;\n  align-items: center;\n  gap: 4px;\n  color: #68708f;\n  white-space: nowrap;\n}\n.language-toggle button { min-height: 30px; padding: 2px 4px; color: #9ea6c6; background: transparent; font-family: "VT323", monospace; font-size: 17px; cursor: pointer; }''',
    '''.language-toggle {\n  display: inline-flex;\n  flex: 0 0 auto;\n  flex-direction: row;\n  flex-wrap: nowrap;\n  align-items: center;\n  justify-content: flex-end;\n  width: max-content;\n  max-width: 100%;\n  gap: 4px;\n  color: #68708f;\n  white-space: nowrap;\n}\n.language-toggle button { flex: 0 0 auto; min-height: 30px; padding: 2px 4px; color: #9ea6c6; background: transparent; font-family: "VT323", monospace; font-size: 17px; white-space: nowrap; cursor: pointer; }\n.language-toggle > span { flex: 0 0 auto; }''',
)

# Docs: capture the approved behavior without changing the existing gameplay guidance.
replace_once(
    "SPEC.md",
    '- 盤面の色数に存在しない色旗はゲーム内部でも受け付けない\n',
    '- 盤面の色数に存在しない色旗はゲーム内部でも受け付けない\n- 盤面上のタッチ/スワイプはブラウザの履歴戻る等のネイティブナビゲーションよりゲーム操作を優先し、左端セルの旗スワイプでページ遷移させない\n',
)
replace_once(
    "SPEC.md",
    '- PAUSE画面の主要操作は `RESUME`、補助操作は `MENU`\n',
    '- PAUSE画面は冗長な説明文を置かず、`PAUSE` と主要操作 `RESUME` / `再開`、補助操作 `MENU` だけを表示する\n',
)
replace_once(
    "SPEC.md",
    '- 設定画面とランキング画面に `日本語 | EN` の言語切替を表示し、選択を端末に保存する\n',
    '- 設定画面とランキング画面に `日本語 | EN` の言語切替を横一列で表示し、選択を端末に保存する\n',
)
replace_once(
    "UI_TERMINOLOGY.md",
    '| タイマー停止状態 | TIME STOPPED | タイマー停止中 |\n',
    '',
)
replace_once(
    "UI_TERMINOLOGY.md",
    '- 言語切替は設定画面とランキング画面に `日本語 | EN` として表示し、プレイHUDには置かない。\n',
    '- 言語切替は設定画面とランキング画面に `日本語 | EN` として横一列で表示し、プレイHUDには置かない。\n- PAUSEは `PAUSE` / `RESUME`（日本語モードでは `再開`）/ `MENU` の操作だけを表示し、「タイマー停止中」「盤面を隠しています」等の説明は出さない。\n- 名前登録/変更を設定・ランキングから自発的に開いた場合は説明文を出さず、タイム登録から初回名前登録へ遷移した場合だけ必要理由を1行表示する。\n',
)

# Keep roadmap/status aware of this follow-up without disturbing the next major task.
replace_once(
    "UI_ROADMAP.md",
    '- 言語切替: 設定 / ランキングの `日本語 | EN`、選択保存、`UI_TERMINOLOGY.md` の表記基準\n',
    '- 言語切替: 設定 / ランキングの `日本語 | EN`、選択保存、`UI_TERMINOLOGY.md` の表記基準\n- フォローアップ: 言語切替の横並び安定化、Safari等の左端スワイプ戻る対策、PAUSE/名前登録の冗長説明削減\n',
)
replace_once(
    "PROJECT_STATUS.md",
    '- `COLOR` 列は `COLORS` に変更\n- 詳細表記は `UI_TERMINOLOGY.md` を正とする\n',
    '- `COLOR` 列は `COLORS` に変更\n- 詳細表記は `UI_TERMINOLOGY.md` を正とする\n- フォローアップとして、言語切替を横一列に固定し、盤面の左端スワイプでブラウザ履歴戻るが発火しにくいようネイティブtouchstartを抑止する\n- PAUSEは `PAUSE` / `RESUME`（日本語では `再開`）/ `MENU` のみに簡略化し、設定・ランキングからの名前登録では補足説明を省く\n',
)

# Remove the one-shot tooling itself from the final branch state.
Path("scripts/finalize-ui-polish.py").unlink(missing_ok=True)
Path(".github/workflows/finalize-ui-polish.yml").unlink(missing_ok=True)
