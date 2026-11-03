import { describe, expect, it } from "vitest";
import { parseLevel } from "../content/schema";
import { enumerateScriptStates, validateLevel } from "../content/validator";
import { validDoc } from "../testing/levelFixtures";

function twoRowDoc(): Record<string, unknown> {
  return {
    id: "two-row",
    width: 2,
    height: 3,
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
        id: 2,
        element: "water",
        endpoints: [
          { x: 0, y: 2 },
          { x: 1, y: 2 },
        ],
      },
    ],
    terrain: [],
    hazardScript: [],
  };
}

function levelOf(doc: Record<string, unknown>) {
  const parsed = parseLevel(doc);
  if (!parsed.ok) throw new Error(JSON.stringify(parsed.errors));
  return parsed.level;
}

describe("level validation", () => {
  it("passes a sustainable level", () => {
    const result = validateLevel(levelOf(validDoc()), { budgetMs: 5000 });
    expect(result.ok).toBe(true);
    expect(result.issues).toEqual([]);
  });

  it("rejects a level whose initial board is unsolvable", () => {
    const doc = validDoc();
    // Two distinct pairs that cannot both cover the remaining cells.
    doc.pairs = [
      {
        id: 1,
        element: "fire",
        endpoints: [
          { x: 0, y: 0 },
          { x: 0, y: 1 },
        ],
      },
    ];
    doc.terrain = [
      { x: 2, y: 1, kind: "stone" },
      { x: 1, y: 2, kind: "stone" },
    ];
    const result = validateLevel(levelOf(doc), { budgetMs: 5000 });
    expect(result.ok).toBe(false);
    expect(result.issues[0].reason).toMatch(/initial board has no solution/);
  });

  it("rejects a level whose hazard strands the board and reports the script index", () => {
    const doc = twoRowDoc();
    doc.hazardScript = [{ kind: "grow", cell: { x: 1, y: 1 } }];
    const result = validateLevel(levelOf(doc), { budgetMs: 5000 });
    expect(result.ok).toBe(false);
    expect(result.issues[0].scriptIndex).toBe(0);
    expect(result.issues[0].reason).toMatch(/leaves free cells unreachable/);
  });

  it("reports a budget-exceeded check as a failure naming the level", () => {
    const level = levelOf(validDoc());
    const result = validateLevel(level, { budgetMs: -1 });
    expect(result.ok).toBe(false);
    expect(result.levelId).toBe("test-3x3");
    expect(result.issues[0].reason).toMatch(/budget/);
  });

  it("enumerates the initial state plus one state per script entry", () => {
    const doc = twoRowDoc();
    doc.hazardScript = [
      { kind: "shift-row", row: 2, dx: -1 },
      { kind: "shift-row", row: 2, dx: 1 },
    ];
    const states = enumerateScriptStates(levelOf(doc));
    expect(states).toHaveLength(3);
    expect(states[0].index).toBe(-1);
    expect(states[2].index).toBe(1);
  });
});
