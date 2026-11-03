import { describe, expect, it } from "vitest";
import {
  commitConnection,
  createBoard,
  extendTrace,
  isSolved,
  startTrace,
} from "@/engine";

describe("documented engine example", () => {
  it("produces the stated paths and solved result", () => {
    const board = createBoard({
      w: 3,
      h: 3,
      pairs: [
        {
          id: 1,
          element: "fire",
          endpoints: [
            { x: 0, y: 0 },
            { x: 2, y: 1 },
          ],
        },
        {
          id: 2,
          element: "water",
          endpoints: [
            { x: 1, y: 1 },
            { x: 2, y: 2 },
          ],
        },
      ],
    });

    let trace = startTrace(board, 0)!;
    trace = extendTrace(board, trace, 1);
    trace = extendTrace(board, trace, 2);
    trace = extendTrace(board, trace, 5);

    const afterFirst = commitConnection(board, 1, trace.cells);
    expect(afterFirst.paths[1]).toEqual([0, 1, 2, 5]);
    expect(afterFirst.connected).toEqual([1]);

    const afterSecond = commitConnection(afterFirst, 2, [4, 3, 6, 7, 8]);
    expect(isSolved(afterSecond)).toBe(true);
  });
});
