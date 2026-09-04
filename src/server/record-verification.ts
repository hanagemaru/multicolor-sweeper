import { canChord, chordCell, revealCell, setFlag } from "../game/game-core";
import { MAX_GENERATION_ATTEMPTS, PRODUCT_FILTER, isColorCount, isMineCount } from "../game/rules";
import { resolveMoveOutcome } from "../game/move-outcome";
import { evaluateCandidate } from "../game/no-guess-generator";
import type { Board } from "../game/types";
import {
  PLAYER_NAME_MAX_LENGTH,
  RANKING_APP_VERSION,
  RANKING_RULE_VERSION,
  type RecordedAction,
  type SubmitRecordRequest
} from "../ranking-shared";

export interface VerificationResult {
  valid: boolean;
  suspicious: boolean;
  reason?: string;
}

const MAX_TIME_MS = 60 * 60 * 1000;
const MIN_TIME_MS = 1000;
const SUSPICIOUS_TIME_MS = 5000;
const MAX_ACTIONS = 1000;
const MAX_BASE_SEED_LENGTH = 160;

export function normalizeDisplayName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.normalize("NFC").trim();
  if (!normalized) return null;
  if (Array.from(normalized).length > PLAYER_NAME_MAX_LENGTH) return null;
  if (/[<>\u0000-\u001f\u007f]/u.test(normalized)) return null;
  return normalized;
}

function isCoordinate(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) >= 0 && Number(value) < 9;
}

function isElapsed(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= MAX_TIME_MS;
}

function validAction(action: unknown): action is RecordedAction {
  if (!action || typeof action !== "object") return false;
  const value = action as Partial<RecordedAction> & { flag?: unknown };
  if ((value.type !== "open" && value.type !== "flag") || !isCoordinate(value.row) || !isCoordinate(value.col) || !isElapsed(value.elapsedMs)) {
    return false;
  }
  if (value.type === "flag") {
    return value.flag === "neutral" || value.flag === 0 || value.flag === 1 || value.flag === 2 || value.flag === 3;
  }
  return true;
}

export function validateSubmissionShape(value: unknown): value is SubmitRecordRequest {
  if (!value || typeof value !== "object") return false;
  const input = value as Partial<SubmitRecordRequest>;
  return typeof input.submissionId === "string"
    && input.submissionId.length >= 8
    && input.submissionId.length <= 100
    && normalizeDisplayName(input.displayName) !== null
    && typeof input.mineCount === "number"
    && isMineCount(input.mineCount)
    && typeof input.colorCount === "number"
    && isColorCount(input.colorCount)
    && Number.isInteger(input.timeMs)
    && input.timeMs >= MIN_TIME_MS
    && input.timeMs <= MAX_TIME_MS
    && typeof input.baseSeed === "string"
    && input.baseSeed.length > 0
    && input.baseSeed.length <= MAX_BASE_SEED_LENGTH
    && isCoordinate(input.firstRow)
    && isCoordinate(input.firstCol)
    && Number.isInteger(input.attempt)
    && Number(input.attempt) >= 0
    && Number(input.attempt) < MAX_GENERATION_ATTEMPTS
    && input.ruleVersion === RANKING_RULE_VERSION
    && input.appVersion === RANKING_APP_VERSION
    && Array.isArray(input.actions)
    && input.actions.length > 0
    && input.actions.length <= MAX_ACTIONS
    && input.actions.every(validAction);
}

function replayAction(board: Board, action: RecordedAction): "continue" | "won" | "lost" {
  if (action.type === "flag") {
    setFlag(board, action.row, action.col, action.flag);
    return resolveMoveOutcome(board, false) === "won" ? "won" : "continue";
  }

  const cell = board.cells[action.row][action.col];
  const result = cell.state === "revealed" && canChord(board, action.row, action.col)
    ? chordCell(board, action.row, action.col)
    : revealCell(board, action.row, action.col);
  if (result.type === "mine") return "lost";
  return resolveMoveOutcome(board, false) === "won" ? "won" : "continue";
}

export function verifySubmission(input: SubmitRecordRequest): VerificationResult {
  if (!validateSubmissionShape(input)) return { valid: false, suspicious: false, reason: "invalid-shape" };

  let previousElapsed = -1;
  for (const action of input.actions) {
    if (action.elapsedMs < previousElapsed || action.elapsedMs > input.timeMs + 250) {
      return { valid: false, suspicious: false, reason: "invalid-action-time" };
    }
    previousElapsed = action.elapsedMs;
  }

  if (Math.abs(input.timeMs - previousElapsed) > 1500) {
    return { valid: false, suspicious: false, reason: "finish-time-mismatch" };
  }

  let candidate;
  try {
    candidate = evaluateCandidate({
      baseSeed: input.baseSeed,
      attempt: input.attempt,
      mineCount: input.mineCount,
      firstRow: input.firstRow,
      firstCol: input.firstCol,
      includeTrace: false
    });
  } catch {
    return { valid: false, suspicious: false, reason: "board-reproduction-failed" };
  }

  if (!candidate.flags[PRODUCT_FILTER]) {
    return { valid: false, suspicious: false, reason: "board-not-product-eligible" };
  }

  const board = input.colorCount === 3 ? candidate.board3 : candidate.board4;
  if (!board) return { valid: false, suspicious: false, reason: "missing-board" };

  const firstReveal = revealCell(board, input.firstRow, input.firstCol);
  if (firstReveal.type === "mine") return { valid: false, suspicious: false, reason: "invalid-first-click" };

  let wonAt = -1;
  for (let index = 0; index < input.actions.length; index += 1) {
    const outcome = replayAction(board, input.actions[index]);
    if (outcome === "lost") return { valid: false, suspicious: false, reason: "replay-hit-mine" };
    if (outcome === "won") {
      wonAt = index;
      break;
    }
  }

  if (wonAt < 0) return { valid: false, suspicious: false, reason: "replay-not-cleared" };
  if (wonAt !== input.actions.length - 1) return { valid: false, suspicious: false, reason: "actions-after-clear" };

  return { valid: true, suspicious: input.timeMs < SUSPICIOUS_TIME_MS };
}
