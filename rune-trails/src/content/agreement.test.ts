import { describe, expect, it } from "vitest";
import { applyMutation, validateMutation } from "../engine/mutations";
import { isSolved } from "../engine/win";
import { solve } from "../engine/solver";
import { parseLevel } from "../content/schema";
import { validateLevel } from "../content/validator";
import { twoRowBoard } from "../testing/boardFixtures";

describe("validator and engine agree", () => {
  it("uses the engine's traversal and coverage rules", () => {
    const doc = {
      id: "agree",
      width: 3,
      height: 1,
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
      hazardScript: [],
    };
    const parsed = parseLevel(doc);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    const result = validateLevel(parsed.level, { budgetMs: 5000 });
    expect(result.ok).toBe(true);
    expect(solve(parsed.level.initialState, 5000).status).toBe("solvable");

    const committed = {
      ...parsed.level.initialState,
      connected: [1],
      paths: { 1: [0, 1] },
      cells: parsed.level.initialState.cells.map((cell, index) =>
        index === 0 || index === 1 ? ("covered" as const) : cell,
      ),
    };
    expect(isSolved(committed)).toBe(true);
  });

  it("applies the same mutation legality as the engine", () => {
    const board = twoRowBoard();
    const illegal = { kind: "grow" as const, cell: { x: 0, y: 0 } };
    expect(validateMutation(board, illegal).ok).toBe(false);
    expect(() => applyMutation(board, illegal)).toThrow();
  });
});
