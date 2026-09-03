# EFFECT LAB

演出候補を通常ゲームへ採用する前に、同じ9×9盤面で比較するための開発用ページ。

## 開き方

通常のURL末尾へ `?effects-lab=1` を付ける。

例: `https://example.com/?effects-lab=1`

通常ゲームとURLを共用するが、ラボ本体のJavaScript/CSSはラボを開いたときだけ遅延読み込みされる。選択内容は保存せず、通常ゲームの演出・ロジック・ランキングには影響しない。

同一リポジトリ内のPull Requestでは、GitHub ActionsがCloudflare Preview Versionをアップロードする。本番トラフィックは変更せず、ActionsのSummaryにEFFECT LABへのリンクを表示する。

## 比較できる内容

### OPEN

- 開封数: 1 / 2 / 3 / 5 / 10 / 25マス
- 1〜4マス: 開いた数と同じ回数の短い音
- 5マス以上: 最大6回の短い上昇連打へ圧縮し、最後を2〜3音重ねて規模を表現
- 光: 現行の全面光 / フレーム / 斜めスキャン / ピクセル十字 / 二重スクエア

### EXPLOSION

- A / PIXEL BURST: 現行方向の短い爆発
- B / CINEMATIC BLAST: 一瞬暗く静まる高音の予兆後、強い衝撃で盤面全体が吹き飛ぶ
- C / SHOCKWAVE: 盤面を残し、中心から二重の衝撃波を走らせる

### CLEAR

- A / CLEAR WAVE: 現行方向の左上→右下ウェーブ
- B / VICTORY BOARD: 両端から中央へ寄る波、枠、スパーク、厚い終止音
- C / SUPER CLEAR: 中心から全セルが弾け、光条と大きな終止和音へつなぐ

### 連続比較

光・爆発・CLEARを系列ごとに連続再生できる。`RANDOM`は全候補から1つ、`STOP / RESET`は予約済みの連続再生を停止する。

## 実装上の扱い

- 音は外部素材を使わずWeb Audio APIで生成
- アニメーションはCSSのみで、比較用コードは `src/effects-lab/` に分離
- `prefers-reduced-motion: reduce` では移動・点滅をほぼ即時表示へ短縮
- ラボは候補比較用。製品版へ採用する種類・強度・ランダム比率は触感確認後に決める
