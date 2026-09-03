# UI Terminology / 日英表記

最終更新: 2026-09-02

日本語モードは全訳しない。ゲームUIとして日本でも一般的な短い英語はそのまま残し、意味を一瞬考えやすい説明・状態・ランキング固有語を日本語化する。

## 日本語モードでも英語のまま使う

| 意味 | EN | 日本語モード |
| --- | --- | --- |
| ゲーム名 | MULTICOLOR SWEEPER | MULTICOLOR SWEEPER |
| モード | TIME ATTACK | TIME ATTACK |
| 開始 | START | START |
| 難易度名 | EASY / NORMAL / HARD | EASY / NORMAL / HARD |
| 爆弾数 | 20 BOMBS | 20 BOMBS |
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
| 再開 | RESUME | 再開 |
| タイム登録 | SUBMIT TIME | タイムを登録 |
| 送信中 | SUBMITTING... | 送信中… |
| 登録完了 | SUBMITTED | 登録完了 |
| 送信失敗 | SUBMIT FAILED | 送信失敗 |
| 再送 | TRY AGAIN | 再試行 |
| 盤面確認 | VIEW BOARD | 盤面を見る |
| 自己ベスト | BEST TIME | BEST TIME |

## 運用ルール

- `SAVE SCORE` は使用しない。このゲームで競う値はスコアではなくタイムなので、英語は `SUBMIT TIME`、日本語は `タイムを登録` とする。
- ランキングの3色/4色は同一部門に混在する。列名は「特定の色」ではなく色数を表すため、英語は `COLORS`、日本語は `色数` とする。
- 名前はプレイ開始時には要求しない。初回の `SUBMIT TIME` / `タイムを登録` 時に未登録なら名前登録を求める。
- 言語切替は設定画面とランキング画面に `日本語 | EN` として横一列で表示し、プレイHUDには置かない。
- PAUSEは `PAUSE` / `RESUME`（日本語モードでは `再開`）/ `MENU` の操作だけを表示し、「タイマー停止中」「盤面を隠しています」等の説明は出さない。
- 名前登録/変更を設定・ランキングから自発的に開いた場合は説明文を出さず、タイム登録から初回名前登録へ遷移した場合だけ必要理由を1行表示する。
- 自己ベスト更新時は登録成功から約1秒後にランキングへ自動遷移する。未更新時は結果に留まり、`BEST TIME` を小さく表示する。
- 設定から開いたランキングは `BACK` / `戻る` のみ、結果から開いたランキングは `RESULT` と `MENU` を表示する。
- 選択言語は端末に保存する。日本語ブラウザで未選択の場合は日本語、それ以外は英語を初期値とする。
- 言語切替後、操作案内・説明・エラーは選択中の言語だけを表示し、英日併記はしない。
- 日本語はMaruMonica、英語・数字・共通ゲーム英語はVT323を基本とする。
