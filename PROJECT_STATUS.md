# Project Status

最終更新: 2026-09-04

## 現在地

- React / Vite / TypeScript / PWAの製品版基礎構成を作成済み
- Labの決定論的ゲームコア、標準Solver、color-essential、条件C生成器をTypeScriptへ移植済み
- 生成処理をmodule Web Worker境界へ分離済み
- EASY 15 / NORMAL 20 / HARD 25爆弾、3色/4色選択、自由初手、初手周囲安全、生成後タイマー開始を実装済み
- タップ開封、Chord、3色/4色の色旗・無色旗、勝敗、決着後答え合わせを実装済み
- PR #19で完成案C「Board First」、PAUSE、ランキングUIシェル、日英切替を反映済み
- Cloudflare Workers（Static Assets）へデプロイ構成済み
- 通常開封・連鎖・CINEMATIC BLAST・通常CLEAR・自己ベスト用SUPER CLEARとWeb Audio効果音を実装済み
- PR #29までmainへ反映済み
- **Draft PR #30でCloudflare Workers + D1の実オンラインランキングを実装済み。Cloudflare Preview発行・実API smoke testまで成功。main未反映**

## Board First / 既存UI

- プレイ画面は `TIME / FLAGS / PAUSE` の1行HUD
- 難易度・色数は盤面直上に簡潔表示
- `MULTICOLOR SWEEPER` / `TIME ATTACK` は設定画面だけに表示
- `VIEW BOARD` 後の `RESULT` はHUD右端に表示し、盤面サイズ・位置を維持
- 320×480を含む小画面で主要文字を極端に縮小しない
- PAUSE中はタイマー停止、全81セルを未開封表示へマスクし、盤面操作を無効化
- 日英切替は設定・ランキングに `日本語 | EN` を表示し端末保存
- 表記は `UI_TERMINOLOGY.md` を正とする

## ランキング仕様

- 部門は15 / 20 / 25 BOMBSの3部門
- 3色と4色は同一部門へ混在し、`COLORS` / `色数` 列で識別
- 自己ベストも同じ爆弾数なら3色/4色をまたいで比較
- 名前はプレイ開始時に要求しない
- 初回 `SUBMIT TIME` / `タイムを登録` 時、未登録なら名前登録
- 設定・ランキングから名前登録/変更可能
- 自己ベスト更新時だけ登録可能。未更新時はランキング閲覧のみ
- 登録成功時は現在順位を表示し、自己ベスト更新時は約1秒後にランキングへ自動遷移
- 通信失敗時も結果確認、RETRY、MENU、盤面確認を妨げない
- 旧localStorageのモックランキング/保存済みテスト記録はオンラインへ自動送信しない
- 保存済み表示名は引き継ぐ

## Draft PR #30 — Online Ranking V1

### バックエンド

- Cloudflare Static Assets Workerへ `/api/*` のAPI処理を追加
- Cloudflare D1をランキングDBに使用
- 本番DBとPRプレビューDBを分離し、プレビューのテスト記録を本番へ混ぜない
- API:
  - `GET /api/health`
  - `GET /api/rankings?mineCount=15|20|25&limit=1..50`
  - `PUT /api/player`
  - `DELETE /api/player`
  - `POST /api/records`

### プレイヤー識別

- ログイン不要の匿名player ID + ランダムcredential
- credential本体は端末localStorageに保持し、D1にはSHA-256ハッシュだけを保存
- メールアドレス・SNSアカウントは収集しない
- ランキング閲覧だけではDBにplayer行を作らず、名前登録/変更または記録送信時に作成
- 将来アカウント方式へ引き継げるようplayerを記録所有者として分離

### DB

- `players`: 匿名ID、credential hash、表示名、日時
- `records`: 同一player・同一爆弾数につきランキング対象の最速記録1件
- `submission_log`: 二重送信防止/idempotency、隔離記録
- `rate_limits`: player/ハッシュ化IPシグナル単位の短時間カウンタ
- 記録には色数、タイム、base seed、初手、採用attempt、rule/app version、操作履歴を保持

### V1不正対策

