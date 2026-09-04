import { isMineCount } from "../game/rules";
import type { ColorCount, MineCount } from "../game/types";
import {
  RANKING_PAGE_LIMIT,
  type RankingEntryDto,
  type RankingResponse,
  type SubmitRecordRequest,
  type SubmitRecordResponse,
  type UpdatePlayerRequest
} from "../ranking-shared";
import { normalizeDisplayName, validateSubmissionShape, verifySubmission } from "./record-verification";

interface D1Result<T = unknown> {
  results?: T[];
  success?: boolean;
  meta?: { changes?: number };
}

interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<D1Result<T>>;
  run<T = unknown>(): Promise<D1Result<T>>;
}

interface D1Database {
  prepare(query: string): D1PreparedStatement;
  batch(statements: D1PreparedStatement[]): Promise<D1Result[]>;
}

interface Env {
  DB: D1Database;
}

interface AuthIdentity {
  playerId: string;
  credentialHash: string;
}

interface PlayerRow {
  player_id: string;
  credential_hash: string;
  display_name: string | null;
}

interface RecordRow {
  player_id: string;
  mine_count: MineCount;
  color_count: ColorCount;
  time_ms: number;
  updated_at: string;
}

const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store"
};
const MAX_BODY_BYTES = 120_000;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

function error(message: string, status = 400): Response {
  return json({ error: message }, status);
}

async function sha256(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function readAuth(request: Request): Promise<AuthIdentity | null> {
  const header = request.headers.get("Authorization");
  if (!header?.startsWith("Bearer ")) return null;
  const token = header.slice(7);
  const separator = token.indexOf(".");
  if (separator <= 0 || separator === token.length - 1) return null;
  const playerId = token.slice(0, separator);
  const credential = token.slice(separator + 1);
  if (playerId.length > 80 || credential.length < 32 || credential.length > 256) return null;
  return { playerId, credentialHash: await sha256(credential) };
}

async function requireAuth(request: Request): Promise<AuthIdentity | Response> {
  const auth = await readAuth(request);
  return auth ?? error("Authentication required", 401);
}

async function findAuthenticatedPlayer(
  db: D1Database,
  auth: AuthIdentity
): Promise<PlayerRow | null | Response> {
  const existing = await db.prepare(
    "SELECT player_id, credential_hash, display_name FROM players WHERE player_id = ?"
  ).bind(auth.playerId).first<PlayerRow>();
  if (existing && existing.credential_hash !== auth.credentialHash) return error("Invalid player credential", 401);
  return existing;
}

async function ensurePlayer(db: D1Database, auth: AuthIdentity, displayName: string): Promise<PlayerRow | Response> {
  const existing = await findAuthenticatedPlayer(db, auth);
  if (existing instanceof Response) return existing;
  if (existing) {
    if (existing.display_name !== displayName) {
      await db.prepare(
        "UPDATE players SET display_name = ?, updated_at = CURRENT_TIMESTAMP WHERE player_id = ?"
      ).bind(displayName, auth.playerId).run();
      return { ...existing, display_name: displayName };
    }
    return existing;
  }

  await db.prepare(
    "INSERT INTO players (player_id, credential_hash, display_name) VALUES (?, ?, ?)"
  ).bind(auth.playerId, auth.credentialHash, displayName).run();
  return { player_id: auth.playerId, credential_hash: auth.credentialHash, display_name: displayName };
}

async function consumeRateLimit(db: D1Database, key: string, limit: number, windowSeconds: number): Promise<boolean> {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const windowStart = nowSeconds - (nowSeconds % windowSeconds);
  await db.prepare(
    `INSERT INTO rate_limits (rate_key, window_start, count)
     VALUES (?, ?, 1)
     ON CONFLICT(rate_key, window_start) DO UPDATE SET count = count + 1`
  ).bind(key, windowStart).run();
  const row = await db.prepare(
    "SELECT count FROM rate_limits WHERE rate_key = ? AND window_start = ?"
  ).bind(key, windowStart).first<{ count: number }>();
  return (row?.count ?? limit + 1) <= limit;
}

async function allowWrite(
  request: Request,
  db: D1Database,
  auth: AuthIdentity,
  playerLimit: number,
  ipLimit: number
): Promise<boolean> {
  const ip = request.headers.get("CF-Connecting-IP") ?? "local";
  const ipKey = `ip:${await sha256(ip)}`;
  if (!await consumeRateLimit(db, ipKey, ipLimit, 60)) return false;
  return consumeRateLimit(db, `player:${auth.playerId}`, playerLimit, 60);
}

async function rankForPlayer(db: D1Database, mineCount: MineCount, playerId: string): Promise<number | null> {
  const row = await db.prepare(
    `WITH ranked AS (
       SELECT player_id,
              ROW_NUMBER() OVER (ORDER BY time_ms ASC, updated_at ASC, player_id ASC) AS rank
       FROM records
       WHERE mine_count = ? AND verification_status = 'verified'
     )
     SELECT rank FROM ranked WHERE player_id = ?`
  ).bind(mineCount, playerId).first<{ rank: number }>();
  return row?.rank ?? null;
}

async function handleRanking(request: Request, env: Env, url: URL): Promise<Response> {
  const parsedMineCount = Number(url.searchParams.get("mineCount"));
  if (!isMineCount(parsedMineCount)) return error("Invalid mineCount");
  const mineCount = parsedMineCount;
  const requestedLimit = Number(url.searchParams.get("limit") ?? RANKING_PAGE_LIMIT);
  const limit = Number.isInteger(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), RANKING_PAGE_LIMIT) : RANKING_PAGE_LIMIT;

  const authHeader = request.headers.get("Authorization");
  const auth = authHeader ? await readAuth(request) : null;
  if (authHeader && !auth) return error("Invalid player credential", 401);
  if (auth) {
    const player = await findAuthenticatedPlayer(env.DB, auth);
    if (player instanceof Response) return player;
  }

  const rows = await env.DB.prepare(
    `WITH ranked AS (
       SELECT r.player_id, p.display_name, r.mine_count, r.color_count, r.time_ms,
              ROW_NUMBER() OVER (ORDER BY r.time_ms ASC, r.updated_at ASC, r.player_id ASC) AS rank
       FROM records r
       JOIN players p ON p.player_id = r.player_id
       WHERE r.mine_count = ? AND r.verification_status = 'verified'
     )
     SELECT player_id, display_name, mine_count, color_count, time_ms, rank
     FROM ranked
     ORDER BY rank ASC
     LIMIT ?`
  ).bind(mineCount, limit).all<{
    player_id: string;
    display_name: string | null;
    mine_count: MineCount;
    color_count: ColorCount;
    time_ms: number;
    rank: number;
  }>();

  const entries: RankingEntryDto[] = (rows.results ?? []).map((row) => ({
    rank: row.rank,
    playerId: row.player_id,
    name: row.display_name ?? "PLAYER",
    mineCount: row.mine_count,
    colorCount: row.color_count,
    timeMs: row.time_ms,
    isPlayer: auth?.playerId === row.player_id
  }));

  let yourRank: number | null = null;
  let yourBest: RankingResponse["yourBest"] = null;
  if (auth) {
    yourRank = await rankForPlayer(env.DB, mineCount, auth.playerId);
    const own = await env.DB.prepare(
      "SELECT time_ms, color_count FROM records WHERE player_id = ? AND mine_count = ? AND verification_status = 'verified'"
    ).bind(auth.playerId, mineCount).first<{ time_ms: number; color_count: ColorCount }>();
    if (own) yourBest = { timeMs: own.time_ms, colorCount: own.color_count };
  }

  return json({ entries, yourRank, yourBest } satisfies RankingResponse);
}

