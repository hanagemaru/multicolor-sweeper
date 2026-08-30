# UI Roadmap

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
