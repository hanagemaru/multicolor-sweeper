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
export const AUTO_RANKING_DELAY_MS = 1000;

export function destinationAfterSuccessfulSubmit(newBest: boolean): "ranking" | "result" {
  return newBest ? "ranking" : "result";
}

export function bestRecordStorageKey(mineCount: MineCount): string {
  return `${BEST_RECORD_STORAGE_PREFIX}-${mineCount}`;
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
