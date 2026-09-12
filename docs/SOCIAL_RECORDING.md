# Social gameplay recording

This is a local-only workflow for making short gameplay clips from the real Multicolor Sweeper UI.

The `?social-demo=1` route renders the production `GameBoard` component and replays moves derived by the existing no-guess solver. It does not submit scores or touch ranking APIs.

## One-time setup

Playwright is intentionally not added to the app dependency lockfile because it is only needed for local capture.

```bash
npm install --no-save playwright
npx playwright install chromium
```

## Record

```bash
npm run social:record
```

The recorder starts a local Vite server, warms the demo, records a 390x844 browser session, and writes a WebM file under `social-output/`.

Useful options:

```bash
npm run social:record -- --duration 12000 --speed 170 --seed post-001
npm run social:record -- --output social-output/post-001.webm
```

- `--duration`: maximum recording time in milliseconds (default `14000`)
- `--speed`: delay between solver actions in milliseconds (default `150`)
- `--seed`: deterministic board seed
- `--output`: output WebM path
- `--port`: local Vite port (default `4173`)

The demo page can also be inspected manually while the dev server is running:

```text
http://127.0.0.1:5173/?social-demo=1&seed=post-001&speed=170
```

## Scope

This first version only creates authentic solver-driven gameplay footage. Caption generation and X posting are intentionally separate follow-up steps so the visual output can be reviewed first.
