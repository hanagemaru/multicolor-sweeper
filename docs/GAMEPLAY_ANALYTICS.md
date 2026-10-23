# 遊び始め計測

2026-10-23: ユーザーの本番有効化承認済み。ハブの日英ポリシー公開確認後にproduction設定で配信する。

## 意図

訪問した人が実際に遊び始めたかを調べる。`visit` と `first_cell_open` を一時訪問ごとに1件保存する。開始は最初の盤面生成が成功し初手が開いた直後。スタート押下、生成中、生成失敗は開始にしない。

IDはsessionStorage（利用不能時はページメモリ）。30分の無操作で更新。同一訪問の再挑戦は開始数を増やさない。人の数、全プレイ回数、日をまたぐ継続率は測れない。計測値には通信拒否/失敗や自動アクセスの影響があり、厳密な広告CPAとは扱わない。

## 保存内容・有効範囲

一時訪問ID、イベント、固定分類の流入元、初回開始時の爆弾数/色数、サーバー受信時刻。ランキングの情報・認証・盤面・操作・生URL/UTM/Refererは保存しない。Cookie/Authorization付き要求・余分な項目・不正なOrigin・1024bytes超は拒否。計測は認証のない集計用であり、不正送信を完全に防ぐものではない。

新規受信時に30日超を削除。計測終了時は `DELETE FROM gameplay_events` を実行する。停止して受信がなければ自動削除は走らない。

フロント `VITE_GAMEPLAY_ANALYTICS_MODE` とWorker `GAMEPLAY_ANALYTICS_MODE` の両方が必要。許可する値はpreview/production。本番ビルド・Workerでproductionを有効化。previewはバージョン/PR URLと専用D1に限定。通常画面に計測UIは追加しない。`?lang=ja&utm_source=x&utm_medium=cpc` で広告分類を試せる。結果プレビュー等は除外。

## 集計

```sql
-- 訪問を分母にした開始率。期間は受信時刻（UTC epoch ms）で揃える。
SELECT v.source, COUNT(*) AS visits,
  SUM(CASE WHEN s.session_id IS NOT NULL THEN 1 ELSE 0 END) AS started,
  ROUND(100.0 * SUM(CASE WHEN s.session_id IS NOT NULL THEN 1 ELSE 0 END) / COUNT(*), 1) AS start_percent
FROM gameplay_events v
LEFT JOIN gameplay_events s ON s.session_id=v.session_id AND s.event='first_cell_open'
WHERE v.event='visit' AND v.received_at >= :from_ms AND v.received_at < :to_ms
GROUP BY v.source;
```

Preview workflowは専用D1に合成イベントを送信し、保存・重複排除・順不同・4色設定・30日削除を確認後、その検証用IDのデータを削除する。通常画面はAppを使って実機で開始操作を確認する。

## 本番へ進める条件

ユーザーのプレビュー確認後、ハブの公開プライバシー記載がSweeperの一時訪問ID/開始計測も対象に含むことを確認し、productionの両設定を有効化。専用表移行と受信確認を行う。Deploy workflowが日英ポリシー公開を確認してから配信し、本番D1への保存と重複排除を検証する。検証用データは終了時に削除する。
