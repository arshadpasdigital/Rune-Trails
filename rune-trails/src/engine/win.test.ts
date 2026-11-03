import { describe, expect, it } from "vitest";
import { createBoard } from "../engine/board";
import { commitConnection } from "../engine/path";
import { isSolved, uncoveredTraversableCells } from "../engine/win";
import {
  THREE_BY_THREE_PAIR_1,
  THREE_BY_THREE_PAIR_2,
  TWO_ROW_PAIR_1,
  TWO_ROW_PAIR_2,
  threeByThreeBoard,
  twoRowBoard,
} from "../testing/boardFixtures";

describe("win condition", () => {
  it("solves when all pairs are connected and every traversable cell is covered", () => {
    let board = twoRowBoard();
    board = commitConnection(board, 1, TWO_ROW_PAIR_1);
    board = commitConnection(board, 2, TWO_ROW_PAIR_2);
    expect(isSolved(board)).toBe(true);
    expect(uncoveredTraversableCells(board)).toEqual([]);
  });

  it("does not solve with an unconnected pair", () => {
    const board = commitConnection(threeByThreeBoard(), 1, THREE_BY_THREE_PAIR_1);
    expect(isSolved(board)).toBe(false);
  });

  it("does not solve with an uncovered free cell", () => {
    let board = threeByThreeBoard();
    board = commitConnection(board, 1, THREE_BY_THREE_PAIR_1);
    board = commitConnection(board, 2, THREE_BY_THREE_PAIR_2);
    expect(isSolved(board)).toBe(true);

    const tampered = { ...board, cells: board.cells.slice() };
    tampered.cells[4] = "free";
    expect(isSolved(tampered)).toBe(false);
    expect(uncoveredTraversableCells(tampered)).toEqual([4]);
  });

  it("exempts hazard terrain from coverage", () => {
    const board = createBoard({
      w: 3,
      h: 1,
      pairs: [
        {
          id: 1,
          element: "fire",
          endpoints: [
            { x: 0, y: 0 },
            { x: 1, y: 0 },
          ],
        },
      ],
      terrain: [{ x: 2, y: 0, kind: "stone" }],
    });
    const committed = commitConnection(board, 1, [0, 1]);
    expect(isSolved(committed)).toBe(true);
  });
});
