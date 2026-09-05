# デプロイ手順

配信先は **Cloudflare Workers（Static Assets + `/api/*`）**、公開URLは `https://mcsweeper.hanage.app/` を予定。

**カスタムドメインはまだ割り当てていない。** 現在の配信URLは Worker の既定URL
`https://multicolor-sweeper.jibunnha.workers.dev/`。

Draft PR #30以降は、静的アセット `dist/` の配信に加え、同じWorkerでオンラインランキングAPIを処理し、Cloudflare D1へ記録を保存する。

## ランキング用D1

本番とPR確認を分離する。

- production: `multicolor-sweeper-ranking`
- preview: `multicolor-sweeper-ranking-preview`

PR Previewは必ずpreview DBへ接続し、確認用の名前・タイムをproductionへ混ぜない。

Schema/migrationは `migrations/` で管理する。初回は `0001_ranking.sql` を適用する。

## Cloudflare API token

GitHub ActionsでデプロイとD1 migrationを行うため、`CLOUDFLARE_API_TOKEN` には少なくとも以下が必要。

- Workers Scripts: Edit
- Workers D1: Edit
- 対象Cloudflare accountをAccount Resourcesに含める

2026-09-05に対応済み。旧tokenはD1権限を欠いており `Authentication error [code: 10000]` で失敗していたため、
`Edit Cloudflare Workers` テンプレートに `Account -> D1 -> Edit` を追加した新token
`github-actions-deploy (Workers + D1)` を作成し、Repository Secret `CLOUDFLARE_API_TOKEN` を差し替えた。旧tokenは削除済み。

- Account Resources: 対象Cloudflareアカウントを include 済み
- Zone Resources: All zones from an account
- TTL: 無期限
- `Cloudflare Pages: Edit` も含むため、hanage-hub等をCloudflareへ移す際も同じtokenを使える
- 全プロジェクト共通の1本として運用する（Cloudflareのtokenは個別Worker単位に絞れないため、分けても影響範囲は変わらない）

確認: 2026-09-05のDeploy #35で `Apply production D1 migrations` / `Deploy to Cloudflare Workers` /
`Smoke test production ranking API` がすべて成功。

API token本体はリポジトリやチャットへ書かず、GitHub ActionsのRepository Secret `CLOUDFLARE_API_TOKEN` にだけ保存する。

## 初回セットアップ

1. Cloudflareアカウントと既存Worker `multicolor-sweeper` を確認する
2. `CLOUDFLARE_API_TOKEN` にWorkers Scripts Edit + Workers D1 Editを付与する
3. production / preview D1を作成する
4. 取得したproduction database IDを `wrangler.jsonc` の `database_id` に設定する
5. PR Previewではpreview database IDを使う
6. migrationを適用する
7. `npm ci` → `npm run typecheck` → `npm test` → `npm run test:api` → `npm run build`
8. Workerへデプロイする
9. PRの場合はCloudflare Preview Versionで実画面確認する
10. カスタムドメインを使う段階で、Cloudflare Workers設定から `mcsweeper.hanage.app` を追加する

### ローカル確認

```
npm ci
npm run typecheck
npm test
npm run test:api
npm run build
```

`npm run test:api` はWrangler + local D1を起動し、migration・ランキング順・3/4色混在・自分の順位・名前変更・不正入力拒否を確認する。本番/preview D1にはアクセスしない。

### D1 migration

production database ID設定後:

```
npx wrangler d1 migrations apply multicolor-sweeper-ranking --remote
```

PR Preview側はpreview用config/database IDを使って同じmigrationを適用する。

## GitHub Actions

### CI

`.github/workflows/ci.yml`

PRおよびmain pushで以下を実行する。

- `npm ci --no-audit`
- `npm run typecheck`
- `npm test`
- `npm run test:api`
- `npm run build`

### PR Preview

`.github/workflows/preview.yml`

- 同一リポジトリ内branchのPRだけ実行する
- productionとは別のpreview D1へmigrationを適用する
- `wrangler versions upload --preview-alias pr-<PR番号>` で本番トラフィックを変更せず確認URLを作る
- GitHub Actions Summaryに通常ゲームと `?effects-lab=1` のURLを出す

D1 preview database IDが未設定の間はPreview jobをスキップし、誤ってproduction DBへ接続しない。

### main deploy

`.github/workflows/deploy.yml`

- リポジトリ変数 `CLOUDFLARE_DEPLOY=true` のときだけ実行する
- Repository Secret:
  - `CLOUDFLARE_API_TOKEN`
  - `CLOUDFLARE_ACCOUNT_ID`
- D1導入後はproduction migrationを適用してからWorkerをdeployする

## カスタムドメイン

`hanage.app` のCloudflareゾーン化は2026-09-05に完了済み（Freeプラン、status: Active）。
レジストラはお名前.comのままで、ネームサーバーだけ `cecelia.ns.cloudflare.com` / `dean.ns.cloudflare.com` へ変更した。
残る作業は `mcsweeper.hanage.app` のカスタムドメイン割り当てのみ。

- Workersのカスタムドメインは対象ゾーンがCloudflare上で有効になっている必要がある
- 既存の `hanage.app` のDNSレコードがある場合はCloudflare側へ移設して維持する
- Workers & Pages → `multicolor-sweeper` → Settings → Domains & Routes から `mcsweeper.hanage.app` を追加する（未実施）

## デプロイ後の確認

- `/api/health` が200を返す
- 15 / 20 / 25 BOMBSのランキング取得
- 3色/4色が同じ部門へ混在
- 名前登録/変更、記録登録、自分の順位
- API失敗時もゲーム/結果確認/RETRYが使える
- `dist/manifest.webmanifest` が `application/manifest+json`
- `dist/sw.js` が `Cache-Control: no-cache`
- iPhoneでホーム画面追加時に `apple-touch-icon.png` が使われる
- 320×480 / 320×568 / 375×667 / 390×844でランキングを含む主要画面が崩れない
