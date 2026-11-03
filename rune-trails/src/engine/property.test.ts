import { describe, expect, it } from "vitest";
import {
  areOrthogonallyAdjacent,
  createBoard,
  isBlockedTerrain,
} from "../engine/board";
import { canUndo, createHistory, pushHistory, undo } from "../engine/history";
import { commitConnection } from "../engine/path";
import { statesEqual } from "../engine/serialize";
import { BoardState, PairSpec } from "../engine/types";

function seeded(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

interface Partition {
  board: BoardState;
  paths: { pairId: number; cells: number[] }[];
}

function snakePartition(w: number, h: number, segmentCount: number): Partition {
  const snake: number[] = [];
  for (let y = 0; y < h; y += 1) {
    const row: number[] = [];
    for (let x = 0; x < w; x += 1) row.push(y * w + x);
    if (y % 2 === 1) row.reverse();
    snake.push(...row);
  }

  const size = Math.floor(snake.length / segmentCount);
  const paths: { pairId: number; cells: number[] }[] = [];
  const pairs: PairSpec[] = [];
  let cursor = 0;
  for (let s = 0; s < segmentCount; s += 1) {
    const length = s === segmentCount - 1 ? snake.length - cursor : size;
    const cells = snake.slice(cursor, cursor + length);
    cursor += length;
    const pairId = s + 1;
    const first = cells[0];
    const last = cells[cells.length - 1];
    pairs.push({
      id: pairId,
      element: "fire",
      endpoints: [
        { x: first % w, y: Math.floor(first / w) },
        { x: last % w, y: Math.floor(last / w) },
      ],
    });
    paths.push({ pairId, cells });
  }

  return { board: createBoard({ w, h, pairs }), paths };
}

function assertInvariants(state: BoardState): void {
  const owners = new Map<number, number>();
  for (const [idText, cells] of Object.entries(state.paths)) {
    const pairId = Number(idText);
    for (let i = 0; i < cells.length; i += 1) {
      const cell = cells[i];
      expect(isBlockedTerrain(state.cells[cell])).toBe(false);
      expect(owners.has(cell)).toBe(false);
      owners.set(cell, pairId);
      if (i > 0) {
        expect(areOrthogonallyAdjacent(state.w, cells[i - 1], cell)).toBe(true);
      }
    }
  }
}

describe("engine invariants", () => {
  for (const [w, h, segments] of [
    [3, 3, 2],
    [4, 4, 3],
    [5, 5, 4],
  ] as const) {
    it(`holds for a shuffled ${w}x${h} partition`, () => {
      const random = seeded(w * 31 + h);
      const { board, paths } = snakePartition(w, h, segments);
      const order = paths
        .map((path) => ({ path, key: random() }))
        .sort((a, b) => a.key - b.key)
        .map((entry) => entry.path);

      let history = createHistory(board);
      let state = board;
      for (const { pairId, cells } of order) {
        const previous = state;
        state = commitConnection(state, pairId, cells);
        assertInvariants(state);
        history = pushHistory(history, state);
        expect(canUndo(history)).toBe(true);

        const undone = undo(history);
        expect(statesEqual(undone.current, previous)).toBe(true);
      }

      for (let i = order.length - 1; i >= 0; i -= 1) {
        expect(canUndo(history)).toBe(true);
        history = undo(history);
      }
      expect(statesEqual(history.current, board)).toBe(true);
    });
  }
});
