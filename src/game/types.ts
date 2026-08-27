export type ColorCount = 3 | 4;
export type MineCount = 15 | 20 | 25;
export type MineColor = 0 | 1 | 2 | 3;
export type FlagColor = MineColor | "neutral";
export type CellState = "hidden" | "revealed" | "exploded";

export interface Coordinate {
  row: number;
  col: number;
}

export interface Cell extends Coordinate {
  state: CellState;
  flag: FlagColor | null;
  mineColor: MineColor | null;
  adjacentCounts: number[];
}

export interface Board {
  colorCount: ColorCount;
  mineCount: number;
  seed: string;
  generated: boolean;
  firstClick: Coordinate | null;
  cells: Cell[][];
}

export type RevealResult =
  | { type: "noop"; cells: Cell[] }
  | { type: "mine"; cells: Cell[] }
  | { type: "reveal"; cells: Cell[] };

export type Filter = "A" | "B" | "C" | "D";
export type SolverMode = "color" | "mono";

export interface SolverStats {
  reasoningRounds: number;
  propagationPasses: number;
  deductions: number;
  safeDeductions: number;
  mineDeductions: number;
  revealedCells: number;
  subsetDifferenceUses: number;
  ruleUsage: Record<string, number>;
}

export interface Evidence {
  clues: Coordinate[];
  cells: Coordinate[];
  target: number;
}

export interface TraceDeduction {
  cell: Coordinate;
  before: number;
  after: number;
  result: string;
  rule: string;
  predicate: string;
  evidence: Evidence;
}

export interface RevealedClue extends Coordinate {
  clue: number[];
}

export type TraceStep =
  | {
      type: "initial-reveal";
      firstClick: Coordinate;
      revealed: RevealedClue[];
    }
  | {
      type: "reasoning-round";
      round: number;
      visibleBefore: number;
      deductions: TraceDeduction[];
      propagationPasses: number;
      ruleUsage: Record<string, number>;
      revealed: RevealedClue[];
      visibleAfter: number;
    };

export interface SolverResult {
  status: "solved" | "stalled";
  noGuess: boolean;
  stallReason: "no-logical-move" | null;
  mode: SolverMode;
  stats: SolverStats;
  trace?: TraceStep[];
  finalDomains?: number[];
}

export interface CandidateFlags {
  A: boolean;
  B: boolean;
  C: boolean;
  D: boolean;
}

export interface Candidate {
  baseSeed: string;
  attempt: number;
  seed: string;
  firstClick: Coordinate;
  mineCount: number;
  board3: Board;
  board4: Board | null;
  results: {
    three: SolverResult;
    four: SolverResult | null;
    mono: SolverResult | null;
  };
  flags: CandidateFlags;
}

export interface GenerateOptions {
  baseSeed: string;
  filter?: Filter;
  maxAttempts?: number;
  mineCount: MineCount;
  firstRow: number;
  firstCol: number;
  includeTrace?: boolean;
}

export interface GenerateSuccess extends Candidate {
  elapsedMs: number;
  attempts: number;
}

export interface GenerateFailure {
  baseSeed: string;
  filter: Filter;
  firstClick: Coordinate;
  mineCount: MineCount;
  attempts: number;
  elapsedMs: number;
  failed: true;
}

export type GenerateResult = GenerateSuccess | GenerateFailure;
