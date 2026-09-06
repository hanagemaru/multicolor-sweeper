import type { MineCount } from "./game/types";
import type { RankingEntryDto, RankingResponse } from "./ranking-shared";

export const RANKING_PREVIEW_CASES = [1, 11, 12, 127] as const;
export type RankingPreviewCase = (typeof RANKING_PREVIEW_CASES)[number];

const PREVIEW_HOST_PATTERN = /^pr-\d+-multicolor-sweeper\.[a-z0-9-]+\.workers\.dev$/i;
const PREVIEW_RADIUS = 3;

export function readRankingPreviewCase(location: { hostname: string; search: string }): RankingPreviewCase | null {
  if (!PREVIEW_HOST_PATTERN.test(location.hostname)) return null;
  const raw = new URLSearchParams(location.search).get("ranking-test");
  if (raw === null) return null;
  const rank = Number(raw);
  return RANKING_PREVIEW_CASES.includes(rank as RankingPreviewCase) ? rank as RankingPreviewCase : null;
}

function rankRange(start: number, end: number): number[] {
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

export function buildRankingPreviewResponse(playerRank: RankingPreviewCase, mineCount: MineCount): RankingResponse {
  const nearbyStart = Math.max(1, playerRank - PREVIEW_RADIUS);
  const nearbyEnd = playerRank + PREVIEW_RADIUS;
  const ranks = [...new Set([...rankRange(1, 10), ...rankRange(nearbyStart, nearbyEnd)])].sort((a, b) => a - b);

  const entries: RankingEntryDto[] = ranks.map((rank) => {
    const isPlayer = rank === playerRank;
    return {
      rank,
      playerId: isPlayer ? "preview-self" : `preview-${String(rank).padStart(3, "0")}`,
      name: isPlayer ? "YOU" : `PLAYER ${String(rank).padStart(3, "0")}`,
      colorCount: rank % 2 === 0 ? 4 : 3,
      timeMs: 9_000 + rank * 1_000,
      mineCount,
      isPlayer
    };
  });

  const own = entries.find((entry) => entry.isPlayer);
  if (!own) throw new Error("Preview player entry is missing");

  return {
    entries,
    yourRank: playerRank,
    yourBest: { timeMs: own.timeMs, colorCount: own.colorCount }
  };
}
