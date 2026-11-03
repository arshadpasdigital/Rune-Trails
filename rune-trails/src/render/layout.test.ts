import { describe, expect, it } from "vitest";
import {
  cellAtPoint,
  cellCenter,
  cellIndexAtPoint,
  computeLayout,
} from "../render/layout";

describe("board layout", () => {
  it("scales uniformly and centers the board", () => {
    const layout = computeLayout(3, 3, 300, 400);
    expect(layout.cellSize).toBe(100);
    expect(layout.boardWidth).toBe(300);
    expect(layout.boardHeight).toBe(300);
    expect(layout.originX).toBe(0);
    expect(layout.originY).toBe(50);
  });

  it("fits a wide area without distortion", () => {
    const layout = computeLayout(3, 3, 500, 300);
    expect(layout.cellSize).toBe(100);
    expect(layout.originX).toBe(100);
    expect(layout.originY).toBe(0);
  });

  it("computes device-pixel cell size", () => {
    const layout = computeLayout(2, 2, 100, 100, 3);
    expect(layout.cellSize).toBe(50);
    expect(layout.cellSizePx).toBe(150);
  });

  it("maps every cell centre back to its own cell", () => {
    const layout = computeLayout(4, 4, 320, 320, 2, 8);
    for (let y = 0; y < 4; y += 1) {
      for (let x = 0; x < 4; x += 1) {
        const centre = cellCenter(layout, x, y);
        expect(cellAtPoint(layout, 4, 4, centre.x, centre.y)).toEqual({ x, y });
        expect(cellIndexAtPoint(layout, 4, 4, centre.x, centre.y)).toBe(y * 4 + x);
      }
    }
  });

  it("returns null outside the board", () => {
    const layout = computeLayout(3, 3, 300, 300);
    expect(cellAtPoint(layout, 3, 3, -1, 10)).toBeNull();
    expect(cellAtPoint(layout, 3, 3, 10, 400)).toBeNull();
    expect(cellAtPoint(layout, 3, 3, 300, 10)).toBeNull();
    expect(cellIndexAtPoint(layout, 3, 3, -1, -1)).toBe(-1);
  });
});
