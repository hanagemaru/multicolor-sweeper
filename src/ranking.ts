import type { ColorCount, MineCount } from "./game/types";

export interface RankingEntry {
  rank?: number;
  name: string;
  colorCount: ColorCount;
  timeMs: number;
  mineCount: MineCount;
  isPlayer?: boolean;
}

const MOCK_RANKINGS: Record<MineCount, readonly Omit<RankingEntry, "mineCount">[]> = {
  15: [
    { name: "NOVA", colorCount: 4, timeMs: 18240 },
    { name: "PIXEL", colorCount: 3, timeMs: 19680 },
    { name: "MINEKO", colorCount: 4, timeMs: 21310 },
    { name: "BLUE", colorCount: 3, timeMs: 22940 },
    { name: "KAI", colorCount: 4, timeMs: 24150 },
    { name: "LIME", colorCount: 3, timeMs: 25620 },
    { name: "DOT", colorCount: 4, timeMs: 26890 }
  ],
  20: [
    { name: "RIN", colorCount: 3, timeMs: 31740 },
    { name: "NOVA", colorCount: 4, timeMs: 32910 },
    { name: "CUBE", colorCount: 3, timeMs: 35180 },
    { name: "MINEKO", colorCount: 4, timeMs: 36880 },
    { name: "AO", colorCount: 3, timeMs: 38220 },
    { name: "DOT", colorCount: 4, timeMs: 40130 },
    { name: "KAI", colorCount: 3, timeMs: 41790 }
  ],
  25: [
    { name: "PIXEL", colorCount: 4, timeMs: 47680 },
    { name: "RIN", colorCount: 3, timeMs: 49330 },
    { name: "NOVA", colorCount: 4, timeMs: 51140 },
    { name: "LIME", colorCount: 3, timeMs: 53870 },
    { name: "MINEKO", colorCount: 4, timeMs: 55720 },
    { name: "CUBE", colorCount: 3, timeMs: 57990 },
    { name: "AO", colorCount: 4, timeMs: 60120 }
  ]
};

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

export function mockRanking(mineCount: MineCount): RankingEntry[] {
  return MOCK_RANKINGS[mineCount].map((entry) => ({ ...entry, mineCount }));
}

export function rankedEntries(entries: readonly RankingEntry[]): RankingEntry[] {
  return [...entries]
    .sort((a, b) => a.timeMs - b.timeMs || a.name.localeCompare(b.name))
    .map((entry, index) => ({ ...entry, rank: index + 1 }));
}

export function rankingWithPlayer(
  mineCount: MineCount,
  playerName: string,
  colorCount: ColorCount,
  timeMs: number | null
): RankingEntry[] {
  const entries = mockRanking(mineCount);
  if (timeMs !== null && playerName.trim()) {
    entries.push({
      name: playerName.trim(),
      colorCount,
      timeMs,
      mineCount,
      isPlayer: true
    });
  }
  return rankedEntries(entries);
}

export function playerRank(entries: readonly RankingEntry[]): number | null {
  return entries.find((entry) => entry.isPlayer)?.rank ?? null;
}
