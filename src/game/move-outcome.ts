import { checkWin } from "./game-core";
import type { Board } from "./types";

export type MoveOutcome = "won" | "lost" | null;

export function resolveMoveOutcome(board: Board, hitMine: boolean): MoveOutcome {
  if (hitMine) return "lost";
  return checkWin(board) ? "won" : null;
}
