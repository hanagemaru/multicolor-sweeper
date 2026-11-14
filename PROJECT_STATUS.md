# Project Status

## 2026-11-15: 新URLのiPhone Safari実機確認済み（最新）

- ユーザーが https://hanage.app/games/multicolor-sweeper/ からの「遊ぶ」別タブ起動、新しいゲームのプレイ、ランキング表示が問題ないと報告。
- 新旧URL並行公開・既存D1のランキング共用・新旧URL別の訪問と最初のマス開封計測は2026-11-14に本番検証済み。
- これにより**主要なiPhone Safari利用の確認も完了**。ホーム画面PWAの全条件・Search Consoleによる実インデックス・AdSense審査結果は未確認。
- 以下2026-11-14の「iPhone実機未確認」は当時の履歴。

## 2026-11-14: Multicolor Sweeperをハブ配下に本番公開（最新）

- 新URL **https://hanage.app/games/multicolor-sweeper/play/** を独立Cloudflare Worker`sweeper-hub`で追加。旧URL **https://mcsweeper.hanage.app/** はプレイ・ランキング登録・ホーム画面PWAを維持。
- ハブの紹介ページ `https://hanage.app/games/multicolor-sweeper/` の「遊ぶ」は**新URLを別タブで開く**。新ゲームから「ゲーム紹介へ戻る」は同タブ、「遊び方」は別タブ。
- 新旧で既存D1 `multicolor-sweeper-ranking` の同一ランキング3部門を共用。プレイヤーID・自己ベストはオリジン別、ユーザー操作によるデータ引き継ぎは行わない。
- 計測：**両URLでvisit/first_cell_openが有効**。同一D1の`gameplay_events`に追加した`site_variant`で`legacy`（旧URL）と`hub`（新URL）を識別し、URL別集計が可能。元データはdefault legacyで保持。新URLの合成イベントを記録し、`hub`として保存されることと、合成データ削除を確認済み。
- 新URLのゲーム/PWA/ランキング/計測の本番確認成功：[新Worker Actions](https://github.com/hanagemaru/multicolor-sweeper/actions/runs/43608035207)。
- 旧サイトの新URL案内と旧/新の実ブラウザ導線、旧サイトの計測検証成功：[旧Worker Actions](https://github.com/hanagemaru/multicolor-sweeper/actions/runs/43608605304)。
- ハブのリンク・sitemap・www Sweeper/Putt限定302リダイレクトは本番検証済み：[ハブ Actions](https://github.com/hanagemaru/hanage-hub/actions/runs/43608440293)。
- **未確認:** ユーザーによる新SweeperのiPhone Safari/PWA実機プレイ、Search Consoleでの実インデックスとAdSense審査結果。
- 以下の同日「本番公開前」は当時の検証段階の履歴。**本項が最新**。


最終更新: 2026-09-06

## 2026-11-14: hanage.app配下へのSweeper追加準備（本番公開前）

- Puttと同じ「旧サブドメイン維持・新しいハブ配下URL追加・同一D1ランキング共用・匿名プレイヤーはURLごとに独立」を採用。ユーザーに手動引き継ぎを求めない。
- 旧URL https://mcsweeper.hanage.app/ に影響しない、`SWEEPER_BASE=/games/multicolor-sweeper/play/`専用ビルドを追加。PWAのscope/start_url/アイコンとAPI fetchを配信先パスへ対応。
- `sweeper-hub-preview`は別Workerで、ランキングはプレビュー専用D1、ゲーム計測は無効。現時点のプレビュー：https://sweeper-hub-preview.jibunnha.workers.dev/games/multicolor-sweeper/play/
- 新URLの画面にゲーム紹介へ同タブで戻るリンク、遊び方の別タブリンク。旧サイトは新URL稼働確認後にだけ案内を表示するためのフラグを設けた。
- 旧URL・新URLでゲーム計測が継続するようクライアント/Workerを対応。D1に追加した`site_variant`列で古いアクセス（`legacy`）と新URL（`hub`）を区別。既存イベントは既定値`legacy`で保持し、ユーザー識別情報・実URLは追加保存しない。
- 本番Worker`sweeper-hub`の2つのRouteと既存`multicolor-sweeper-ranking`D1へのバインドをdry-run確認。CIは旧SweeperのDeploy成功後にだけ新Workerを公開する構成。
- プレビューの型チェック・全テスト・ローカルランキングAPI・ビルド・公開HTTP・モバイルブラウザのランキングとリンク確認に成功：[Actions](https://github.com/hanagemaru/multicolor-sweeper/actions/runs/43607401011)。
- **本項執筆時点で本番の新Sweeper URL・ハブリンク・旧Sweeperはまだ変更していない。** 本番公開が完了した場合は、実HTTPのActions証跡とともに本項より上に記録する。

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
- **PR #30でCloudflare Workers + D1の実オンラインランキングを実装済み。Cloudflare Preview・実API smoke test・ユーザー実画面確認まで完了**
- **PR #34で正式公開前の設定・プライバシー導線を実装し、2026-09-05にmainへマージ済み**
- **PR #38で設定導線・見出し階層・共通UIトークン・固定サイズ方針を整理し、2026-09-06にmainへマージ済み**
- **PR #39でランキングを上位10位＋自分の前後3人表示へ拡張し、2026-09-06にmainへマージ済み**
- 2026-09-05にCloudflare APIトークンをD1権限付きで作り直し、`CLOUDFLARE_API_TOKEN` を更新済み。GitHub ActionsのD1 migrationとdeployが成功することを確認（詳細は `DEPLOY.md`）
- **2026-09-05に `mcsweeper.hanage.app` をMulticolor Sweeper Workerへ割り当て、iPhone Safariでゲームが正常に開くことを確認済み。hanage-hub PR #10でゲームリンクも正式URLへ切り替え済み**

## Board First / 既存UI

- プレイ画面は `TIME / FLAGS / PAUSE` の1行HUD
- 難易度・色数は盤面直上に簡潔表示
- `MULTICOLOR SWEEPER` / `TIME ATTACK` はトップメニューだけに表示
- `VIEW BOARD` 後の `RESULT` はHUD右端に表示し、盤面サイズ・位置を維持
- 320×480を含む小画面で主要文字を極端に縮小しない
- PAUSE中はタイマー停止、全81セルを未開封表示へマスクし、盤面操作を無効化
- 日英切替はトップメニュー・設定・ランキングに `日本語 | EN` を表示し端末保存
- 表記は `UI_TERMINOLOGY.md` を正とする
- ボタン高さは `--control-h-lg / -md / -sm / -row / -header`、間隔は `--stack-gap / --action-gap / --option-gap` の共有トークンで揃える（画面ごとの個別値を増やさない）
- 最大の見出しはトップメニューの製品名だけ。設定・ランキングの画面見出しは `--title-screen`、`難易度` / `色数` などのセクション見出しは `--title-sub` を使う
- 日英切替はトップメニュー・設定・ランキングのヘッダー右に置く
- トップメニュー・設定・ランキングのパネルは内容の高さに収め、余白は画面側で上下センターに配置する（プレイ画面のみ全高）
- 余白・ボタン高さ・文字サイズは全機種で1セットの固定値。iOS Safariの実表示高さは iPhone SE系で約475pxしかなく、そこに収まる値（余白20px / 主要ボタン44px）を全機種の基準にする。画面が高い端末はカードの外側の余白が増えるだけで、中身の見た目は変わらない。`max-height` で見た目を切り替えない（実機で意図した余白にならないため）
- 横持ちは設計対象外。プレイ画面だけは盤面が残り高さを使うため `max-height: 600px` で詰める

## ランキング仕様

- 部門は15 / 20 / 25 BOMBSの3部門
- 3色と4色は同一部門へ混在し、`COLORS` / `色数` 列で識別
- 自己ベストも同じ爆弾数なら3色/4色をまたいで比較
- 名前はプレイ開始時に要求しない
- 初回 `SUBMIT TIME` / `タイムを登録` 時、未登録なら名前登録
- 設定・ランキングから名前登録/変更可能
- 自己ベスト更新時だけ登録可能。未更新時はランキング閲覧のみ
- 登録成功時は現在順位を表示し、自己ベスト更新時は約1秒後にランキングへ自動遷移
- ランキング画面は上位10位を基本表示する
- 自分が10位圏外の場合は自分の前後3人も表示する
- 上位10位と自分周辺が重なる/隣接する場合は重複なく連結し、離れている場合だけ `…` を入れる
- 例: 自分が1位なら1〜10位、11位なら1〜14位、12位なら1〜15位、127位なら1〜10位＋`…`＋124〜130位
- 通信失敗時も結果確認、RETRY、MENU、盤面確認を妨げない
- 旧localStorageのモックランキング/保存済みテスト記録はオンラインへ自動送信しない
- 保存済み表示名は引き継ぐ

## PR #30 — Online Ranking V1

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
- `GET /api/rankings` は要求された上位件数に加え、認証済みplayerにverified recordがあれば自分の前後3件を返す。重複順位は除外し、順位順で返す

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
- ハブの公開プライバシーポリシー（`https://hanage.app/privacy/`）へ、匿名識別子、プレイ検証データ、ハッシュ化ネットワークシグナル、保存/削除、Cloudflare利用を記載済み
- ゲームの設定画面から同ポリシーを開く導線と、オンラインデータ削除UIを実装済み

## 検証

PR #30でランキング検証テスト、PR #34で設定・削除フロー、PR #39でランキングの順位ギャップ表示テストを追加済み。

PR #39のCIでは以下すべて成功済み:
- `npm run typecheck`
- `npm test`
- `npm run test:api`
- `npm run build`

API smoke testでは以下を確認済み。
- 15 / 20 / 25 BOMBS取得
- 3色/4色混在
- タイム昇順
- 自分の順位
- 名前変更反映
- 不正部門拒否
- 未認証/不正値送信拒否

Cloudflare Previewでも以下の実通信確認を自動実行し、成功済み。
- `/api/health`
- 15 / 20 / 25 BOMBSランキング取得
- preview D1への匿名player作成
- preview D1からの匿名player削除

主要viewport: 320×480 / 320×568 / 375×667 / 390×844。PR #30 / #34 Previewでユーザー実画面確認済み。

## Cloudflareセットアップ状況

- GitHub ActionsのCloudflare API tokenへD1 Edit権限追加済み
- production D1 `multicolor-sweeper-ranking` 作成済み（APAC）
- preview D1 `multicolor-sweeper-ranking-preview` 作成済み（APAC）
- production / previewのdatabase IDを設定済み
- preview D1へmigration適用済み
- Preview Workerがpreview D1を参照していることをdeploy logで確認済み
- Preview実API smoke test成功済み
- production D1 migrationはmainデプロイ時にdeploy workflowが自動適用する
- 公開Custom Domain: `https://mcsweeper.hanage.app/`（2026-09-05割り当て・iPhone Safari確認済み）
- Worker既定URL: `https://multicolor-sweeper.jibunnha.workers.dev/`
- Preview aliasはPRごとに `https://pr-<番号>-multicolor-sweeper.jibunnha.workers.dev` を使用

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

## 次の確認 / 残課題

1. iPhone / Android実機・アクセシビリティ最終QA
2. 正式公開前にPWAインストール導線・アイコン・起動表示を実機確認する

正式公開後の拡張候補: Effect Labに残してある未採用エフェクトのプリセット選択 / 視認性確認済みの盤面カラーテーマ。

別系統: エンドレスモード / 広告 / hanage-hub紹介ページ / Daily Challenge。広告の共通方針は hanage-hub の `docs/ADVERTISING_POLICY.md`、このゲーム固有の方針は `SPEC.md` を正とする。
## 集客前のアクセス解析（2026-09-20）

- Cloudflare Web Analyticsの読み込みを本番ドメインに限定し、ローカル・プレビュー・録画/検証モードを除外する変更を準備。広告配信は変更しない。
- 本番ビルドはリポジトリ変数 `CF_BEACON_TOKEN` を `VITE_CF_BEACON_TOKEN` に渡す。Cloudflare側で当該ゲームをManual setupで登録したサイトトークンが必要。値をコードへ書かない。
- マージ・本番配信後、通常のゲームURLでビーコン要求とCloudflare管理画面の集計を確認して計測開始とする。トークン未設定なら読み込まない。
- この変更はページ閲覧の計測のみ。プレイ開始・終了・再挑戦・再訪のイベント計測は未実装で、PVをプレイヤー数や継続率と扱わない。

## 共有導線の統一（2026-10-23、プレビュー）

- 結果画面の共有ボタンは日英「結果をシェア」/「SHARE RESULT」の1つへ統一。画像と簡潔な結果文・リンクを渡す。タグ、挑戦文、X専用/コピー/画像保存などの追加ボタンは置かない。
- 非対応・共有エラー時も同じボタンから画像と選択可能な文章を表示。キャンセル時は何も追加表示しない。画像は端末内生成、サーバーアップロードなし。
- 投稿文はゲーム名/条件、結果、リンクの順。プレビューは `?resultPreview=1&lang=ja`（Puttは `tour=beginner` も付与）。実データ・ランキングへサンプルを送信しない。本番は未反映。

## 共有画像のクリア盤面（2026-10-23、プレビュー）

- 実際にクリアした9×9盤面を結果画像に追加。数字はゲームと同じ色・四隅の配置で表示し、旗と未設置/色違いの爆弾は答え合わせの状態で描画する。
- 盤面データを端末内でCanvas描画する。ゲーム状態の変更・盤面アップロード・共有ボタン追加は行わない。
- プレビューは固定サンプル盤面。本番の共有はそのプレイの盤面を使用する。
- 集客分析用の初回セル開封/クリア/ゲームオーバーのイベント送信は依然未実装。ゲーム内部では盤面生成・初手開封完了後にタイマー開始する。

- 4色の共有プレビュー: `?resultPreview=1&lang=ja&colors=4`。色数表示・盤面・共有文・色見本を4色へ揃える。省略時は従来の3色。

## 結果シェア公開・遊び始め計測（2026-10-23）

- 結果シェアはユーザー確認後にPR #53をmainへマージ。本番Deploy成功。PuttもPR #116をマージし本番配信成功。
- 遊び始め計測は別PRでプレビューのみ有効。App表示時の `visit` と、盤面生成成功・初手開封後の `first_cell_open` を記録する。開始ボタン・生成失敗・フラグ操作だけでは開始扱いにしない。
- 訪問分母と開始数は一時的なタブ訪問IDで結ぶ。30分無操作で更新し、同じ訪問での再挑戦・再読込は重複しない。ユーザー数、プレイ回数、翌日再訪率とは異なる。
- 流入元は固定分類、開始時の難易度/色数だけを保存。名前・ランキングID/認証・IP・生URL/Referer・盤面・操作履歴をアプリの計測データへ保存しない。新規受信時に30日超を削除。計測終了時は計測表を削除する。
- フロント・サーバー両方の設定で有効化する。本番は両方無効のまま。プレビューは専用D1を使用し、結果サンプル・Effects Lab等は対象外。
- 後続: 公開プライバシー記載のSweeper適用確認、本番有効化・受信確認。クリア/ゲームオーバー/翌日再訪は今回追加しない。

## 開始計測の本番有効化（2026-10-23）

- ユーザーが最小のポリシー更新と開始計測の全マージ・本番有効化を承認。
- ハブの日英の既存一文をPuttとMulticolor Sweeperの共通記載へ変更。SweeperのDeployは公開済みの両言語を確認してから進む。
- フロントとWorkerの本番設定をproductionへ変更。プレビューは従来どおりpreviewと専用D1。本番の訪問・初回開封の保存と重複排除を自動確認し、合成検証データを削除する。
- 取得項目・ゲーム開始の定義・重複排除・保存期間・画面UIはプレビュー確認済みの仕様から変更しない。
