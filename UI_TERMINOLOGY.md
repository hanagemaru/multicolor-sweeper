# UI Terminology / 日英表記

最終更新: 2026-08-30

日本語モードは全訳しない。ゲームUIとして日本でも一般的な短い英語はそのまま残し、意味を一瞬考えやすい説明・状態・ランキング固有語を日本語化する。

## 共通で英語のまま使う

| 意味 | EN | 日本語モード |
| --- | --- | --- |
| ゲーム名 | MULTICOLOR SWEEPER | MULTICOLOR SWEEPER |
| モード | TIME ATTACK | TIME ATTACK |
| 開始 | START | START |
| 難易度名 | EASY / NORMAL / HARD | EASY / NORMAL / HARD |
| ランキング | RANKING | RANKING |
| 時間HUD | TIME | TIME |
| ポーズ | PAUSE | PAUSE |
| メニュー | MENU | MENU |
| クリア | CLEAR! | CLEAR! |
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
| 残り旗HUD | FLAGS | 残り旗 |
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
| クリアタイム | CLEAR TIME | クリアタイム |
| タイム登録 | SUBMIT TIME | タイムを登録 |
| 送信中 | SUBMITTING... | 送信中… |
| 登録完了 | SUBMITTED | 登録完了 |
| 送信失敗 | SUBMIT FAILED | 送信失敗 |
| 再送 | TRY AGAIN | 再試行 |
| 盤面確認 | VIEW BOARD | 盤面を見る |

## 補足

- `SAVE SCORE` は使用しない。このゲームで競う値はスコアではなくタイムなので、英語は `SUBMIT TIME`、日本語は `タイムを登録` とする。
- ランキングの3色/4色は同一部門に混在する。列名は「特定の色」ではなく色数を表すため、英語は `COLORS`、日本語は `色数` とする。
- 名前はプレイ開始時には要求しない。初回の `SUBMIT TIME` / `タイムを登録` 時に未登録なら名前登録を求める。
- 日本語モードの説明文・エラー文・ポーズ説明文は自然な日本語にする。
- 言語切替は設定画面とランキング画面に `日本語 / EN` として表示し、プレイHUDには置かない。
