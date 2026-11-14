// Aggregate-only, read-only usage report for the production Sweeper D1.
// No user/session IDs, scores, names, credentials or per-request rows are printed.
import { execFileSync } from 'node:child_process';

function read(sql) {
  if (!/^\s*(WITH|SELECT)\b/i.test(sql) || /\b(INSERT|UPDATE|DELETE|REPLACE|DROP|ALTER|CREATE|ATTACH|DETACH|PRAGMA)\b/i.test(sql)) {
    throw new Error('Only read-only aggregation SQL is permitted');
  }
  const stdout = execFileSync('npx', [
    'wrangler', 'd1', 'execute', 'multicolor-sweeper-ranking',
    '--remote', '--json', '--config', 'wrangler.jsonc', '--command', sql,
  ], { encoding: 'utf8', timeout: 60_000 });
  const data = JSON.parse(stdout);
  if (!Array.isArray(data) || !data[0]?.success) throw new Error('Remote D1 SELECT failed');
  return data[0].results ?? [];
}

const activity = read(`
WITH base AS (SELECT CAST(strftime('%s', 'now') AS INTEGER)*1000 AS now_ms)
SELECT datetime('now') AS asof_utc,
  (SELECT COUNT(*) FROM gameplay_events, base WHERE event='visit' AND received_at >= now_ms - 7*86400000) AS visits_7d,
  (SELECT COUNT(*) FROM gameplay_events, base WHERE event='visit' AND received_at >= now_ms - 14*86400000 AND received_at < now_ms - 7*86400000) AS visits_previous_7d,
  (SELECT COUNT(*) FROM gameplay_events, base WHERE event='visit' AND received_at >= now_ms - 30*86400000) AS visits_30d,
  (SELECT COUNT(*) FROM gameplay_events, base WHERE event='first_cell_open' AND received_at >= now_ms - 7*86400000) AS starts_7d,
  (SELECT COUNT(*) FROM gameplay_events, base WHERE event='first_cell_open' AND received_at >= now_ms - 14*86400000 AND received_at < now_ms - 7*86400000) AS starts_previous_7d,
  (SELECT COUNT(*) FROM gameplay_events, base WHERE event='first_cell_open' AND received_at >= now_ms - 30*86400000) AS starts_30d,
  (SELECT COUNT(*) FROM gameplay_events WHERE event='visit') AS visits_stored,
  (SELECT MIN(received_at) FROM gameplay_events) AS first_event_ms,
  (SELECT MAX(received_at) FROM gameplay_events) AS last_event_ms
`);

const sources7d = read(`
SELECT source, COUNT(*) AS visits_7d
FROM gameplay_events
WHERE event='visit' AND received_at >= CAST(strftime('%s', 'now') AS INTEGER)*1000 - 7*86400000
GROUP BY source ORDER BY visits_7d DESC, source
`);

const daily = read(`
SELECT date(received_at / 1000, 'unixepoch', '+9 hours') AS day_jst,
  SUM(CASE WHEN event='visit' THEN 1 ELSE 0 END) AS visits,
  SUM(CASE WHEN event='first_cell_open' THEN 1 ELSE 0 END) AS starts
FROM gameplay_events
WHERE received_at >= CAST(strftime('%s','now') AS INTEGER)*1000 - 14*86400000
GROUP BY day_jst ORDER BY day_jst
`);

const rankings = read(`
SELECT
  (SELECT COUNT(*) FROM players) AS registered_player_ids,
  (SELECT COUNT(DISTINCT player_id) FROM records) AS player_ids_with_records,
  (SELECT COUNT(*) FROM records) AS saved_records,
  (SELECT COUNT(DISTINCT player_id) FROM records WHERE updated_at >= datetime('now', '-30 days')) AS ids_with_record_update_30d,
  (SELECT COUNT(DISTINCT player_id) FROM records WHERE updated_at >= datetime('now', '-7 days')) AS ids_with_record_update_7d
`);

console.log('SWEEPER_AGGREGATE_START');
console.log(JSON.stringify({ activity: activity[0], sources_7d: sources7d, daily_jst_14d: daily, rankings: rankings[0] }));
console.log('SWEEPER_AGGREGATE_END');
