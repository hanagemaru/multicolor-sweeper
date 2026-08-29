# Project Status

最終更新: 2026-08-29

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
- PWAアイコン一式（192/512、maskable、apple-touch-icon 180）を `scripts/generate-icons.mjs` から生成済み
- iOS向けメタとmanifestの `id` / `scope` / `start_url` を整備済み
- Cloudflare Workers（Static Assets）へデプロイ済み。現在の配信URLは `https://multicolor-sweeper.jibunnha.workers.dev/`（Workerの既定URL）
- 盤面のマス高さ・数字位置・0非表示を実機の指摘にあわせて修正済み（PR #3）
- スワイプ方向の矢印を文字からSVGのドット絵へ置き換え、4色の明度を離して弁別性を確保済み（PR #4）

## 進行中（PR #5）

決着後の答え合わせと、ドット絵アイコンの整備。

- 伏せたままの爆弾・色まで当てた旗・爆弾でないマスの旗を、盤面データを書き換えずに描画側だけで表現
- 判定は `game-core.ts` の純関数 `reviewMark` に分離（4種類の印を返す）
- 爆弾を `docs/art/bomb-v2.png` のドット絵（11x17）へ置き換え。図案は1つで、本体色を `COLORS` から差し替えて4色を作る
- 旗もCSSのclip-pathからドット絵（10x16）へ置き換え、爆弾と質感を統一
- ドット絵を矩形に変換する処理は `src/components/pixel-art.tsx` に共通化
- マスの正方形が崩れる問題（割合の高さがグリッド項目でautoに落ちる）を、爆弾・旗・数字の3か所で修正
- 読み上げ名をマス単位にまとめ、`aria-label` が子孫の文言を隠す問題を解消

## 検証結果

- `npm run typecheck`: 成功
- `npm test`: 23テスト成功
- `npm run build`: 成功
- PWA Service Worker、Web Worker、manifestをproduction buildで生成確認済み
- ビルド成果物をヘッドレスChromiumで実プレイし、320/360/390/430/768/1280pxの6ビューポートで盤面の縦横比が1.0000であることを計測確認済み

## 確定事項

- 製品版の採用フィルタは条件C
- Chordは混合判定（旗総数一致＋各色旗が色Clue以下。無色旗が残り色を補完）
- 生成中表示の開始閾値は120ms
- タイマーはWorker生成完了・初手開封後に開始
- 配信先は Cloudflare Workers（Static Assets）
- 公開URLは `https://mcsweeper.hanage.app/` を予定。カスタムドメインは未割り当てで、現在は `*.workers.dev` の既定URLで配信している
- ハブサイトには紹介ページのみを置き、ゲーム本体は独立サブドメインで配信する
- 盤面の図案はSVGのドット絵で持つ。フォントやOSのフォールバックに依存させない
- 色の定義は `rules.ts` の `COLORS` が唯一の出処

## 残課題

- PR #5のレビューとmainへのマージ
- `art/bomb-source` / `art/bomb-v2` ブランチの削除（元絵は `docs/art/` に取り込み済み）
- `hanage.app` ゾーンのCloudflare移管と、`mcsweeper.hanage.app` のカスタムドメイン割り当て（手順は `DEPLOY.md` の初回セットアップ 3 と 5）
- hanage-hub側に `/games/multicolor-sweeper/` 紹介ページと `src/lib/site.ts` のエントリを追加（別Repo）
- iPhone実機で25爆弾の生成時間、120ms表示、スワイプ方向固定を確認
- 完成デザインと画面遷移を設計・実装
- 6部門ランキングのバックエンド、認証、不正対策を決定
- アクセシビリティと端末別タッチ操作の追加QA
- D型色覚での赤-緑の弁別（根本解決には色相の変更が必要。PR #4では明度差までで止めている）

## 次セッション候補

1. iPhone実機QAとスワイプ/生成表示の調整
2. 製品UI・画面遷移のデザイン実装
3. 6部門ランキングのバックエンド選定とデータ設計
