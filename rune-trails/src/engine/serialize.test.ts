import { describe, expect, it } from "vitest";
import { cloneBoard } from "../engine/board";
import { canUndo, createHistory, pushHistory, undo } from "../engine/history";
import {
  deserializeState,
  serializeState,
  statesEqual,
} from "../engine/serialize";
import { commitConnection } from "../engine/path";
import {
  TWO_ROW_PAIR_1,
  TWO_ROW_PAIR_2,
  twoRowBoard,
} from "../testing/boardFixtures";

describe("state serialization", () => {
  it("round-trips through JSON without loss", () => {
    let board = twoRowBoard();
    board = commitConnection(board, 1, TWO_ROW_PAIR_1);
    board = commitConnection(board, 2, TWO_ROW_PAIR_2);

    const json = JSON.parse(JSON.stringify(serializeState(board)));
    const restored = deserializeState(json);
    expect(statesEqual(board, restored)).toBe(true);
    expect(restored.pairOf).toBeInstanceOf(Int16Array);
    expect(restored.element).toBeInstanceOf(Uint8Array);
  });

  it("does not share mutable arrays between clones", () => {
    const board = twoRowBoard();
    const clone = cloneBoard(board);
    clone.cells[0] = "free";
    clone.connected.push(1);
    expect(board.cells[0]).toBe("rune");
    expect(board.connected).toEqual([]);
  });
});

describe("undo history", () => {
  it("is disabled on an empty history and undo is a no-op", () => {
    const history = createHistory(twoRowBoard());
    expect(canUndo(history)).toBe(false);
    const undone = undo(history);
    expect(undone).toBe(history);
    expect(statesEqual(undone.current, history.current)).toBe(true);
  });

  it("restores the exact pre-action state", () => {
    const initial = twoRowBoard();
    const history = createHistory(initial);
    const committed = commitConnection(history.current, 1, TWO_ROW_PAIR_1);
    const afterCommit = pushHistory(history, committed);

    expect(canUndo(afterCommit)).toBe(true);
    const undone = undo(afterCommit);
    expect(statesEqual(undone.current, initial)).toBe(true);
    expect(canUndo(undone)).toBe(false);
  });
});
