import { describe, expect, it } from "vitest";
import { statesEqual } from "../engine/serialize";
import { Action } from "../engine/types";
import {
  canUndoAction,
  connect,
  createGame,
  currentBoard,
  undoAction,
} from "../sim/game";
import { ScriptedHazardSource } from "../sim/hazard";
import { replay } from "../sim/replay";
import {
  TWO_ROW_PAIR_1,
  TWO_ROW_PAIR_2,
  twoRowBoard,
} from "../testing/boardFixtures";

const hazardScript = [{ kind: "shift-row" as const, row: 1, dx: 1 as const }];

describe("game session and replay", () => {
  it("undo restores the exact pre-action state across effects and a hazard", () => {
    const initial = twoRowBoard();
    const hazards = new ScriptedHazardSource(hazardScript);
    const game = createGame(initial);

    const after = connect(game, 1, TWO_ROW_PAIR_1, hazards);
    expect(after.events.some((event) => event.type === "hazard-applied")).toBe(true);
    expect(canUndoAction(after.game)).toBe(true);

    const undone = undoAction(after.game);
    expect(statesEqual(currentBoard(undone.game), initial)).toBe(true);
    expect(undone.events).toEqual([{ type: "undo" }]);
  });

  it("undo on an empty history is a no-op", () => {
    const game = createGame(twoRowBoard());
    const undone = undoAction(game);
    expect(undone.game).toBe(game);
    expect(undone.events).toEqual([]);
  });

  it("replays an action log to identical state and events", () => {
    const initial = twoRowBoard();
    const hazards = new ScriptedHazardSource(hazardScript);

    let original = createGame(initial);
    const originalEvents = [];
    let result = connect(original, 1, TWO_ROW_PAIR_1, hazards);
    original = result.game;
    originalEvents.push(...result.events);
    result = connect(original, 2, TWO_ROW_PAIR_2, hazards);
    original = result.game;
    originalEvents.push(...result.events);

    const actions: Action[] = [
      { type: "connect", pairId: 1, path: TWO_ROW_PAIR_1 },
      { type: "connect", pairId: 2, path: TWO_ROW_PAIR_2 },
    ];
    const replayed = replay(initial, actions, new ScriptedHazardSource(hazardScript));

    expect(statesEqual(currentBoard(replayed.game), currentBoard(original))).toBe(
      true,
    );
    expect(replayed.events).toEqual(originalEvents);
  });

  it("replays a log containing undo", () => {
    const initial = twoRowBoard();
    const actions: Action[] = [
      { type: "connect", pairId: 1, path: TWO_ROW_PAIR_1 },
      { type: "undo" },
      { type: "connect", pairId: 1, path: TWO_ROW_PAIR_1 },
      { type: "connect", pairId: 2, path: TWO_ROW_PAIR_2 },
    ];
    const first = replay(initial, actions, new ScriptedHazardSource(hazardScript));
    const second = replay(initial, actions, new ScriptedHazardSource(hazardScript));
    expect(statesEqual(currentBoard(first.game), currentBoard(second.game))).toBe(
      true,
    );
    expect(first.events).toEqual(second.events);
  });
});
