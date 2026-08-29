import { activeMineColors, COLORS, GRID_SIZE, isColorCount, NEUTRAL_FLAG_HEX } from "./rules";
import type {
  Board,
  Cell,
  ColorCount,
  FlagColor,
  MineColor,
  RevealResult
} from "./types";

const DIRECTIONS = [
  [-1, -1], [-1, 0], [-1, 1],
  [0, -1],            [0, 1],
  [1, -1],   [1, 0],  [1, 1]
] as const;

function assertCoordinate(row: number, col: number): void {
  if (!Number.isInteger(row) || !Number.isInteger(col) || row < 0 || row >= GRID_SIZE || col < 0 || col >= GRID_SIZE) {
    throw new Error("row and col must be valid board coordinates");
  }
}

export function hashSeed(value: unknown): number {
  let hash = 2166136261;
  const text = String(value);
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function createRandom(seed: string): () => number {
  let state = hashSeed(seed) || 0x6d2b79f5;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle<T>(items: readonly T[], random: () => number): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const other = Math.floor(random() * (index + 1));
    [result[index], result[other]] = [result[other], result[index]];
  }
  return result;
}

export function createEmptyBoard(
  colorCount: ColorCount = 4,
  mineCount = 25,
  seed = ""
): Board {
  return {
    colorCount,
    mineCount,
    seed,
    generated: false,
    firstClick: null,
    cells: Array.from({ length: GRID_SIZE }, (_, row) =>
      Array.from({ length: GRID_SIZE }, (_, col): Cell => ({
        row,
        col,
        state: "hidden",
        flag: null,
        mineColor: null,
        adjacentCounts: Array<number>(colorCount).fill(0)
      }))
    )
  };
}

export function cloneBoard(board: Board): Board {
  return {
    ...board,
    firstClick: board.firstClick ? { ...board.firstClick } : null,
    cells: board.cells.map((row) => row.map((cell) => ({
      ...cell,
      adjacentCounts: [...cell.adjacentCounts]
    })))
  };
}

export function getAdjacentCells(board: Board, row: number, col: number): Cell[] {
  return DIRECTIONS
    .map(([rowOffset, colOffset]) => [row + rowOffset, col + colOffset] as const)
    .filter(([nextRow, nextCol]) =>
      nextRow >= 0 && nextRow < GRID_SIZE && nextCol >= 0 && nextCol < GRID_SIZE
    )
    .map(([nextRow, nextCol]) => board.cells[nextRow][nextCol]);
}

export function getFirstClickExclusions(row: number, col: number): Set<number> {
  assertCoordinate(row, col);
  const excluded = new Set<number>();
  for (let rowOffset = -1; rowOffset <= 1; rowOffset += 1) {
    for (let colOffset = -1; colOffset <= 1; colOffset += 1) {
      const nextRow = row + rowOffset;
      const nextCol = col + colOffset;
      if (nextRow >= 0 && nextRow < GRID_SIZE && nextCol >= 0 && nextCol < GRID_SIZE) {
        excluded.add(nextRow * GRID_SIZE + nextCol);
      }
    }
  }
  return excluded;
}

export function recomputeAdjacentCounts(board: Board): Board {
  for (const row of board.cells) {
    for (const cell of row) {
      const counts = Array<number>(board.colorCount).fill(0);
      for (const adjacent of getAdjacentCells(board, cell.row, cell.col)) {
        if (adjacent.mineColor !== null) counts[adjacent.mineColor] += 1;
      }
      cell.adjacentCounts = counts;
    }
  }
  return board;
}

export interface GenerateBoardOptions {
  seed: string;
  mineCount: number;
  colorCount: ColorCount;
  firstRow: number;
  firstCol: number;
}

export function generateBoard({
  seed,
  mineCount,
  colorCount,
  firstRow,
  firstCol
}: GenerateBoardOptions): Board {
  if (!isColorCount(colorCount)) throw new Error("colorCount must be 3 or 4");
  if (!Number.isInteger(mineCount) || mineCount < 1 || mineCount > 40) {
    throw new Error("mineCount must be between 1 and 40");
  }
  assertCoordinate(firstRow, firstCol);

  const board = createEmptyBoard(colorCount, mineCount, seed);
  board.generated = true;
  board.firstClick = { row: firstRow, col: firstCol };

  const excluded = getFirstClickExclusions(firstRow, firstCol);
  const candidates = Array.from({ length: GRID_SIZE * GRID_SIZE }, (_, index) => index)
    .filter((index) => !excluded.has(index));
  const positionOrder = shuffle(
    candidates,
    createRandom(`${seed}|position|${firstRow},${firstCol}`)
  );
  const minePositions = positionOrder.slice(0, mineCount);

  const colors = activeMineColors(colorCount);
  const colorBag = Array.from({ length: mineCount }, (_, index) => colors[index % colorCount]);
  const colorOrder = shuffle(
    colorBag,
    createRandom(`${seed}|color|${colorCount}|${mineCount}|${firstRow},${firstCol}`)
  );

  minePositions.forEach((position, index) => {
    const row = Math.floor(position / GRID_SIZE);
    const col = position % GRID_SIZE;
    board.cells[row][col].mineColor = colorOrder[index];
  });
  return recomputeAdjacentCounts(board);
}

