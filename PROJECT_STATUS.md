# Project Status

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

PR #16〜#18反映後のmain基準は44 tests。PR #19ではランキング純粋ロジック4 testsと日英表記1 testを追加し、最終テスト構成は **49 tests**。

最終確認:
- `npm run typecheck`
- `npm test`（49 tests）
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
