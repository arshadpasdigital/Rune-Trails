import { describe, expect, it } from "vitest";
import { createBoard } from "../engine/board";
import {
  commitConnection,
  extendTrace,
  isConnectionComplete,
  startTrace,
  validateConnectionPath,
} from "../engine/path";
import {
  threeByThreeBoard,
  TWO_ROW_PAIR_1,
  twoRowBoard,
} from "../testing/boardFixtures";

describe("path tracing", () => {
  it("starts only on an unconnected rune endpoint", () => {
    const board = twoRowBoard();
    expect(startTrace(board, 0)?.pairId).toBe(1);
    expect(startTrace(board, 2)).toBeNull();
    expect(startTrace(board, 99)).toBeNull();
  });

  it("extends along an orthogonal neighbour", () => {
    const board = threeByThreeBoard();
    const trace = startTrace(board, 0)!;
    const next = extendTrace(board, trace, 1);
    expect(next.cells).toEqual([0, 1]);
  });

  it("rejects diagonal moves", () => {
    const board = threeByThreeBoard();
    const trace = startTrace(board, 0)!;
    const next = extendTrace(board, trace, 4);
    expect(next.cells).toEqual([0]);
  });

  it("backtracks over the previous cell", () => {
    const board = threeByThreeBoard();
    let trace = startTrace(board, 0)!;
    trace = extendTrace(board, trace, 1);
    trace = extendTrace(board, trace, 2);
    trace = extendTrace(board, trace, 1);
    expect(trace.cells).toEqual([0, 1]);
  });

  it("rejects entering another pair's rune", () => {
    const board = threeByThreeBoard();
    let trace = startTrace(board, 0)!;
    for (const cell of [1, 2, 5]) trace = extendTrace(board, trace, cell);
    // cell 4 is pair 2's rune
    const rejected = extendTrace(board, trace, 4);
    expect(rejected.cells).toEqual([0, 1, 2, 5]);
  });

  it("rejects blocked terrain", () => {
    const board = createBoard({
      w: 2,
      h: 2,
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
      terrain: [{ x: 1, y: 1, kind: "stone" }],
    });
    let trace = startTrace(board, 0)!;
    trace = extendTrace(board, trace, 2);
    const rejected = extendTrace(board, trace, 3);
    expect(rejected.cells).toEqual([0, 2]);
  });

  it("rejects entering a committed path", () => {
    const board = threeByThreeBoard();
    const committed = commitConnection(board, 1, [0, 1, 2, 5]);
    const trace = startTrace(committed, 4)!;
    let extended = extendTrace(committed, trace, 3);
    const rejected = extendTrace(committed, extended, 0);
    expect(rejected.cells).toEqual([4, 3]);
    extended = rejected;
    expect(extended.cells).toEqual([4, 3]);
  });
});

describe("connection completion", () => {
  it("completes when the trace reaches the matching endpoint", () => {
    const board = twoRowBoard();
    let trace = startTrace(board, 0)!;
    trace = extendTrace(board, trace, 1);
    expect(isConnectionComplete(board, trace)).toBe(true);

    const committed = commitConnection(board, trace.pairId, trace.cells);
    expect(committed.connected).toEqual([1]);
    expect(committed.paths[1]).toEqual([0, 1]);
    expect(committed.cells[0]).toBe("covered");
    expect(committed.cells[1]).toBe("covered");
    expect(committed.moveIndex).toBe(1);
  });

  it("cannot start a trace for a connected pair", () => {
    const board = commitConnection(twoRowBoard(), 1, TWO_ROW_PAIR_1);
    expect(startTrace(board, 0)).toBeNull();
  });

  it("validates endpoints, adjacency, duplicates, and occupancy", () => {
    const board = twoRowBoard();
    expect(validateConnectionPath(board, 1, [0, 1]).ok).toBe(true);
    expect(validateConnectionPath(board, 1, [0]).ok).toBe(false);
    expect(validateConnectionPath(board, 1, [0, 2]).ok).toBe(false);
    expect(validateConnectionPath(board, 1, [0, 1, 0]).ok).toBe(false);
    expect(validateConnectionPath(board, 2, [0, 1]).ok).toBe(false);
  });
});
