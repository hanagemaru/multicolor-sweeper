import { describe, expect, it } from "vitest";
import { checkWin, cloneBoard, revealCell } from "../game/game-core";
import { generateNoGuess } from "../game/no-guess-generator";
import type { Board, MineCount } from "../game/types";
import {
  RANKING_APP_VERSION,
  RANKING_RULE_VERSION,
  type RecordedAction,
  type SubmitRecordRequest
} from "../ranking-shared";
import { normalizeDisplayName, validateSubmissionShape, verifySubmission } from "./record-verification";

function makeSolvedSubmission(mineCount: MineCount = 15): SubmitRecordRequest {
  const generated = generateNoGuess({
    baseSeed: `verification-${mineCount}`,
    mineCount,
    firstRow: 4,
    firstCol: 4
  });
  if ("failed" in generated) throw new Error("test board generation failed");

  const board: Board = cloneBoard(generated.board3);
  revealCell(board, 4, 4);
  const actions: RecordedAction[] = [];
  let elapsedMs = 6000;
  for (const cell of board.cells.flat()) {
    if (cell.mineColor !== null || cell.state === "revealed") continue;
    actions.push({ type: "open", row: cell.row, col: cell.col, elapsedMs });
    revealCell(board, cell.row, cell.col);
    if (checkWin(board)) break;
    elapsedMs += 10;
  }
  if (!checkWin(board) || actions.length === 0) throw new Error("test replay did not clear");

  return {
    submissionId: "verification-test-submission",
    displayName: "PLAYER",
    mineCount,
    colorCount: 3,
    timeMs: actions.at(-1)?.elapsedMs ?? 6000,
    baseSeed: generated.baseSeed,
    firstRow: 4,
    firstCol: 4,
    attempt: generated.attempt,
    ruleVersion: RANKING_RULE_VERSION,
    appVersion: RANKING_APP_VERSION,
    actions
  };
}

describe("ranking record verification", () => {
  it("accepts a reproducible clear for each ranking category", () => {
    for (const mineCount of [15, 20, 25] as const) {
      const submission = makeSolvedSubmission(mineCount);
      expect(validateSubmissionShape(submission)).toBe(true);
      expect(verifySubmission(submission)).toEqual({ valid: true, suspicious: false });
    }
  });

  it("rejects a record when replay does not clear", () => {
    const submission = makeSolvedSubmission();
    submission.actions = submission.actions.slice(0, 1);
    submission.timeMs = submission.actions[0].elapsedMs;
    expect(verifySubmission(submission).valid).toBe(false);
  });

  it("rejects a tampered rule version and invalid values", () => {
    const submission = makeSolvedSubmission();
    expect(validateSubmissionShape({ ...submission, ruleVersion: "old-rule" })).toBe(false);
    expect(validateSubmissionShape({ ...submission, mineCount: 30 })).toBe(false);
    expect(validateSubmissionShape({ ...submission, colorCount: 5 })).toBe(false);
  });

  it("quarantines an implausibly short but otherwise valid record", () => {
    const submission = makeSolvedSubmission();
    submission.actions = submission.actions.map((action, index) => ({ ...action, elapsedMs: 1000 + index * 10 }));
    submission.timeMs = submission.actions.at(-1)?.elapsedMs ?? 1000;
    expect(verifySubmission(submission)).toEqual({ valid: true, suspicious: true });
  });

  it("normalizes safe display names and rejects unsafe input", () => {
    expect(normalizeDisplayName("  ＰＬＡＹＥＲ  ")).toBe("ＰＬＡＹＥＲ");
    expect(normalizeDisplayName("<script>")) .toBeNull();
    expect(normalizeDisplayName("A".repeat(17))).toBeNull();
  });
});