async function handleUpdatePlayer(request: Request, env: Env): Promise<Response> {
  const auth = await requireAuth(request);
  if (auth instanceof Response) return auth;
  if (!await allowWrite(request, env.DB, auth, 10, 20)) return error("Too many updates", 429);

  let body: UpdatePlayerRequest;
  try {
    body = await request.json() as UpdatePlayerRequest;
  } catch {
    return error("Invalid JSON");
  }
  const displayName = normalizeDisplayName(body.displayName);
  if (!displayName) return error("Invalid display name");
  const player = await ensurePlayer(env.DB, auth, displayName);
  if (player instanceof Response) return player;
  return json({ ok: true });
}

async function handleDeletePlayer(request: Request, env: Env): Promise<Response> {
  const auth = await requireAuth(request);
  if (auth instanceof Response) return auth;
  if (!await allowWrite(request, env.DB, auth, 4, 12)) return error("Too many updates", 429);
  const player = await findAuthenticatedPlayer(env.DB, auth);
  if (player instanceof Response) return player;
  if (!player) return json({ ok: true });

  await env.DB.batch([
    env.DB.prepare("DELETE FROM submission_log WHERE player_id = ?").bind(auth.playerId),
    env.DB.prepare("DELETE FROM records WHERE player_id = ?").bind(auth.playerId),
    env.DB.prepare("DELETE FROM players WHERE player_id = ?").bind(auth.playerId)
  ]);
  return json({ ok: true });
}

