import { describe, expect, it } from "vitest";
import {
  areOrthogonallyAdjacent,
  cellIndex,
  createBoard,
  elementOf,
  neighborsOf,
  pointOf,
  pairEndpoints,
} from "../engine/board";
import { EngineError } from "../engine/types";

describe("board factory", () => {
  it("exposes dimensions, runes, elements, and terrain", () => {
    const board = createBoard({
      w: 3,
      h: 2,
      pairs: [
        {
          id: 7,
          element: "water",
          endpoints: [
            { x: 0, y: 0 },
            { x: 2, y: 1 },
          ],
        },
      ],
      terrain: [{ x: 1, y: 1, kind: "lava" }],
    });

    expect(board.w).toBe(3);
    expect(board.h).toBe(2);
    expect(board.cells).toHaveLength(6);
    expect(board.cells[0]).toBe("rune");
    expect(board.cells[5]).toBe("rune");
    expect(board.cells[4]).toBe("lava");
    expect(elementOf(board, 0)).toBe("water");
    expect(pairEndpoints(board, 7)).toEqual([0, 5]);
  });

  it("supports every terrain kind", () => {
    const kinds = ["pit", "lava", "thorn", "stone"] as const;
    const board = createBoard({
      w: 6,
      h: 1,
      pairs: [
        {
          id: 1,
          element: "fire",
          endpoints: [
            { x: 0, y: 0 },
            { x: 5, y: 0 },
          ],
        },
      ],
      terrain: kinds.map((kind, x) => ({ x: x + 1, y: 0, kind })),
    });
    expect(board.cells.slice(1, 5)).toEqual([...kinds]);
  });

  it("rejects out-of-bounds rune endpoints", () => {
    expect(() =>
      createBoard({
        w: 3,
        h: 3,
        pairs: [
          {
            id: 1,
            element: "fire",
            endpoints: [
              { x: 0, y: 0 },
              { x: 5, y: 0 },
            ],
          },
        ],
      }),
    ).toThrow(EngineError);
  });

  it("rejects duplicate pair ids", () => {
    expect(() =>
      createBoard({
        w: 3,
        h: 3,
        pairs: [
          {
            id: 1,
            element: "fire",
            endpoints: [
              { x: 0, y: 0 },
              { x: 1, y: 0 },
            ],
          },
          {
            id: 1,
            element: "water",
            endpoints: [
              { x: 2, y: 0 },
              { x: 2, y: 1 },
            ],
          },
        ],
      }),
    ).toThrow(/duplicate pair id/);
  });

  it("returns -1 for out-of-bounds coordinates", () => {
    expect(cellIndex(3, 3, -1, 0)).toBe(-1);
    expect(cellIndex(3, 3, 3, 0)).toBe(-1);
    expect(cellIndex(3, 3, 2, 2)).toBe(8);
  });

  it("maps indices to points and back", () => {
    expect(pointOf(4, 6)).toEqual({ x: 2, y: 1 });
  });

  it("computes orthogonal neighbours and adjacency", () => {
    expect(neighborsOf(3, 3, 4).sort()).toEqual([1, 3, 5, 7]);
    expect(areOrthogonallyAdjacent(3, 4, 5)).toBe(true);
    expect(areOrthogonallyAdjacent(3, 4, 8)).toBe(false);
  });
});
