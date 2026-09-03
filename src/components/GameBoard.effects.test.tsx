import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { createEmptyBoard } from "../game/game-core";
import { GameBoard } from "./GameBoard";

const board = createEmptyBoard(3, 20, "effects-test");
const noOp = vi.fn();

describe("selected product effects", () => {
  it("renders the cinematic explosion across all cells with 28 particles", () => {
    board.cells[4][4].state = "exploded";
    board.cells[4][4].mineColor = 0;
    const html = renderToStaticMarkup(
      <GameBoard
        board={board}
        language="ja"
        interactive={false}
        review={false}
        awaitingFirst={false}
        outcomeEffect={{
          id: 1,
          type: "explosion",
          origin: { row: 4, col: 4 },
          variant: "cinematic"
        }}
        onOpen={noOp}
        onFlag={noOp}
      />
    );

    expect(html).toContain("board-exploding-cinematic");
    expect(html.match(/cell-cinematic-blast/g)).toHaveLength(81);
    expect(html.match(/--cinematic-particle-angle/g)).toHaveLength(28);
  });

  it("renders SUPER CLEAR only when its outcome variant is selected", () => {
    const html = renderToStaticMarkup(
      <GameBoard
        board={board}
        language="ja"
        interactive={false}
        review={false}
        awaitingFirst={false}
        outcomeEffect={{ id: 2, type: "clear", variant: "super" }}
        onOpen={noOp}
        onFlag={noOp}
      />
    );

    expect(html).toContain("board-clearing-super");
    expect(html.match(/cell-clear-super/g)).toHaveLength(81);
    expect(html).toContain("super-clear-overlay");
    expect(html.match(/--super-spark-angle/g)).toHaveLength(16);
  });
});
