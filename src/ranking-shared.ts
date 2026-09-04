import type { ColorCount, FlagColor, MineCount } from "./game/types";

export const RANKING_RULE_VERSION = "time-attack-c-v1";
export const RANKING_APP_VERSION = "2026-09-ranking-v1";
export const RANKING_PAGE_LIMIT = 50;
export const PLAYER_NAME_MAX_LENGTH = 16;

export interface PlayerIdentity {
  playerId: string;
  credential: string;
}

export type RecordedAction =
  | { type: "open"; row: number; col: number; elapsedMs: number }
  | { type: "flag"; row: number; col: number; flag: FlagColor; elapsedMs: number };

export interface RankingEntryDto {
  rank: number;
  playerId: string;
  name: string;
  colorCount: ColorCount;
  timeMs: number;
  mineCount: MineCount;
  isPlayer: boolean;
}

export interface RankingResponse {
  entries: RankingEntryDto[];
  yourRank: number | null;
  yourBest: {
    timeMs: number;
    colorCount: ColorCount;
  } | null;
}

export interface UpdatePlayerRequest {
  displayName: string;
}

export interface SubmitRecordRequest {
  submissionId: string;
  displayName: string;
  mineCount: MineCount;
  colorCount: ColorCount;
  timeMs: number;
  baseSeed: string;
  firstRow: number;
  firstCol: number;
  attempt: number;
  ruleVersion: string;
  appVersion: string;
  actions: RecordedAction[];
}

export interface SubmitRecordResponse {
  accepted: boolean;
  newBest: boolean;
  rank: number | null;
  status: "verified" | "suspicious";
}
