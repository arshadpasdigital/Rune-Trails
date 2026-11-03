import { describe, expect, it } from "vitest";
import { createBoard } from "../engine/board";
import { BoardState } from "../engine/types";
import { applyElementEffect } from "../sim/effects";

function boardWithTerrain(
  kind: "thorn" | "lava" | "pit",
  element: "fire" | "water" | "earth",
): { state: BoardState; path: number[] } {
  const state = createBoard({
    w: 3,
    h: 2,
    pairs: [
      {
        id: 1,
        element,
        endpoints: [
          { x: 0, y: 0 },
          { x: 0, y: 1 },
        ],
      },
    ],
    terrain: [{ x: 1, y: 1, kind }],
  });
  return { state, path: [0, 3] };
}

describe("element effects", () => {
  it("fire converts an adjacent thorn to free", () => {
    const { state, path } = boardWithTerrain("thorn", "fire");
    const result = applyElementEffect(state, "fire", path);
    expect(result.state.cells[4]).toBe("free");
    expect(result.events).toEqual([
      {
        type: "effect",
        element: "fire",
        effect: "convert",
        cell: 4,
        from: "thorn",
        to: "free",
      },
    ]);
  });

  it("water converts an adjacent lava to stone", () => {
    const { state, path } = boardWithTerrain("lava", "water");
    const result = applyElementEffect(state, "water", path);
    expect(result.state.cells[4]).toBe("stone");
    expect(result.events[0]).toMatchObject({ from: "lava", to: "stone" });
  });

  it("earth converts an adjacent pit to free", () => {
    const { state, path } = boardWithTerrain("pit", "earth");
    const result = applyElementEffect(state, "earth", path);
    expect(result.state.cells[4]).toBe("free");
    expect(result.events[0]).toMatchObject({ from: "pit", to: "free" });
  });

  it("air pushes an adjacent unconnected endpoint into a free cell", () => {
    const state = createBoard({
      w: 3,
      h: 3,
      pairs: [
        {
          id: 1,
          element: "air",
          endpoints: [
            { x: 0, y: 0 },
            { x: 0, y: 1 },
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
    const result = applyElementEffect(state, "air", [0, 3]);
    expect(result.events).toHaveLength(1);
    expect(result.events[0]).toMatchObject({
      type: "effect",
      element: "air",
      effect: "push",
      cell: 4,
      movedTo: 1,
      clearedTrace: true,
    });
    expect(result.state.cells[4]).toBe("free");
    expect(result.state.cells[1]).toBe("rune");
    expect(result.state.pairOf[1]).toBe(2);
    expect(result.state.pairOf[4]).toBe(-1);
  });

  it("never alters a cell committed to a path", () => {
    const { state, path } = boardWithTerrain("thorn", "fire");
    const tampered: BoardState = {
      ...state,
      cells: state.cells.slice(),
      paths: { ...state.paths, 9: [1] },
    };
    tampered.cells[1] = "thorn";
    const result = applyElementEffect(tampered, "fire", path);
    // The adjacent thorn at cell 1 belongs to a committed path and is skipped,
    // while the other adjacent thorn at cell 4 is still converted.
    expect(result.state.cells[1]).toBe("thorn");
    expect(result.events.some((event) => event.cell === 1)).toBe(false);
  });

  it("does nothing when no eligible cell is adjacent", () => {
    const { state, path } = boardWithTerrain("thorn", "fire");
    const clean = { ...state, cells: state.cells.slice() };
    clean.cells[4] = "free";
    const result = applyElementEffect(clean, "fire", path);
    expect(result.state.cells).toEqual(clean.cells);
    expect(result.events).toEqual([]);
  });
});
