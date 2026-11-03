import { createBoard, BoardSpec } from "../engine/board";
import { BoardState } from "../engine/types";

/**
 * 2x3 board with two pairs. Row 0 and row 2 hold the pairs, row 1 is free.
 * The intended solution routes pair 1 across the top and pair 2 through the
 * bottom row and the middle row.
 */
export function twoRowSpec(): BoardSpec {
  return {
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
  };
}

export function twoRowBoard(): BoardState {
  return createBoard(twoRowSpec());
}

export const TWO_ROW_PAIR_1 = [0, 1];
export const TWO_ROW_PAIR_2 = [4, 2, 3, 5];

/**
 * 3x3 board fully covered by a snake partition into two pairs.
 * pair 1: 0,1,2,5   pair 2: 4,3,6,7,8
 */
export function threeByThreeSpec(): BoardSpec {
  return {
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
  };
}

export function threeByThreeBoard(): BoardState {
  return createBoard(threeByThreeSpec());
}

export const THREE_BY_THREE_PAIR_1 = [0, 1, 2, 5];
export const THREE_BY_THREE_PAIR_2 = [4, 3, 6, 7, 8];

/** A 3x3 board with an isolated free corner that can never be covered. */
export function unsolvableSpec(): BoardSpec {
  return {
    w: 3,
    h: 3,
    pairs: [
      {
        id: 1,
        element: "fire",
        endpoints: [
          { x: 0, y: 0 },
          { x: 0, y: 1 },
        ],
      },
    ],
    terrain: [
      { x: 2, y: 1, kind: "stone" },
      { x: 1, y: 2, kind: "stone" },
    ],
  };
}

export function unsolvableBoard(): BoardState {
  return createBoard(unsolvableSpec());
}

/** 1x3 strip: a single pair with a thorn in the middle-adjacent cell. */
export function fireThornSpec(): BoardSpec {
  return {
    w: 3,
    h: 2,
    pairs: [
      {
        id: 1,
        element: "fire",
        endpoints: [
          { x: 0, y: 0 },
          { x: 0, y: 1 },
        ],
      },
    ],
    terrain: [{ x: 1, y: 1, kind: "thorn" }],
  };
}