export function totalAdjacent(cell: Cell): number {
  return cell.adjacentCounts.reduce((sum, count) => sum + count, 0);
}

export function revealCell(board: Board, row: number, col: number): RevealResult {
  const cell = board.cells[row][col];
  if (cell.state !== "hidden" || cell.flag !== null) return { type: "noop", cells: [] };

  if (cell.mineColor !== null) {
    cell.state = "exploded";
    return { type: "mine", cells: [cell] };
  }

  const revealed: Cell[] = [];
  const queue: Cell[] = [cell];
  const visited = new Set<string>();
  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) break;
    const key = `${current.row},${current.col}`;
    if (visited.has(key)) continue;
    visited.add(key);
    if (current.state !== "hidden" || current.flag !== null || current.mineColor !== null) continue;
    current.state = "revealed";
    revealed.push(current);
    if (totalAdjacent(current) === 0) {
      queue.push(...getAdjacentCells(board, current.row, current.col));
    }
  }
  return { type: "reveal", cells: revealed };
}

export function setFlag(board: Board, row: number, col: number, flag: FlagColor): void {
  const cell = board.cells[row][col];
  if (cell.state !== "hidden") return;
  cell.flag = cell.flag === flag ? null : flag;
}

export function canChord(board: Board, row: number, col: number): boolean {
  const cell = board.cells[row][col];
  if (cell.state !== "revealed") return false;
  const adjacent = getAdjacentCells(board, row, col);
  const flags = adjacent.map((item) => item.flag).filter((flag) => flag !== null);
  if (flags.length !== totalAdjacent(cell)) return false;

  const coloredFlagCounts = Array<number>(board.colorCount).fill(0);
  for (const flag of flags) {
    if (flag !== "neutral") {
      if (flag >= board.colorCount) return false;
      coloredFlagCounts[flag] += 1;
    }
  }
  return coloredFlagCounts.every((count, color) => count <= cell.adjacentCounts[color]);
}

export function chordCell(board: Board, row: number, col: number): RevealResult {
  if (!canChord(board, row, col)) return { type: "noop", cells: [] };
  const changed: Cell[] = [];
  let exploded = false;
  for (const adjacent of getAdjacentCells(board, row, col)) {
    if (adjacent.state !== "hidden" || adjacent.flag !== null) continue;
    const result = revealCell(board, adjacent.row, adjacent.col);
    changed.push(...result.cells);
    if (result.type === "mine") exploded = true;
  }
  return { type: exploded ? "mine" : "reveal", cells: changed };
}

export function clearFlag(board: Board, row: number, col: number): void {
  const cell = board.cells[row][col];
  if (cell.state === "hidden") cell.flag = null;
}

export function checkWin(board: Board): boolean {
  return board.cells.flat().every((cell) => cell.mineColor !== null || cell.state === "revealed");
}

export function countFlags(board: Board): number {
  return board.cells.flat().filter((cell) => cell.flag !== null).length;
}

export function revealedSafeCount(board: Board): number {
  return board.cells.flat().filter((cell) => cell.mineColor === null && cell.state === "revealed").length;
}

export function minePositions(board: Board): number[] {
  return board.cells.flat()
    .filter((cell) => cell.mineColor !== null)
    .map((cell) => cell.row * GRID_SIZE + cell.col)
    .sort((left, right) => left - right);
}

export function mineColorCounts(board: Board): number[] {
  const counts = Array<number>(board.colorCount).fill(0);
  for (const cell of board.cells.flat()) {
    if (cell.mineColor !== null) counts[cell.mineColor] += 1;
  }
  return counts;
}

// 決着後の答え合わせで、そのマスに何を描くか。
// 盤面データは書き換えず、描画側だけで答え合わせを表現するための判定。
export type ReviewMark =
  | "mine"
  | "mine-wrong-color"
  | "correct-flag"
  | "wrong-flag"
  | null;

export function reviewMark(cell: Cell): ReviewMark {
  if (cell.state !== "hidden") return null;
  if (cell.mineColor !== null) {
    // 無色旗は色を当てたわけではないので、正解扱いにはしない。
    if (cell.flag === cell.mineColor) return "correct-flag";
    // 爆弾があること自体は当てていて色だけ外した場合、旗を消してしまうと
    // 何色で間違えたのかが分からなくなるので、爆弾とは別の印にする。
    return cell.flag !== null ? "mine-wrong-color" : "mine";
  }
  return cell.flag !== null ? "wrong-flag" : null;
}

export function flagColorHex(flag: FlagColor): string {
  if (flag === "neutral") return NEUTRAL_FLAG_HEX;
  return COLORS[flag as MineColor].hex;
}