- 全API入力の型・範囲をサーバー側で検証
- 15/20/25 BOMBS、3/4 COLORS以外を拒否
- 表示名はNFC正規化、最大16文字、制御文字と `<` / `>` を拒否
- Seed + accepted attempt + 初手 + 爆弾数 + 色数から盤面を決定論的に再生成
- 初手開封とopen/flag/Chordの操作履歴をproduction game coreで再生し、CLEAR成立を検証
- 爆弾ヒット、未CLEAR、CLEAR後操作、不正な時系列、異なるrule/app versionを拒否
- V1閾値未満の異常に短いタイムは通常ランキングへ載せず隔離
- 記録送信の二重実行をsubmission IDで冪等化
- D1-backed rate limitをplayerとハッシュ化IPシグナルに適用。生IPはDBへ保存しない
- DB秘密鍵/管理者権限はブラウザへ公開しない
- Workers FreeのCPU制限を優先し、V1の記録送信時には重いSolver/条件Cの再判定は実行しない。条件Cは製品クライアント生成時に担保し、サーバー側の完全な採用経路証明は将来強化とする

### 将来強化

- サーバー発行のone-time run ticket
- サーバー側の開始時刻/期限
- signed board metadataまたはより強い盤面適格性検証
- 匿名playerから任意アカウントへの移行
- 必要に応じCloudflare Rate Limiting binding等へ強化

### プライバシー/削除

- メールアドレス等は不要
- 匿名IDは記録所有・自己順位・二重送信防止・不正対策に使用
- `DELETE /api/player` で認証済み匿名playerとオンライン記録を削除可能
- 将来のプライバシーポリシーへ匿名識別子、プレイ検証データ、ハッシュ化ネットワークシグナル、保存/削除、Cloudflare利用を記載する

## 検証

main基準は74 tests。Draft PR #30でランキング検証テストを追加し、現在は **77 tests**。

PR #30のCI:
- `npm run typecheck`
- `npm test`（77 tests）
- `npm run test:api`（Wrangler + local D1を実起動するAPI smoke test）
- `npm run build`

API smoke testでは以下を確認する。
- 15 / 20 / 25 BOMBS取得
- 3色/4色混在
- タイム昇順
- 自分の順位
- 名前変更反映
- 不正部門拒否
- 未認証/不正値送信拒否

Cloudflare Previewでも以下の実通信確認を自動実行する。
- `/api/health`
- 15 / 20 / 25 BOMBSランキング取得
- preview D1への匿名player作成
- preview D1からの匿名player削除

主要viewport: 320×480 / 320×568 / 375×667 / 390×844。オンライン化によるランキング画面の実機レイアウトはCloudflare Previewでユーザー確認してからmainへマージする。

## Cloudflareセットアップ状況

- GitHub ActionsのCloudflare API tokenへD1 Edit権限追加済み
- production D1 `multicolor-sweeper-ranking` 作成済み（APAC）
- preview D1 `multicolor-sweeper-ranking-preview` 作成済み（APAC）
- production / previewのdatabase IDを設定済み
- preview D1へmigration適用済み
- Preview Workerがpreview D1を参照していることをdeploy logで確認済み
- Preview実API smoke test成功済み
- production D1 migrationはmainデプロイ時にdeploy workflowが自動適用する
- Preview alias: `https://pr-30-multicolor-sweeper.jibunnha.workers.dev`
- 実画面確認前にはPR #30をmainへマージしない

## 既存の確定事項

- 製品版の採用フィルタは条件C
- 条件C / No-Guess / Seed / attempt / generation ms は通常UIに表示しない
- タイマーはWorker生成完了・初手開封後に開始
- Chordは旗総数判定
- 旗の設置本数は爆弾総数で制限しない
- 3色は ↖赤 / ↗青 / ↙緑 / ↑無色、↘未使用
- 4色は ↖赤 / ↗青 / ↙緑 / ↘黄 / ↑無色
- 色の定義は `rules.ts` の `COLORS` が唯一の出処
- ページ全体を100dvhに固定し、盤面は9×9正方形を維持
- 爆弾・旗・矢印はSVG/ピクセルアートで保持

## 残課題 / 次の順序

1. PR #30 Cloudflare Previewでオンライン登録/取得と主要viewportを実画面確認
2. 問題なければPR #30をmainへマージ
3. mainデプロイでproduction D1 migration + Worker deployを確認
4. iPhone / Android実機・アクセシビリティ最終QA

別系統: エンドレスモード / 広告 / カスタムドメイン / hanage-hub紹介ページ / Daily Challenge。
