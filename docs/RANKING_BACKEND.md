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
- per-player idempotency key and response snapshot for duplicate-submit protection
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
Ranking reads may include the same identity so the API can return `YOUR RANK`, but reads never create a player row.

## V1 verification

The server validates all fields and then:

1. Recreates the submitted 3-color or 4-color board deterministically from base seed, accepted attempt, bomb count and first click.
2. Applies the first reveal with the production game core.
3. Replays every submitted open/flag operation, including Chord behavior.
4. Rejects a replay that hits a mine, does not clear, contains actions after clear, has impossible coordinates/order/timing, or uses another rule/app version.
5. Quarantines an otherwise valid clear below the conservative V1 suspicious-time threshold instead of publishing it.

The production client selects only product-filter-C boards before play. V1 does **not** rerun the full Solver/filter-C evaluation inside the score-submit Worker, because Workers Free has a tight per-request CPU budget and the ranking API must remain usable on the free tier. The V1 server therefore verifies board reproducibility and CLEAR成立, but cannot prove that a modified client originally selected the board through the product generator.

A future V2 should add a server-issued one-time run ticket/server timestamp and, if needed, stronger server-side eligibility verification or pre-issued signed board metadata.

## Rate limiting

V1 uses D1-backed one-minute counters. The raw IP address is never written to D1; only a SHA-256-derived key is used.

- record submit: 12/minute per anonymous player, 40/minute per hashed IP signal
- name update: 10/minute per anonymous player, 20/minute per hashed IP signal
- deletion: 4/minute per anonymous player, 12/minute per hashed IP signal

This works without a paid third-party service. A future deployment can replace/augment the D1 counters with Cloudflare Workers Rate Limiting bindings.

## Failure behavior

Ranking fetch, name update and record submit failures are isolated from gameplay. Board generation, result review, RETRY and MENU do not depend on the API. A failed submit keeps the result visible and can be retried with the same idempotency key.

## Privacy / deletion

No email address or social identity is collected. The anonymous identifier is used for best-record ownership, rank lookup, duplicate prevention and abuse control. `DELETE /api/player` deletes the authenticated player and online records. The future privacy policy should disclose anonymous identifiers, gameplay/verification data, hashed anti-abuse network signals, retention, deletion requests and Cloudflare processing.

## Deployment

Use separate production and preview D1 databases:
- `multicolor-sweeper-ranking`
- `multicolor-sweeper-ranking-preview`

PR previews must use the preview database so manual test records never enter production rankings. Apply `migrations/0001_ranking.sql` before using the API.

The GitHub Actions Cloudflare API token must include D1 edit permission in addition to the existing Workers deployment permission.
