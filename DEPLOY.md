# デプロイ手順

配信先は **Cloudflare Workers（Static Assets）**、公開URLは `https://mcsweeper.hanage.app/`。

`wrangler.jsonc` に Worker スクリプトは無く、ビルド成果物 `dist/` をそのまま配る静的アセット専用の構成にしている。

## 初回セットアップ

Cloudflareアカウントがまだ無い場合は、この順で進める。

1. Cloudflareに登録する（無料プランで足りる）
2. `hanage.app` をCloudflareに追加する
   - サブドメイン `mcsweeper.hanage.app` だけを使う段階では、既存DNSのまま該当サブドメインのCNAMEをWorkerへ向ける形でも動く
   - ただしapex（`hanage.app` 自体）をCloudflareに載せる段階では、ネームサーバーごとCloudflareへ移す必要がある。他プロダクトも移すなら最初からゾーンごと移したほうが後戻りが少ない
3. ローカルから初回デプロイする

   ```
   npm ci
   npm run build
   npx wrangler login
   npm run deploy
   ```

4. Cloudflareダッシュボードの Workers & Pages → `multicolor-sweeper` → Settings → Domains & Routes で
   カスタムドメイン `mcsweeper.hanage.app` を追加する

## 以降のデプロイ

```
npm run build
npm run deploy
```

## GitHub Actionsからの自動デプロイ

`.github/workflows/deploy.yml` を用意してあるが、既定では動かない。有効化するには次の2つを設定する。

- リポジトリ変数 `CLOUDFLARE_DEPLOY` を `true` にする
- リポジトリシークレット `CLOUDFLARE_API_TOKEN` に、Workers の編集権限を持つAPIトークンを登録する
- リポジトリシークレット `CLOUDFLARE_ACCOUNT_ID` にアカウントIDを登録する

変数が未設定の間はデプロイジョブがスキップされるだけで、CIは落ちない。

## 確認しておくこと

- `dist/manifest.webmanifest` が `application/manifest+json` で返ること（`public/_headers` で指定済み）
- `dist/sw.js` が `Cache-Control: no-cache` で返ること。ここが長期キャッシュされると更新が届かない
- iPhoneでホーム画面に追加し、アイコンが `apple-touch-icon.png` になること
