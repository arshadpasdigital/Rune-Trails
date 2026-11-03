import { CellPoint } from "../engine/types";

export interface BoardLayout {
  originX: number;
  originY: number;
  cellSize: number;
  boardWidth: number;
  boardHeight: number;
  pixelRatio: number;
  cellSizePx: number;
}

/**
 * Fits a `gridW` x `gridH` board into an `areaW` x `areaH` play area using a
 * uniform scale, centering the board. All values are logical units except
 * `cellSizePx`, which accounts for the device pixel ratio.
 */
export function computeLayout(
  gridW: number,
  gridH: number,
  areaW: number,
  areaH: number,
  pixelRatio = 1,
  padding = 0,
): BoardLayout {
  const innerW = Math.max(0, areaW - padding * 2);
  const innerH = Math.max(0, areaH - padding * 2);
  const cellSize = Math.max(0, Math.min(innerW / gridW, innerH / gridH));
  const boardWidth = cellSize * gridW;
  const boardHeight = cellSize * gridH;
  return {
    originX: padding + (innerW - boardWidth) / 2,
    originY: padding + (innerH - boardHeight) / 2,
    cellSize,
    boardWidth,
    boardHeight,
    pixelRatio,
    cellSizePx: cellSize * pixelRatio,
  };
}

export function cellCenter(layout: BoardLayout, x: number, y: number): CellPoint {
  return {
    x: layout.originX + (x + 0.5) * layout.cellSize,
    y: layout.originY + (y + 0.5) * layout.cellSize,
  };
}

/** Maps a pointer position to the board cell that visually contains it. */
export function cellAtPoint(
  layout: BoardLayout,
  gridW: number,
  gridH: number,
  px: number,
  py: number,
): CellPoint | null {
  if (layout.cellSize <= 0) return null;
  const localX = (px - layout.originX) / layout.cellSize;
  const localY = (py - layout.originY) / layout.cellSize;
  if (localX < 0 || localY < 0 || localX >= gridW || localY >= gridH) {
    return null;
  }
  return { x: Math.floor(localX), y: Math.floor(localY) };
}

export function cellIndexAtPoint(
  layout: BoardLayout,
  gridW: number,
  gridH: number,
  px: number,
  py: number,
): number {
  const cell = cellAtPoint(layout, gridW, gridH, px, py);
  if (!cell) return -1;
  return cell.y * gridW + cell.x;
}
