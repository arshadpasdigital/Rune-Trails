import { describe, expect, it } from "vitest";
import { commitConnection } from "../engine/path";
import { createHistory } from "../engine/history";
import {
  earliestUnsolved,
  hudState,
  isUnlocked,
  nextLevelId,
  recordCompletion,
} from "../state/sessionLogic";
import { TWO_ROW_PAIR_1, twoRowBoard } from "../testing/boardFixtures";

const ids = ["level-01", "level-02", "level-03"];

describe("level ordering", () => {
  it("starts at the first level on a clean install", () => {
    expect(earliestUnsolved(ids, [])).toBe("level-01");
  });

  it("resumes at the earliest unsolved level", () => {
    expect(earliestUnsolved(ids, ["level-01"])).toBe("level-02");
    expect(earliestUnsolved(ids, ["level-01", "level-03"])).toBe("level-02");
  });

  it("replays the last level when everything is solved", () => {
    expect(earliestUnsolved(ids, [...ids])).toBe("level-03");
  });

  it("unlocks the first level and successors of completed levels", () => {
    expect(isUnlocked("level-01", ids, [])).toBe(true);
    expect(isUnlocked("level-02", ids, [])).toBe(false);
    expect(isUnlocked("level-02", ids, ["level-01"])).toBe(true);
    expect(isUnlocked("level-09", ids, [])).toBe(false);
  });

  it("finds the next level", () => {
    expect(nextLevelId(ids, "level-01")).toBe("level-02");
    expect(nextLevelId(ids, "level-03")).toBeNull();
  });

  it("records completion without duplicates", () => {
    expect(recordCompletion([], "level-01")).toEqual(["level-01"]);
    expect(recordCompletion(["level-01"], "level-01")).toEqual(["level-01"]);
    expect(recordCompletion(["level-01"], "level-02")).toEqual([
      "level-01",
      "level-02",
    ]);
  });
});

describe("HUD state", () => {
  it("reports connected-pair progress and undo availability after a connection", () => {
    const board = twoRowBoard();
    const emptyHistory = createHistory(board);
    expect(hudState("level-01", board, emptyHistory)).toEqual({
      levelId: "level-01",
      connected: 0,
      totalPairs: 2,
      canUndo: false,
    });

    const committed = commitConnection(board, 1, TWO_ROW_PAIR_1);
    const history = {
      current: committed,
      past: [board],
    };
    expect(hudState("level-01", committed, history)).toMatchObject({
      connected: 1,
      totalPairs: 2,
      canUndo: true,
    });
  });
});
