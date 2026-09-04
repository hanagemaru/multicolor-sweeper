import type { MineCount } from "./game/types";
import {
  PLAYER_NAME_MAX_LENGTH,
  type PlayerIdentity,
  type RankingResponse,
  type SubmitRecordRequest,
  type SubmitRecordResponse,
  type UpdatePlayerRequest
} from "./ranking-shared";

export const PLAYER_IDENTITY_STORAGE_KEY = "multicolor-sweeper-player-identity-v1";

function randomHex(bytes: number): string {
  const values = new Uint8Array(bytes);
  crypto.getRandomValues(values);
  return Array.from(values, (value) => value.toString(16).padStart(2, "0")).join("");
}

function makePlayerId(): string {
  return typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${randomHex(16)}-${Date.now().toString(16)}`;
}

export function readOrCreatePlayerIdentity(storage: Storage = window.localStorage): PlayerIdentity {
  try {
    const raw = storage.getItem(PLAYER_IDENTITY_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<PlayerIdentity>;
      if (typeof parsed.playerId === "string" && typeof parsed.credential === "string" && parsed.playerId && parsed.credential) {
        return { playerId: parsed.playerId, credential: parsed.credential };
      }
    }
  } catch {
    // Fall through and create a new in-memory identity.
  }

  const identity = { playerId: makePlayerId(), credential: randomHex(32) };
  try {
    storage.setItem(PLAYER_IDENTITY_STORAGE_KEY, JSON.stringify(identity));
  } catch {
    // The identity still works for the current session.
  }
  return identity;
}

function authHeaders(identity: PlayerIdentity): HeadersInit {
  return {
    Authorization: `Bearer ${identity.playerId}.${identity.credential}`,
    "Content-Type": "application/json"
  };
}

async function readJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let message = `Ranking API request failed (${response.status})`;
    try {
      const body = await response.json() as { error?: string };
      if (body.error) message = body.error;
    } catch {
      // Keep the status based fallback.
    }
    throw new Error(message);
  }
  return response.json() as Promise<T>;
}

export async function fetchRanking(identity: PlayerIdentity, mineCount: MineCount): Promise<RankingResponse> {
  const response = await fetch(`/api/rankings?mineCount=${mineCount}&limit=50`, {
    method: "GET",
    headers: authHeaders(identity),
    cache: "no-store"
  });
  return readJson<RankingResponse>(response);
}

export async function updateOnlinePlayerName(identity: PlayerIdentity, displayName: string): Promise<void> {
  const body: UpdatePlayerRequest = { displayName: displayName.trim().slice(0, PLAYER_NAME_MAX_LENGTH) };
  const response = await fetch("/api/player", {
    method: "PUT",
    headers: authHeaders(identity),
    body: JSON.stringify(body)
  });
  await readJson<{ ok: true }>(response);
}

export async function submitOnlineRecord(
  identity: PlayerIdentity,
  body: SubmitRecordRequest
): Promise<SubmitRecordResponse> {
  const response = await fetch("/api/records", {
    method: "POST",
    headers: authHeaders(identity),
    body: JSON.stringify(body)
  });
  return readJson<SubmitRecordResponse>(response);
}

export async function deleteOnlinePlayer(identity: PlayerIdentity): Promise<void> {
  const response = await fetch("/api/player", {
    method: "DELETE",
    headers: authHeaders(identity)
  });
  await readJson<{ ok: true }>(response);
}
