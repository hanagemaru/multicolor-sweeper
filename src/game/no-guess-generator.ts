import { generateBoard } from "./game-core";
import { MAX_GENERATION_ATTEMPTS, PRODUCT_FILTER } from "./rules";
import { solveBoard } from "./solver";
import type {
  Candidate,
  Filter,
  GenerateFailure,
  GenerateOptions,
  GenerateResult,
  GenerateSuccess,
  MineCount,
  SolverResult
} from "./types";

export const FILTERS: Record<Filter, string> = {
  A: "both-no-guess",
  B: "color-essential",
  C: "four-colors-no-worse",
  D: "four-colors-one-round-better"
};

export function attemptSeed(baseSeed: string, attempt: number): string {
  if (!Number.isInteger(attempt) || attempt < 0) {
    throw new Error("attempt must be a non-negative integer");
  }
  return `${baseSeed}|attempt:${attempt}`;
}

export interface EvaluateCandidateOptions {
  baseSeed: string;
  attempt: number;
  mineCount?: MineCount;
  firstRow: number;
  firstCol: number;
  includeTrace?: boolean;
  shortCircuitOnThreeFailure?: boolean;
}

export function evaluateCandidate({
  baseSeed,
  attempt,
  mineCount = 20,
  firstRow,
  firstCol,
  includeTrace = false,
  shortCircuitOnThreeFailure = false
}: EvaluateCandidateOptions): Candidate {
  const seed = attemptSeed(baseSeed, attempt);
  const common = { seed, mineCount, firstRow, firstCol };
  const board3 = generateBoard({ ...common, colorCount: 3 });
  const three = solveBoard(board3, { includeTrace });
  const board4 = shortCircuitOnThreeFailure && !three.noGuess
    ? null
    : generateBoard({ ...common, colorCount: 4 });
  const four = board4 === null ? null : solveBoard(board4, { includeTrace });
  const bothNoGuess = three.noGuess && four?.noGuess === true;

  let mono: SolverResult | null = null;
  if (bothNoGuess) mono = solveBoard(board3, { mode: "mono", includeTrace });
  const colorEssential = bothNoGuess && mono !== null && !mono.noGuess;
  const rounds3 = three.stats.reasoningRounds;
  const rounds4 = four?.stats.reasoningRounds ?? Number.POSITIVE_INFINITY;

  return {
    baseSeed,
    attempt,
    seed,
    firstClick: { row: firstRow, col: firstCol },
    mineCount,
    board3,
    board4,
    results: { three, four, mono },
    flags: {
      A: bothNoGuess,
      B: colorEssential,
      C: colorEssential && rounds4 <= rounds3,
      D: colorEssential && rounds4 + 1 <= rounds3
    }
  };
}

export function candidateSummary(candidate: Candidate): Omit<Candidate, "board3" | "board4" | "results"> & {
  results: {
    three: Pick<SolverResult, "noGuess" | "status" | "stats">;
    four: Pick<SolverResult, "noGuess" | "status" | "stats"> | null;
    mono: Pick<SolverResult, "noGuess" | "status" | "stats"> | null;
  };
} {
  const summarize = (result: SolverResult | null) => result && ({
    noGuess: result.noGuess,
    status: result.status,
    stats: result.stats
  });
  return {
    baseSeed: candidate.baseSeed,
    attempt: candidate.attempt,
    seed: candidate.seed,
    firstClick: candidate.firstClick,
    mineCount: candidate.mineCount,
    flags: candidate.flags,
    results: {
      three: summarize(candidate.results.three) as Pick<SolverResult, "noGuess" | "status" | "stats">,
      four: summarize(candidate.results.four),
      mono: summarize(candidate.results.mono)
    }
  };
}

export function generateNoGuess({
  baseSeed,
  filter = PRODUCT_FILTER,
  maxAttempts = MAX_GENERATION_ATTEMPTS,
  mineCount,
  firstRow,
  firstCol,
  includeTrace = false
}: GenerateOptions): GenerateResult {
  if (!(filter in FILTERS)) throw new Error(`Unknown filter ${filter}`);
  const startedAt = performance.now();
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const candidate = evaluateCandidate({
      baseSeed,
      attempt,
      mineCount,
      firstRow,
      firstCol,
      includeTrace: false,
      shortCircuitOnThreeFailure: true
    });
    if (!candidate.flags[filter]) continue;

    const accepted = includeTrace
      ? evaluateCandidate({ baseSeed, attempt, mineCount, firstRow, firstCol, includeTrace: true })
      : candidate;
    const success: GenerateSuccess = {
      ...accepted,
      elapsedMs: performance.now() - startedAt,
      attempts: attempt + 1
    };
    return success;
  }

  const failure: GenerateFailure = {
    baseSeed,
    filter,
    firstClick: { row: firstRow, col: firstCol },
    mineCount,
    attempts: maxAttempts,
    elapsedMs: performance.now() - startedAt,
    failed: true
  };
  return failure;
}
