import { describe, expect, it } from "vitest";
import { ScriptedHazardSource } from "../sim/hazard";
import { twoRowBoard } from "../testing/boardFixtures";

describe("scripted hazard source", () => {
  it("consumes entries in order and reports exhaustion", () => {
    const script = [
      { kind: "shift-row" as const, row: 0, dx: 1 as const },
      { kind: "grow" as const, cell: { x: 0, y: 1 } },
    ];
    const source = new ScriptedHazardSource(script);
    const board = twoRowBoard();

    expect(source.propose({ ...board, scriptIndex: 0 })).toEqual(script[0]);
    expect(source.propose({ ...board, scriptIndex: 1 })).toEqual(script[1]);
    expect(source.propose({ ...board, scriptIndex: 2 })).toBeNull();
    expect(source.length).toBe(2);
  });

  it("treats out-of-range indices as exhausted", () => {
    const source = new ScriptedHazardSource([]);
    expect(source.propose({ ...twoRowBoard(), scriptIndex: 0 })).toBeNull();
    expect(source.propose({ ...twoRowBoard(), scriptIndex: 99 })).toBeNull();
  });
});