async function handleSubmit(request: Request, env: Env): Promise<Response> {
  const contentLength = Number(request.headers.get("Content-Length") ?? 0);
  if (contentLength > MAX_BODY_BYTES) return error("Request too large", 413);
  const auth = await requireAuth(request);
  if (auth instanceof Response) return auth;
  if (!await allowWrite(request, env.DB, auth, 12, 40)) return error("Too many submissions", 429);

  let body: SubmitRecordRequest;
  try {
    body = await request.json() as SubmitRecordRequest;
  } catch {
    return error("Invalid JSON");
  }
  if (!validateSubmissionShape(body)) return error("Invalid record data");
  const displayName = normalizeDisplayName(body.displayName);
  if (!displayName) return error("Invalid display name");

  const player = await ensurePlayer(env.DB, auth, displayName);
  if (player instanceof Response) return player;

  const duplicate = await env.DB.prepare(
    "SELECT response_json FROM submission_log WHERE submission_id = ? AND player_id = ?"
  ).bind(body.submissionId, auth.playerId).first<{ response_json: string }>();
  if (duplicate) return json(JSON.parse(duplicate.response_json) as SubmitRecordResponse);

  const verification = verifySubmission(body);
  if (!verification.valid) return error(`Record verification failed: ${verification.reason ?? "unknown"}`, 422);

  if (verification.suspicious) {
    const response: SubmitRecordResponse = { accepted: false, newBest: false, rank: null, status: "suspicious" };
    await env.DB.prepare(
      `INSERT INTO submission_log (submission_id, player_id, mine_count, status, response_json)
       VALUES (?, ?, ?, 'suspicious', ?)`
    ).bind(body.submissionId, auth.playerId, body.mineCount, JSON.stringify(response)).run();
    return json(response, 202);
  }

  const previous = await env.DB.prepare(
    "SELECT player_id, mine_count, color_count, time_ms, updated_at FROM records WHERE player_id = ? AND mine_count = ?"
  ).bind(auth.playerId, body.mineCount).first<RecordRow>();
  const requestedNewBest = previous === null || body.timeMs < previous.time_ms;

  if (requestedNewBest) {
    await env.DB.prepare(
      `INSERT INTO records (
         player_id, mine_count, color_count, time_ms, base_seed, first_row, first_col, attempt,
         rule_version, app_version, actions_json, verification_status, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'verified', CURRENT_TIMESTAMP)
       ON CONFLICT(player_id, mine_count) DO UPDATE SET
         color_count = excluded.color_count,
         time_ms = excluded.time_ms,
         base_seed = excluded.base_seed,
         first_row = excluded.first_row,
         first_col = excluded.first_col,
         attempt = excluded.attempt,
         rule_version = excluded.rule_version,
         app_version = excluded.app_version,
         actions_json = excluded.actions_json,
         verification_status = 'verified',
         updated_at = CURRENT_TIMESTAMP
       WHERE excluded.time_ms < records.time_ms`
    ).bind(
      auth.playerId,
      body.mineCount,
      body.colorCount,
      body.timeMs,
      body.baseSeed,
      body.firstRow,
      body.firstCol,
      body.attempt,
      body.ruleVersion,
      body.appVersion,
      JSON.stringify(body.actions)
    ).run();
  }

  const stored = await env.DB.prepare(
    "SELECT time_ms FROM records WHERE player_id = ? AND mine_count = ?"
  ).bind(auth.playerId, body.mineCount).first<{ time_ms: number }>();
  const newBest = stored?.time_ms === body.timeMs && (previous === null || body.timeMs < previous.time_ms);
  const rank = await rankForPlayer(env.DB, body.mineCount, auth.playerId);
  const response: SubmitRecordResponse = { accepted: true, newBest, rank, status: "verified" };
  await env.DB.prepare(
    `INSERT INTO submission_log (submission_id, player_id, mine_count, status, response_json)
     VALUES (?, ?, ?, 'verified', ?)`
  ).bind(body.submissionId, auth.playerId, body.mineCount, JSON.stringify(response)).run();

  await env.DB.prepare("DELETE FROM rate_limits WHERE window_start < ?")
    .bind(Math.floor(Date.now() / 1000) - 86400)
    .run();
  return json(response);
}

export async function handleRequest(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  if (!url.pathname.startsWith("/api/")) return new Response("Not Found", { status: 404 });
  if (request.method === "GET" && url.pathname === "/api/health") return json({ ok: true });
  if (request.method === "GET" && url.pathname === "/api/rankings") return handleRanking(request, env, url);
  if (request.method === "PUT" && url.pathname === "/api/player") return handleUpdatePlayer(request, env);
  if (request.method === "DELETE" && url.pathname === "/api/player") return handleDeletePlayer(request, env);
  if (request.method === "POST" && url.pathname === "/api/records") return handleSubmit(request, env);
  return error("Not found", 404);
}

export default {
  fetch(request: Request, env: Env): Promise<Response> {
    return handleRequest(request, env);
  }
};
