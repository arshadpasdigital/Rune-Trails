import { describe, expect, it } from "vitest";
import { createBoard } from "../engine/board";
import { applyMutation, validateMutation } from "../engine/mutations";
import { statesEqual } from "../engine/serialize";
import { MutationRecord } from "../engine/types";

function shiftBoard() {
  return createBoard({
    w: 4,
    h: 2,
    pairs: [
      {
        id: 1,
        element: "fire",
        endpoints: [
          { x: 0, y: 0 },
          { x: 3, y: 1 },
        ],
      },
    ],
    terrain: [
      { x: 1, y: 0, kind: "lava" },
      { x: 2, y: 0, kind: "thorn" },
    ],
  });
}

describe("mutation records", () => {
  it.each<MutationRecord>([
    { kind: "shift-row", row: 0, dx: 1 },
    { kind: "spread", from: { x: 1, y: 0 }, to: { x: 1, y: 1 } },
    { kind: "grow", cell: { x: 3, y: 0 } },
  ])("round-trips %j through JSON", (mutation) => {
    const parsed = JSON.parse(JSON.stringify(mutation)) as MutationRecord;
    expect(parsed).toEqual(mutation);
    const state = shiftBoard();
    const applied = applyMutation(state, mutation);
    const replayed = applyMutation(state, parsed);
    expect(statesEqual(applied, replayed)).toBe(true);
  });

  it("shifts a row by one cell and drops a free edge cell", () => {
    const state = shiftBoard();
    const next = applyMutation(state, { kind: "shift-row", row: 0, dx: 1 });
    expect(next.cells.slice(0, 4)).toEqual(["free", "rune", "lava", "thorn"]);
    expect(next.pairOf[1]).toBe(1);
    expect(next.pairOf[0]).toBe(-1);
  });

  it("is atomic: an illegal shift applies no changes", () => {
    const state = shiftBoard();
    const before = state.cells.slice();
    const illegal: MutationRecord = { kind: "shift-row", row: 0, dx: -1 };
    expect(validateMutation(state, illegal).ok).toBe(false);
    expect(() => applyMutation(state, illegal)).toThrow(/illegal mutation/);
    expect(state.cells).toEqual(before);
  });

  it("spreads terrain onto a free cell", () => {
    const state = shiftBoard();
    const next = applyMutation(state, {
      kind: "spread",
      from: { x: 1, y: 0 },
      to: { x: 1, y: 1 },
    });
    expect(next.cells[5]).toBe("lava");
  });

  it("grows terrain on a free cell", () => {
    const state = shiftBoard();
    const next = applyMutation(state, { kind: "grow", cell: { x: 3, y: 0 } });
    expect(next.cells[3]).toBe("thorn");
  });

  it("rejects out-of-bounds and occupied targets", () => {
    const state = shiftBoard();
    expect(validateMutation(state, { kind: "grow", cell: { x: 9, y: 9 } }).ok).toBe(false);
    expect(validateMutation(state, { kind: "grow", cell: { x: 0, y: 0 } }).ok).toBe(false);
    expect(
      validateMutation(state, {
        kind: "spread",
        from: { x: 1, y: 0 },
        to: { x: 0, y: 0 },
      }).ok,
    ).toBe(false);
  });
});
