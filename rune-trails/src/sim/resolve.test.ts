import { describe, expect, it } from "vitest";
import { createBoard } from "../engine/board";
import { commitConnection } from "../engine/path";
import { statesEqual } from "../engine/serialize";
import { ScriptedHazardSource } from "../sim/hazard";
import { resolveTurn } from "../sim/resolve";
import {
  THREE_BY_THREE_PAIR_1,
  TWO_ROW_PAIR_1,
  TWO_ROW_PAIR_2,
  threeByThreeBoard,
  twoRowBoard,
} from "../testing/boardFixtures";

function thornBoard() {
  return createBoard({
    w: 2,
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
        id: 2,
        element: "water",
        endpoints: [
          { x: 0, y: 2 },
          { x: 1, y: 2 },
        ],
      },
    ],
    terrain: [{ x: 1, y: 1, kind: "thorn" }],
  });
}

describe("turn resolution", () => {
  it("emits connection, then effect, then hazard in order", () => {
    const hazards = new ScriptedHazardSource([
      { kind: "shift-row", row: 1, dx: 1 },
    ]);
    const { events } = resolveTurn(thornBoard(), 1, [0, 1], hazards);
    expect(events.map((event) => event.type)).toEqual([
      "connection",
      "effect",
      "hazard-applied",
    ]);
  });

  it("applies a hazard that preserves solvability", () => {
    const hazards = new ScriptedHazardSource([
      { kind: "shift-row", row: 1, dx: 1 },
    ]);
    const { state, events } = resolveTurn(twoRowBoard(), 1, TWO_ROW_PAIR_1, hazards);
    expect(events.some((event) => event.type === "hazard-applied")).toBe(true);
    expect(state.scriptIndex).toBe(1);
  });

  it("discards a hazard that breaks solvability", () => {
    const hazards = new ScriptedHazardSource([
      { kind: "shift-row", row: 2, dx: -1 },
    ]);
    const board = threeByThreeBoard();
    const { state, events } = resolveTurn(board, 1, THREE_BY_THREE_PAIR_1, hazards);

    const afterConnection = commitConnection(board, 1, THREE_BY_THREE_PAIR_1);
    const rejection = events.find((event) => event.type === "hazard-rejected");
    expect(rejection).toMatchObject({ reason: "unsolvable" });
    // The board retains the post-effect state; only bookkeeping advances.
    expect(state.cells).toEqual(afterConnection.cells);
    expect(state.paths).toEqual(afterConnection.paths);
    expect(state.connected).toEqual(afterConnection.connected);
  });

  it("rejects conservatively when the guard times out", () => {
    const hazards = new ScriptedHazardSource([
      { kind: "shift-row", row: 1, dx: 1 },
    ]);
    const { events } = resolveTurn(twoRowBoard(), 1, TWO_ROW_PAIR_1, hazards, {
      guardBudgetMs: -1,
    });
    const rejection = events.find((event) => event.type === "hazard-rejected");
    expect(rejection).toMatchObject({ reason: "timeout" });
  });

  it("emits a solved event last when the final pair completes", () => {
    const hazards = new ScriptedHazardSource([]);
    const first = resolveTurn(twoRowBoard(), 1, TWO_ROW_PAIR_1, hazards);
    const second = resolveTurn(first.state, 2, TWO_ROW_PAIR_2, hazards);
    expect(second.events[second.events.length - 1].type).toBe("solved");
  });

  it("produces serializable events", () => {
    const hazards = new ScriptedHazardSource([
      { kind: "shift-row", row: 1, dx: 1 },
    ]);
    const { events } = resolveTurn(thornBoard(), 1, [0, 1], hazards);
    const roundTripped = JSON.parse(JSON.stringify(events));
    expect(roundTripped).toEqual(events);
  });

  it("is deterministic for the same inputs", () => {
    const run = () => {
      const hazards = new ScriptedHazardSource([
        { kind: "shift-row", row: 2, dx: -1 },
      ]);
      return resolveTurn(threeByThreeBoard(), 1, THREE_BY_THREE_PAIR_1, hazards);
    };
    const a = run();
    const b = run();
    expect(statesEqual(a.state, b.state)).toBe(true);
    expect(JSON.stringify(a.events)).toBe(JSON.stringify(b.events));
  });

  it("advances the script index exactly once per connection", () => {
    const hazards = new ScriptedHazardSource([]);
    const first = resolveTurn(twoRowBoard(), 1, TWO_ROW_PAIR_1, hazards);
    const second = resolveTurn(first.state, 2, TWO_ROW_PAIR_2, hazards);
    expect(first.state.scriptIndex).toBe(1);
    expect(second.state.scriptIndex).toBe(2);
  });
});
