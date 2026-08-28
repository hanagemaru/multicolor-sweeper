# Project Status

最終更新: 2026-08-27

## 現在地

- React / Vite / TypeScript / PWAの製品版基礎構成を作成済み
- Labの決定論的ゲームコア、標準Solver、color-essential、条件C生成器をTypeScriptへ移植済み
- 生成処理をmodule Web Worker境界へ分離済み
- EASY 15 / NORMAL 20 / HARD 25爆弾と、3色/4色の選択画面を実装済み
- START後の自由初手タップ、初手周囲安全、生成後タイマー開始を実装済み
- タップ開封、5方向の色旗/無色旗、混合判定Chord、勝敗を最小UIで実装済み
- 120msを超えた生成だけ表示する生成中オーバーレイを実装済み
- MaruMonica、VT323とライセンス表記を収録済み
- Seed再現性、条件C、Solver soundness、Worker非同期境界を自動テスト済み
- 製品版Repoへ初回実装をPR #1として提出済み

## 検証結果

- `npm run typecheck`: 成功
- `npm test`: 20テスト成功
- `npm run build`: 成功
- PWA Service Worker、Web Worker、manifestをproduction buildで生成確認済み

## 確定事項

- 製品版の採用フィルタは条件C
- Chordは混合判定（旗総数一致＋各色旗が色Clue以下。無色旗が残り色を補完）
- 生成中表示の開始閾値は120ms
- タイマーはWorker生成完了・初手開封後に開始
- Cloudflare Pagesをホスティング第一候補とする

## 残課題

- PR #1のGitHub Actions結果確認、レビュー、mainへのマージ
- iPhone実機で25爆弾の生成時間、120ms表示、スワイプ方向固定を確認
- 完成デザインと画面遷移を設計・実装
- 6部門ランキングのバックエンド、認証、不正対策を決定
- PWA用PNGアイコンとストア/ホーム画面向け最終アセットを作成
- アクセシビリティと端末別タッチ操作の追加QA

## 次セッション候補

1. iPhone実機QAとスワイプ/生成表示の調整
2. 製品UI・画面遷移のデザイン実装
3. 6部門ランキングのバックエンド選定とデータ設計
