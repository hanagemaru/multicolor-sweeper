# Online Ranking V1

## Architecture

- Frontend: existing React/Vite PWA
- API: same Cloudflare Worker as Static Assets, `/api/*` only
- Database: Cloudflare D1
- Player identity: anonymous local player ID + random credential; no email/SNS login
- Display name: stored locally and in `players`; can be changed from settings/ranking
- Ranking categories: 15 / 20 / 25 BOMBS. 3-color and 4-color records share each category.

## Data

`players`
- `player_id`
- SHA-256 hash of anonymous credential
- display name
- timestamps

`records`
- one verified best record per player and bomb-count category
- color count, time, base seed, first click, accepted attempt
- rule/app version
- action history
- verification status

`submission_log`
- idempotency key and response snapshot for duplicate-submit protection
- suspicious submissions are recorded here but not placed in rankings

`rate_limits`
- short-lived counters by anonymous player and hashed client-IP signal
- raw IP addresses are not stored

## API

- `GET /api/health`
- `GET /api/rankings?mineCount=15|20|25&limit=1..50`
- `PUT /api/player`
- `DELETE /api/player`
- `POST /api/records`

All writes require `Authorization: Bearer <playerId>.<credential>`.

## V1 verification

The server validates all fields and then:

1. Recreates the selected candidate from base seed, first click and accepted attempt.
2. Confirms the candidate still satisfies product filter C.
3. Selects the submitted 3-color or 4-color board.
4. Replays the first reveal and every submitted open/flag operation with the production game core.
5. Rejects a replay that hits a mine, does not clear, contains actions after clear, has impossible coordinates/order/timing, or uses another rule version.
6. Quarantines an otherwise valid clear below the conservative V1 suspicious-time threshold instead of publishing it.

This verifies clear成立 and board reproducibility, but it does not make a modified client impossible. A future V2 should add a server-issued one-time run ticket and server-side start timestamp.

## Rate limiting

V1 uses D1-backed one-minute counters:
- per anonymous player: 12 record submissions/minute
- per hashed IP signal: 40 record submissions/minute

This avoids exposing DB credentials to the browser and works without a paid third-party service. A future deployment can replace/augment this with Cloudflare Workers Rate Limiting bindings.

## Failure behavior

Ranking fetch, name update and record submit failures are isolated from gameplay. Board generation, result review, RETRY and MENU do not depend on the API.

## Privacy / deletion

No email address or social identity is collected. The anonymous identifier is used for best-record ownership, rank lookup, duplicate prevention and abuse control. `DELETE /api/player` deletes the authenticated player and online records. The future privacy policy should disclose anonymous identifiers, gameplay/verification data, hashed anti-abuse network signals, retention, deletion requests and Cloudflare processing.

## Deployment

Use separate production and preview D1 databases:
- `multicolor-sweeper-ranking`
- `multicolor-sweeper-ranking-preview`

PR previews must use the preview database so manual test records never enter production rankings. Apply `migrations/0001_ranking.sql` before using the API.
