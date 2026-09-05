# UI Roadmap

最終更新: 2026-09-05

## 情報の優先順位

1. `SPEC.md`: 確定した製品仕様
2. `UI_TERMINOLOGY.md`: 日英UI表記
3. `PROJECT_STATUS.md`: main反映済み内容と進行中PRの状況
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
- 言語切替: トップメニュー / ランキングの `日本語 | EN`、選択保存、`UI_TERMINOLOGY.md` の表記基準
- フォローアップ: 言語切替の横並び安定化、Safari等の左端スワイプ戻る対策、PAUSE/名前登録の冗長説明削減

## 2. 開封・連鎖・爆発・CLEARの演出＋効果音

**状態: DONE — PR #29までmain反映済み**

完了範囲:
- 約140msの通常セル開封ポップ＋黄色い斜めスキャン
- 起点から距離順に開封ポップ込み約300ms以内で広がる連鎖開封
- 13マス以上の大連鎖で盤面全体の小さな追いポップ
- CINEMATIC BLAST
- 通常CLEAR WAVE / 自己ベスト時SUPER CLEAR
- 開封数連動音、旗設置/解除音、Web Audio API効果音
- `prefers-reduced-motion`対応
- `?effects-lab=1` に未採用候補も保持

## 3. 実オンラインランキング

**状態: DONE — PR #30 / Preview・ユーザー確認済み**

採用構成:
- Cloudflare Workers + D1
- 匿名player ID + ランダムcredential + 表示名
- 15 / 20 / 25 BOMBS
- 3色/4色混在
- 同一player・同一爆弾数の最速記録1件

完了範囲:
- 実ランキング取得、自分の順位、名前変更、記録送信
- Seed / first click / accepted attempt / rule/app version / 操作履歴の保存
- Seed+attemptからの盤面再現と操作replayによるCLEAR成立検証
- 不正値拒否、異常に短いタイムの隔離、二重送信防止、レート制限
- 通信失敗をゲーム本体から分離
- production / preview D1分離
- production deploy前のD1 migration自動適用
- Cloudflare API tokenへD1 Edit権限追加
- production / preview D1作成・migration
- Cloudflare Preview発行
- Preview上でhealth、15/20/25ランキング取得、player作成・削除の実API smoke test
- Previewでユーザー実画面確認

次:
- PR #34のCloudflare Previewで公開前設定・プライバシー導線をユーザー確認する

## 4. 公開前の設定・プライバシー導線

**状態: IMPLEMENTED / PREVIEW REVIEW PENDING**

対象:
- `日本語 | EN` はトップメニューに残す
- トップメニュー右上にピクセル調の歯車ボタンを追加する
- 設定画面へプレイヤー名の登録・変更を移す
- hanage-hub側の共通プライバシーポリシー `https://hanage.app/privacy/` へ直接リンクする
- 既存の `DELETE /api/player` を使い、確認付きのオンラインデータ削除を追加する
- 削除成功後は匿名player ID、credential、保存済み表示名を消し、言語設定とローカル自己ベストは残す
- 320×480を含む主要viewportで、トップメニューと設定画面が崩れないことを確認する

## 5. 端末・アクセシビリティ最終QA

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

## その他の主要タスク

- 広告
- エンドレスモード
- Daily Challenge
- カスタムドメイン
- hanage-hub紹介ページ
- 公開後の設定拡張: Effect Labに残したエフェクト候補のプリセット選択
- 公開後の設定拡張: 視認性確認済みの盤面カラーテーマ選択

## 既完了タスク

- P0 操作整合性・viewport固定: PR #7〜#10
- P1-A 用語統一・HUD整理: PR #11、#13
- P1-B 結果表示・100dvh: PR #14
- P1-C 多言語基盤: PR #15、フォローアップ PR #16〜#18
- Board First / PAUSE / ランキングUI / 日英切替: PR #19
- 開封・連鎖・爆発・CLEAR演出＋効果音 / EFFECT LAB: PR #29まで
- 実オンラインランキング / Cloudflare Workers + D1: PR #30
