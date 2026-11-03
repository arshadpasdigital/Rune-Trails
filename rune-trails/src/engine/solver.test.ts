import { describe, expect, it } from "vitest";
import { solve } from "../engine/solver";
import { commitConnection } from "../engine/path";
import {
  THREE_BY_THREE_PAIR_1,
  threeByThreeBoard,
  twoRowBoard,
  unsolvableBoard,
} from "../testing/boardFixtures";

describe("solver", () => {
  it("finds a solution for fully partitionable boards", () => {
    expect(solve(threeByThreeBoard(), 5000).status).toBe("solvable");
    expect(solve(twoRowBoard(), 5000).status).toBe("solvable");
  });

  it("reports unsolvable when a free cell can never be reached", () => {
    expect(solve(unsolvableBoard(), 5000).status).toBe("unsolvable");
  });

  it("keeps a state solvable after a connection", () => {
    const board = commitConnection(threeByThreeBoard(), 1, THREE_BY_THREE_PAIR_1);
    expect(solve(board, 5000).status).toBe("solvable");
  });

  it("reports timeout when the budget is already exhausted", () => {
    const result = solve(threeByThreeBoard(), -1);
    expect(result.status).toBe("timeout");
  });
});
