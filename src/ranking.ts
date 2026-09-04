import type { ColorCount, MineCount } from "./game/types";

export interface RankingEntry {
  rank?: number;
  playerId?: string;
  name: string;
  colorCount: ColorCount;
  timeMs: number;
  mineCount: MineCount;
  isPlayer?: boolean;
}

export const PLAYER_NAME_STORAGE_KEY = "multicolor-sweeper-player-name";
export const BEST_RECORD_STORAGE_PREFIX = "multicolor-sweeper-best";
export const SUBMITTED_RECORD_STORAGE_PREFIX = "multicolor-sweeper-submitted";
export const AUTO_RANKING_DELAY_MS = 1000;
const RECORD_RESET_MARKER_KEY = "multicolor-sweeper-record-reset";
const RECORD_RESET_VERSION = "best-only-v1";

type RecordStorage = Pick<Storage, "getItem" | "removeItem" | "setItem">;

export function canSubmitResult(newBest: boolean): boolean {
  return newBest;
}

export function destinationAfterSuccessfulSubmit(newBest: boolean): "ranking" | "result" {
  return newBest ? "ranking" : "result";
}

export function bestRecordStorageKey(mineCount: MineCount): string {
  return `${BEST_RECORD_STORAGE_PREFIX}-${mineCount}`;
}

export function submittedRecordStorageKey(mineCount: MineCount): string {
  return `${SUBMITTED_RECORD_STORAGE_PREFIX}-${mineCount}`;
}

/**
 * Clears pre-release records once so local bests and submitted records start
 * from the same best-only rule. Player name and language are intentionally kept.
 */
export function resetLegacyTestRecordsOnce(storage: RecordStorage): boolean {
  if (storage.getItem(RECORD_RESET_MARKER_KEY) === RECORD_RESET_VERSION) return false;

  for (const mineCount of [15, 20, 25] as const) {
    storage.removeItem(bestRecordStorageKey(mineCount));
    storage.removeItem(submittedRecordStorageKey(mineCount));
  }
  storage.setItem(RECORD_RESET_MARKER_KEY, RECORD_RESET_VERSION);
  return true;
}

export function rankedEntries(entries: readonly RankingEntry[]): RankingEntry[] {
  return [...entries]
    .sort((a, b) => a.timeMs - b.timeMs || a.name.localeCompare(b.name))
    .map((entry, index) => ({ ...entry, rank: index + 1 }));
}

export function playerRank(entries: readonly RankingEntry[]): number | null {
  return entries.find((entry) => entry.isPlayer)?.rank ?? null;
}
